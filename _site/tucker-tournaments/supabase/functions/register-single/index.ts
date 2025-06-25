// supabase/functions/register-single/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "*";

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    const body = await req.json();

    const { first, last, email, phone, shirtSize, teamName } = body;

    if (!first || !last || !email || !phone || !shirtSize || !teamName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin,
          },
        }
      );
    }

    // Special case: __free_agent__
    let team_id: string;
    if (teamName === "__free_agent__") {
      team_id = "5a5f14cc-7b7b-4680-a1d1-d9670a31d0d2"; // Free agent UUID
    } else {
      // Look up the team_id by name
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id")
        .eq("name", teamName)
        .single();

      if (teamError || !team) {
        return new Response(
          JSON.stringify({ error: "Team not found." }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": origin,
            },
          }
        );
      }

      team_id = team.id;
    }

    // Insert into registrations
    const { error: insertError } = await supabase.from("registrations").insert({
      first_name: first,
      last_name: last,
      email,
      phone,
      shirt_size: shirtSize,
      team_id,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Could not register golfer." }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin,
          },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error occurred." }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin,
        },
      }
    );
  }
});
