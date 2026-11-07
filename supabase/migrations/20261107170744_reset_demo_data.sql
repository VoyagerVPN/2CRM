-- Администратор отдельно включает сброс и задаёт доверенный снимок только в демо-проекте.
create table private.demo_reset_config (
 singleton boolean primary key default true check (singleton),
 enabled boolean not null default false,
 manager_ids uuid[] not null,
 snapshot jsonb not null,
 generation integer not null default 0,
 last_reset_at timestamptz
);
alter table private.demo_reset_config enable row level security;
revoke all on private.demo_reset_config from public, anon, authenticated, service_role;

create function private.reset_demo_data() returns jsonb
language plpgsql security definer set search_path = '' set lock_timeout = '5s'
as $$
declare
 config private.demo_reset_config;
 item jsonb;
 new_id uuid;
 object_map jsonb := '{}';
 task_map jsonb := '{}';
 reset_time timestamptz := clock_timestamp();
begin
 if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and role = 'manager') then
  raise sqlstate 'PT403' using message = 'Сброс недоступен';
 end if;
 select * into config from private.demo_reset_config where singleton;
 if not found or not config.enabled or not (auth.uid() = any(config.manager_ids)) then
  raise sqlstate 'PT403' using message = 'Сброс демо не настроен';
 end if;
 if not pg_try_advisory_xact_lock(213092, 1) then
  raise sqlstate 'PT409' using message = 'Сброс уже выполняется';
 end if;
 if jsonb_array_length(config.snapshot->'objects') is distinct from 3 or jsonb_array_length(config.snapshot->'tasks') is distinct from 6 or jsonb_array_length(config.snapshot->'history') is distinct from 15 then
  raise sqlstate 'PT422' using message = 'Демо-снимок не соответствует исходному набору';
 end if;
 -- Блокировка записей и вставок исключает частичный набор при параллельной работе.
 lock table public.objects, public.tasks in share row exclusive mode;
 update public.tasks set deleted_at = reset_time, updated_at = reset_time, version = version + 1 where deleted_at is null;
 update public.objects set deleted_at = reset_time, updated_at = reset_time, version = version + 1 where deleted_at is null;
 for item in select value from jsonb_array_elements(config.snapshot->'objects') loop
  new_id := gen_random_uuid();
  object_map := object_map || jsonb_build_object(item->>'id', new_id);
  insert into public.objects select (jsonb_populate_record(null::public.objects, item || jsonb_build_object('id', new_id, 'deleted_at', null))).*;
 end loop;
 for item in select value from jsonb_array_elements(config.snapshot->'tasks') loop
  new_id := gen_random_uuid();
  task_map := task_map || jsonb_build_object(item->>'id', new_id);
  insert into public.tasks select (jsonb_populate_record(null::public.tasks, item || jsonb_build_object('id', new_id, 'object_id', object_map->>(item->>'object_id'), 'deleted_at', null))).*;
 end loop;
 insert into public.task_status_history(task_id, from_status, to_status, actor_id, actor_name, happened_at, comment)
 select (task_map->>h.task_id::text)::uuid, h.from_status, h.to_status, h.actor_id, h.actor_name, h.happened_at, h.comment
 from jsonb_to_recordset(config.snapshot->'history') as h(task_id uuid, from_status text, to_status text, actor_id uuid, actor_name text, happened_at timestamptz, comment text);
 update private.demo_reset_config set generation = generation + 1, last_reset_at = reset_time where singleton returning * into config;
 return jsonb_build_object('objects', 3, 'tasks', 6, 'generation', config.generation);
end;
$$;
revoke all on function private.reset_demo_data() from public, anon, authenticated;
grant execute on function private.reset_demo_data() to authenticated;
create function public.reset_demo_data() returns jsonb language sql security invoker set search_path = '' as $$ select private.reset_demo_data() $$;
revoke all on function public.reset_demo_data() from public, anon, authenticated;
grant execute on function public.reset_demo_data() to authenticated;
