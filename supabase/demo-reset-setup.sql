-- Выполнить вручную владельцем БД только после seed:demo в отдельном тестовом проекте.
-- Рабочие данные не использовать: последующий сброс архивирует все активные объекты и задачи.
do $$
declare snapshot jsonb; managers uuid[];
begin
 select jsonb_build_object(
  'objects', (select jsonb_agg(to_jsonb(o) order by o.created_at, o.id) from public.objects o where o.deleted_at is null),
  'tasks', (select jsonb_agg(to_jsonb(t) order by t.created_at, t.id) from public.tasks t where t.deleted_at is null),
  'history', (select jsonb_agg(to_jsonb(h) order by h.id) from public.task_status_history h join public.tasks t on t.id=h.task_id where t.deleted_at is null)
 ) into snapshot;
 select array_agg(u.id) into managers from auth.users u join public.profiles p on p.id=u.id
 where u.email in ('manager@2crm.example.com','manager2@2crm.example.com') and p.role='manager';
 if cardinality(managers) is distinct from 2 or jsonb_array_length(snapshot->'objects') is distinct from 3
  or jsonb_array_length(snapshot->'tasks') is distinct from 6 or jsonb_array_length(snapshot->'history') is distinct from 15 then
  raise exception 'Сначала подготовьте исходное демо: два постановщика, три объекта, шесть задач и пятнадцать событий';
 end if;
 insert into private.demo_reset_config(singleton, enabled, manager_ids, snapshot) values(true, true, managers, snapshot)
 on conflict(singleton) do update set enabled=excluded.enabled, manager_ids=excluded.manager_ids, snapshot=excluded.snapshot;
end $$;
