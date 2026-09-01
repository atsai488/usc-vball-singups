import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'Authentication required' }, 401);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await admin.auth.getUser();
  if (!user) return json({ error: 'Authentication required' }, 401);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: membership } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!membership) return json({ error: 'Admin access required' }, 403);
  const { action, ...payload } = await req.json();
  if (action === 'update-week') {
    const { error } = await db.from('weeks').update({ status: payload.status, caps: payload.caps }).eq('id', payload.weekId);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  if (action === 'create-week') {
    const { data, error } = await db.from('weeks').insert({ session_date: payload.sessionDate, status: 'open', caps: payload.caps }).select('id').single();
    return error ? json({ error: error.message }, 400) : json({ ok: true, weekId: data.id });
  }
  if (action === 'remove-signup') {
    const { data: signup, error: lookupError } = await db.from('signups').select('id,week_id,position,status').eq('id', payload.signupId).maybeSingle();
    if (lookupError) return json({ error: lookupError.message }, 400);
    if (!signup) return json({ error: 'Signup not found' }, 404);
    const { error } = await db.from('signups').delete().eq('id', payload.signupId);
    if (error) return json({ error: error.message }, 400);
    let promotedSignupId = null;
    if (signup.status === 'confirmed') {
      const next = await db.from('signups').select('id').eq('week_id', signup.week_id).eq('position', signup.position).eq('status', 'waitlisted').order('created_at', { ascending: true }).order('id', { ascending: true }).limit(1).maybeSingle();
      if (next.error) return json({ error: next.error.message }, 400);
      if (next.data) {
        const update = await db.from('signups').update({ status: 'confirmed' }).eq('id', next.data.id);
        if (update.error) return json({ error: update.error.message }, 400);
        promotedSignupId = next.data.id;
      }
    }
    return json({ ok: true, promotedSignupId });
  }
  if (action === 'update-video') {
    const { error } = await db.from('matches').update({ video_url: payload.videoUrl || null }).eq('id', payload.matchId);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  if (action === 'update-assignment') {
    const { teamId, playerId, position } = payload;
    if (!teamId || !playerId || !position) return json({ error: 'Team, player, and position are required' }, 400);
    const { error } = await db.from('team_assignments').upsert({ team_id: teamId, player_id: playerId, position }, { onConflict: 'team_id,player_id' });
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  if (action === 'replace-roster') {
    const { weekId, assignments } = payload;
    const { data: teams, error: teamError } = await db.from('teams').select('id').eq('week_id', weekId);
    if (teamError) return json({ error: teamError.message }, 400);
    const teamIds = (teams ?? []).map((team) => team.id);
    if (teamIds.length) {
      const { error: deleteError } = await db.from('team_assignments').delete().in('team_id', teamIds);
      if (deleteError) return json({ error: deleteError.message }, 400);
    }
    if (assignments?.length) {
      const { error: insertError } = await db.from('team_assignments').insert(assignments);
      if (insertError) return json({ error: insertError.message }, 400);
    }
    return json({ ok: true });
  }
  if (action === 'reset-data') {
    const { weekId } = payload;
    if (weekId) {
      const { error } = await db.from('weeks').delete().eq('id', weekId);
      return error ? json({ error: error.message }, 400) : json({ ok: true });
    }
    for (const table of ['elo_history', 'matches', 'team_assignments', 'teams', 'signups', 'players', 'weeks']) {
      const { error } = await db.from(table).delete().not('id', 'is', null);
      if (error) return json({ error: error.message }, 400);
    }
    return json({ ok: true });
  }
  return json({ error: 'Unknown action' }, 400);
});
