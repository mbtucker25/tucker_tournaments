// 🔥 Supabase Edge Function: get-team-members.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const url = new URL(req.url);
  const teamName = url.searchParams.get('team');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('name', teamName)
    .maybeSingle();

  if (teamError || !team) {
    return new Response(JSON.stringify({ error: 'Team not found' }), {
      status: 404,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const { data: golfers, error: golfersError } = await supabase
    .from('registrations')
    .select('first_name, last_name')
    .eq('team_id', team.id);

  if (golfersError) {
    return new Response(JSON.stringify({ error: 'Failed to get golfers' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  return new Response(JSON.stringify({ golfers }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
});
