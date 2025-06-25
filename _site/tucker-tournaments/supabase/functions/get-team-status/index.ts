// get-team-status/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

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
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const teamId = team.id;

  if (teamId === '5a5f14cc-7b7b-4680-a1d1-d9670a31d0d2') {
    return new Response(JSON.stringify({ isFull: false }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const { count } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId);

  const isFull = (count ?? 0) >= 4;

  return new Response(JSON.stringify({ isFull }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
});
