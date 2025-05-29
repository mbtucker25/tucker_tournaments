// 📍 register.ts (Supabase Edge Function)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────
// 🚀 Supabase Edge Function: Register Team + Golfers
// ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders()
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_ANON_KEY")
  );

  try {
    const data = await req.json();
    const { teamSelect, newTeamName, golfer1, golfer2, golfer3, golfer4 } = data;

    let teamId = null;

    // 🔧 Create new team or use selected one
    if (newTeamName) {
      const { data: teamData, error } = await supabase
        .from("teams")
        .insert({ name: newTeamName })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return respond({ error: "Team name already exists." });
        }
        return respond({ error: error.message });
      }

      teamId = teamData?.id;
    } else if (teamSelect) {
      const { data: teamData, error } = await supabase
        .from("teams")
        .select("id")
        .eq("name", teamSelect)
        .single();

      if (error) throw error;
      teamId = teamData.id;
    }

    if (!teamId) {
      throw new Error("No valid team ID found.");
    }

    // 🧍‍♂️ Collect and insert valid golfers
    const golfers = [golfer1, golfer2, golfer3, golfer4].filter(
      (g) => g?.first || g?.last || g?.email || g?.phone || g?.shirtSize
    );

    for (const g of golfers) {
      const { error: regErr } = await supabase.from("registrations").insert({
        team_id: teamId,
        first_name: g.first,
        last_name: g.last,
        email: g.email,
        phone: g.phone,
        shirt_size: g.shirtSize || null
      }).select().single();

      if (regErr) throw regErr;
    }

    return respond({
      status: "registration-success",
      golfers: golfers.length
    });

  } catch (err) {
    console.error("❌ Error in register function:", err);
    return new Response(JSON.stringify({
      error: err.message || "Unknown error"
    }), {
      status: 500,
      headers: corsHeaders()
    });
  }
});

// ─────────────────────────────────────────────
// 📦 Helpers
// ─────────────────────────────────────────────
function respond(data: any) {
  return new Response(JSON.stringify(data), {
    headers: corsHeaders()
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
}
