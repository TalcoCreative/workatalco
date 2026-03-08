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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { companyId, tier, userCount, test } = await req.json();
    
    // Handle test mode
    if (test) {
      const testAuth = btoa(serverKey + ":");
      const testRes = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${testAuth}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          transaction_details: { order_id: `test-${Date.now()}`, gross_amount: 1000 },
          customer_details: { email: "test@test.com", first_name: "Test" },
        }),
      });
      const testData = await testRes.json();
      if (!testRes.ok) throw new Error(testData.error_messages?.join(", ") || "Midtrans test error");
      return new Response(JSON.stringify({ success: true, token: testData.token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!companyId || !tier || !userCount) throw new Error("Missing required fields");

    const TIER_PRICES: Record<string, number> = {
      starter: 7000,
      professional: 21000,
      enterprise: 25000,
    };

    const pricePerUser = TIER_PRICES[tier];
    if (!pricePerUser) throw new Error("Invalid tier");

    const amount = pricePerUser * userCount;
    const orderId = `TMS-${companyId.slice(0, 8)}-${Date.now()}`;

    // Get company info
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name, slug")
      .eq("id", companyId)
      .single();

    // Determine environment from platform_integrations
    const { data: integration } = await supabaseAdmin
      .from("platform_integrations")
      .select("config")
      .eq("provider", "midtrans")
      .single();
    
    const env = (integration?.config as any)?.environment || "sandbox";
    const snapUrl = env === "production"
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    const webhookUrl = `${supabaseUrl}/functions/v1/midtrans-webhook`;

    // Create Midtrans Snap transaction
    const midtransAuth = btoa(serverKey + ":");
    const midtransPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: [{
        id: `subscription-${tier}`,
        price: pricePerUser,
        quantity: userCount,
        name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan (${userCount} users)`,
      }],
      customer_details: {
        email: user.email,
        first_name: user.user_metadata?.full_name || user.email,
      },
      callbacks: {
        finish: webhookUrl,
      },
    };

    const snapRes = await fetch(snapUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${midtransAuth}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(midtransPayload),
    });

    const snapData = await snapRes.json();
    if (!snapRes.ok) {
      console.error("Midtrans error:", snapData);
      throw new Error(snapData.error_messages?.join(", ") || "Midtrans error");
    }

    // Save payment transaction
    await supabaseAdmin.from("payment_transactions").insert({
      company_id: companyId,
      midtrans_order_id: orderId,
      amount,
      status: "pending",
      tier,
      user_count: userCount,
      snap_token: snapData.token,
      snap_redirect_url: snapData.redirect_url,
      metadata: { company_name: company?.name, user_email: user.email },
    });

    return new Response(
      JSON.stringify({
        success: true,
        token: snapData.token,
        redirect_url: snapData.redirect_url,
        order_id: orderId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
