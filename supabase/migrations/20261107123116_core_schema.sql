create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete restrict,
 display_name text not null check (length(btrim(display_name)) > 0),
 role text not null check (role in ('manager','executor')),
 created_at timestamptz not null default now()
);
create table public.objects (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(btrim(name)) > 0),
 address text not null check (length(btrim(address)) > 0),
 author_id uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz,
 version integer not null default 1 check (version > 0)
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(),
 object_id uuid not null references public.objects(id) on delete restrict,
 title text not null check (length(btrim(title)) > 0),
 description text not null default '',
 assignee_id uuid not null references public.profiles(id) on delete restrict,
 status text not null default 'new' check (status in ('new','in_progress','in_review','accepted','rework')),
 author_id uuid not null references public.profiles(id) on delete restrict,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz,
 version integer not null default 1 check (version > 0)
);
create table public.task_status_history (
 id bigint generated always as identity primary key,
 task_id uuid not null references public.tasks(id) on delete restrict,
 from_status text check (from_status in ('new','in_progress','in_review','accepted','rework')),
 to_status text not null check (to_status in ('new','in_progress','in_review','accepted','rework')),
 actor_id uuid not null references public.profiles(id) on delete restrict,
 actor_name text not null,
 happened_at timestamptz not null default now(),
 comment text,
 check (to_status <> 'rework' or length(btrim(comment)) > 0)
);
create index objects_author_idx on public.objects(author_id);
create index objects_active_created_idx on public.objects(created_at desc, id) where deleted_at is null;
create index tasks_object_idx on public.tasks(object_id);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_author_idx on public.tasks(author_id);
create index tasks_active_created_idx on public.tasks(created_at desc, id) where deleted_at is null;
create index history_task_idx on public.task_status_history(task_id, happened_at, id);
create index history_actor_idx on public.task_status_history(actor_id);

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_status_history enable row level security;
revoke all on public.profiles, public.objects, public.tasks, public.task_status_history from anon, authenticated;
grant select on public.profiles, public.objects, public.tasks, public.task_status_history to authenticated;
grant all on public.profiles, public.objects, public.tasks, public.task_status_history to service_role;
grant usage, select on sequence public.task_status_history_id_seq to service_role;
