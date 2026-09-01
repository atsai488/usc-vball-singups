-- Clears app data while preserving weeks, admin membership, and Auth accounts.
begin;
delete from public.elo_history;
delete from public.matches;
delete from public.team_assignments;
delete from public.teams;
delete from public.signups;
delete from public.players;
commit;
