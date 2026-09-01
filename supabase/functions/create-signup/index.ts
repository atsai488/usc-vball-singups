import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, response } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return response({ error: 'Google sign-in required' }, 401);
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return response({ error: 'Google sign-in required' }, 401);
  const { position, weekId } = await req.json();
  const profileName = user.user_metadata?.full_name?.trim() || '';
  const profileParts = profileName.split(/\s+/).filter(Boolean);
  const firstName = user.user_metadata?.given_name?.trim() || profileParts.shift();
  const lastName = user.user_metadata?.family_name?.trim() || profileParts.join(' ');
  if (!firstName || !lastName || !position || !weekId) return response({ error: 'Your Google account must provide a first and last name' }, 400);
  const db = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: week } = await db.from('weeks').select('caps,status').eq('id', weekId).single();
  if (!week) return response({ error: 'Week not found' }, 404);
  if (week.status !== 'open') return response({ error: 'Signups are closed for this week' }, 409);
  const name = `${firstName.trim()} ${lastName.trim()}`;
  const { data: existingSignup } = await db.from('signups').select('id').eq('auth_user_id', user.id).eq('week_id', weekId).maybeSingle();
  if (existingSignup) return response({ error: 'You are already signed up for this week' }, 409);
  let { data: player } = await db.from('players').select('id,positions').eq('auth_user_id', user.id).maybeSingle();
  if (!player) {
    const result = await db.from('players').insert({ name, auth_user_id: user.id, positions: [position] }).select('id,positions').single();
    if (result.error) return response({ error: result.error.message }, 400);
    player = result.data;
  } else {
    const positions = Array.from(new Set([...(player.positions ?? []), position]));
    const result = await db.from('players').update({ name, positions }).eq('id', player.id).select('id,positions').single();
    if (result.error) return response({ error: result.error.message }, 400);
    player = result.data;
  }
  const { count } = await db.from('signups').select('id', { count: 'exact', head: true }).eq('week_id', weekId).eq('position', position).eq('status', 'confirmed');
  const status = (count ?? 0) < Number(week.caps[position] ?? 0) ? 'confirmed' : 'waitlisted';
  const result = await db.from('signups').insert({ player_id: player.id, auth_user_id: user.id, week_id: weekId, position, status }).select('id,player_id,week_id,position,status,created_at').single();
  if (result.error) return response({ error: result.error.message }, 400);
  return response(result.data);
});
