import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find all trial companies where trial_end has passed and still active
    const now = new Date().toISOString();

    const { data: expiredCompanies, error: fetchErr } = await supabase
      .from("companies")
      .select("id, name, slug, trial_end, is_active, is_suspended")
      .eq("subscription_tier", "trial")
      .eq("is_active", true)
      .eq("is_suspended", false)
      .lt("trial_end", now);

    if (fetchErr) {
      console.error("Error fetching expired trials:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredCompanies || expiredCompanies.length === 0) {
      return new Response(JSON.stringify({ message: "No expired trials found", deactivated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = expiredCompanies.map((c: any) => c.id);

    // Deactivate and suspend
    const { error: updateErr } = await supabase
      .from("companies")
      .update({ is_active: false, is_suspended: true })
      .in("id", ids);

    if (updateErr) {
      console.error("Error deactivating companies:", updateErr);
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Deactivated ${ids.length} expired trial companies:`, expiredCompanies.map((c: any) => c.slug));

    return new Response(
      JSON.stringify({
        message: `Deactivated ${ids.length} expired trial companies`,
        deactivated: ids.length,
        companies: expiredCompanies.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
