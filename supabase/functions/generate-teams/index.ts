import { requireAdmin } from '../_shared/admin.ts';
import { corsHeaders, response } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    const { weekId } = await req.json();
    if (!weekId) return response({ error: 'weekId is required' }, 400);
    const db = await requireAdmin(req);
    const { data: signups } = await db.from('signups').select('player_id,position,players(id,elo)').eq('week_id', weekId).eq('status', 'confirmed').order('created_at');
    const groups: Record<string, any[]> = { setter: [], outside: [], passer: [], middle: [], opposite: [] };
    for (const signup of signups ?? []) groups[signup.position]?.push(signup.players);
    for (const group of Object.values(groups)) group.sort((a, b) => Number(b.elo) - Number(a.elo));
    const teamCount = Math.min(...Object.entries(groups).map(([position, group]) => Math.floor(group.length / (position === 'outside' || position === 'passer' ? 2 : 1))));
    if (!Number.isFinite(teamCount) || teamCount < 1) return response({ error: 'Not enough confirmed players for a complete team' }, 400);
    await db.from('teams').delete().eq('week_id', weekId);
    const { data: teams, error } = await db.from('teams').insert(Array.from({ length: teamCount }, (_, i) => ({ week_id: weekId, team_number: i + 1 }))).select('id,team_number');
    if (error || !teams) return response({ error: error?.message ?? 'Could not create teams' }, 500);
    const assignments: any[] = [];
    for (const [position, group] of Object.entries(groups)) {
      const slots = position === 'outside' || position === 'passer' ? 2 : 1;
      group.slice(0, teamCount * slots).forEach((p, i) => { const teamIndex = (Math.floor(i / slots) % 2 === 0) ? i % teamCount : teamCount - 1 - (i % teamCount); assignments.push({ team_id: teams[teamIndex].id, player_id: p.id, position }); });
    }
    const result = await db.from('team_assignments').insert(assignments);
    if (result.error) return response({ error: result.error.message }, 500);
    return response({ teams: teamCount, assignments: assignments.length });
  } catch (error) { return response({ error: error instanceof Error ? error.message : 'Server error' }, 403); }
});
