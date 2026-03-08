import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");
    if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    console.log("Midtrans webhook:", JSON.stringify(body));

    const {
      order_id,
      transaction_id,
      transaction_status,
      fraud_status,
      payment_type,
      gross_amount,
      signature_key,
    } = body;

    // Verify signature
    const crypto = globalThis.crypto;
    const encoder = new TextEncoder();
    const data = encoder.encode(order_id + body.status_code + gross_amount + serverKey);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    if (signature_key !== expectedSignature) {
      console.error("Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Map Midtrans status
    let status = "pending";
    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "accept" || !fraud_status) {
        status = "paid";
      } else {
        status = "fraud";
      }
    } else if (transaction_status === "deny" || transaction_status === "cancel" || transaction_status === "expire") {
      status = "failed";
    } else if (transaction_status === "pending") {
      status = "pending";
    }

    // Update payment transaction
    const { data: txn, error: txnError } = await supabaseAdmin
      .from("payment_transactions")
      .update({
        status,
        midtrans_transaction_id: transaction_id,
        payment_type,
        paid_at: status === "paid" ? new Date().toISOString() : null,
        metadata: body,
      })
      .eq("midtrans_order_id", order_id)
      .select("company_id, tier, user_count")
      .single();

    if (txnError) {
      console.error("Error updating transaction:", txnError);
      throw txnError;
    }

    // If payment successful, update company subscription
    if (status === "paid" && txn) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Update or create subscription
      const { data: existingSub } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("company_id", txn.company_id)
        .maybeSingle();

      if (existingSub) {
        await supabaseAdmin.from("subscriptions").update({
          tier: txn.tier,
          max_users: txn.user_count,
          price_per_user: { starter: 7000, professional: 21000, enterprise: 25000 }[txn.tier] || 0,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
        }).eq("id", existingSub.id);
      } else {
        await supabaseAdmin.from("subscriptions").insert({
          company_id: txn.company_id,
          tier: txn.tier,
          max_users: txn.user_count,
          price_per_user: { starter: 7000, professional: 21000, enterprise: 25000 }[txn.tier] || 0,
          status: "active",
          current_period_end: periodEnd.toISOString(),
        });
      }

      // Update company's subscription_tier, max_users, and activate
      await supabaseAdmin.from("companies").update({
        subscription_tier: txn.tier,
        max_users: txn.user_count,
        is_active: true,
      }).eq("id", txn.company_id);

      console.log(`Company ${txn.company_id} upgraded to ${txn.tier} with ${txn.user_count} users`);
    }

    return new Response(JSON.stringify({ success: true, status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
