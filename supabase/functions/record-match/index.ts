import { requireAdmin } from '../_shared/admin.ts';
import { corsHeaders, response } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    const body = await req.json();
    const { weekId, teamAId, teamBId, teamAScore, teamBScore, videoUrl } = body;
    if (!weekId || !teamAId || !teamBId || teamAScore === teamBScore) return response({ error: 'Two teams and a winning score are required' }, 400);
    const db = await requireAdmin(req);
    const { data: teams } = await db.from('teams').select('id,team_number').in('id', [teamAId, teamBId]);
    const { data: assignments } = await db.from('team_assignments').select('team_id,player_id,players(id,elo)').in('team_id', [teamAId, teamBId]);
    const team = (id: string) => (assignments ?? []).filter(a => a.team_id === id);
    const avg = (id: string) => { const xs = team(id); return xs.length ? xs.reduce((sum, a) => sum + Number(a.players.elo), 0) / xs.length : 1000; };
    const aElo = avg(teamAId), bElo = avg(teamBId), expectedA = 1 / (1 + Math.pow(10, (bElo - aElo) / 400)), winnerIsA = Number(teamAScore) > Number(teamBScore), winnerExpected = winnerIsA ? expectedA : 1 - expectedA, margin = Math.abs(Number(teamAScore) - Number(teamBScore)), multiplier = Math.min(2.5, (Math.log(margin + 1) * 2.2) / (Math.abs(aElo - bElo) * 0.001 + 2.2)), winnerDelta = Math.round(24 * multiplier * (1 - winnerExpected)), loserDelta = -Math.round(winnerDelta * 0.65);
    const { data: match, error } = await db.from('matches').insert({ week_id: weekId, team_a_id: teamAId, team_b_id: teamBId, team_a_score: teamAScore, team_b_score: teamBScore, winner_team_id: winnerIsA ? teamAId : teamBId, video_url: videoUrl || null, elo_processed: true }).select('id').single();
    if (error || !match) return response({ error: error?.message ?? 'Could not save match' }, 500);
    for (const id of [teamAId, teamBId]) for (const assignment of team(id)) { const delta = (id === teamAId ? winnerIsA : !winnerIsA) ? winnerDelta : loserDelta; const before = Number(assignment.players.elo); await db.from('players').update({ elo: before + delta }).eq('id', assignment.player_id); await db.from('elo_history').insert({ player_id: assignment.player_id, week_id: weekId, match_id: match.id, elo_before: before, elo_after: before + delta, delta }); }
    return response({ matchId: match.id, winnerDelta, loserDelta });
  } catch (error) { return response({ error: error instanceof Error ? error.message : 'Server error' }, 403); }
});
