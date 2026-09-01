import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, response } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  const { name, position, weekId, pin } = await req.json();
  if (!name || !position || !weekId || !/^\d{4}$/.test(pin ?? '')) return response({ error: 'Invalid request' }, 400);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const hashBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  const cancel_pin_hash = Array.from(new Uint8Array(hashBytes)).map((x) => x.toString(16).padStart(2, '0')).join('');
  let { data: player } = await db.from('players').select('id,positions').ilike('name', name).maybeSingle();
  if (!player) { const result = await db.from('players').insert({ name, positions: [position] }).select('id,positions').single(); player = result.data; }
  if (!player) return response({ error: 'Could not create player' }, 500);
  const { data: week } = await db.from('weeks').select('caps,status').eq('id', weekId).single();
  if (!week) return response({ error: 'Week not found' }, 404);
  if (week.status !== 'open') return response({ error: 'Signups are closed for this week' }, 409);
  const positions = Array.from(new Set([...(player.positions ?? []), position]));
  await db.from('players').update({ positions }).eq('id', player.id);
  const { count } = await db.from('signups').select('id', { count: 'exact', head: true }).eq('week_id', weekId).eq('position', position).eq('status', 'confirmed');
  const status = (count ?? 0) < Number(week.caps[position] ?? 0) ? 'confirmed' : 'waitlisted';
  const result = await db.from('signups').insert({ player_id: player.id, week_id: weekId, position, status, cancel_pin_hash }).select().single();
  if (result.error) return response({ error: result.error.message }, 400);
  return response(result.data);
});
