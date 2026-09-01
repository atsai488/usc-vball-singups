(() => {
  const cfg = window.SIDEOUT_SUPABASE;
  if (!cfg || !window.supabase) return;
  const client = window.supabase.createClient(cfg.url, cfg.publishableKey);
  window.sideoutBackend = {
    client,
    async read() {
      const [weeks, players, signups, teams, assignments, matches, history] = await Promise.all([
        client.from('weeks').select('*').order('session_date', { ascending: false }),
        client.from('players').select('id,name,positions,elo,created_at').order('name'),
        client.from('signups').select('id,player_id,week_id,position,status,created_at').order('created_at'),
        client.from('teams').select('*').order('team_number'),
        client.from('team_assignments').select('*'),
        client.from('matches').select('*').order('id'),
        client.from('elo_history').select('*').order('created_at')
      ]);
      const error = [weeks, players, signups, teams, assignments, matches, history].find(x => x.error)?.error;
      if (error) throw error;
      return { weeks: weeks.data, players: players.data, signups: signups.data, teams: teams.data, assignments: assignments.data, matches: matches.data, history: history.data };
    },
    async signup(payload) { return client.functions.invoke('create-signup', { body: payload }); },
    async removeSignup(payload) { return client.functions.invoke('remove-signup', { body: payload }); }
    ,async adminAction(payload) { return client.functions.invoke('admin-action', { body: payload }); }
    ,async generateTeams(payload) { return client.functions.invoke('generate-teams', { body: payload }); }
    ,async recordMatch(payload) { return client.functions.invoke('record-match', { body: payload }); }
    ,async session() { return client.auth.getSession(); }
  };
})();
