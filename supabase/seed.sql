-- Local-only seed. Production data should be created through the app/admin flow.
insert into public.weeks (session_date, status, caps)
select
  (current_date + case when extract(dow from current_date) = 0 then 7 else 7 - extract(dow from current_date)::int end),
  'open',
  '{"setter":3,"outside":6,"passer":6,"middle":3,"opposite":3}'::jsonb
where not exists (select 1 from public.weeks);
