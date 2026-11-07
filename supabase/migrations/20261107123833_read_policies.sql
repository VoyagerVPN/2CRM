create function private.current_role() returns text language sql stable security definer set search_path = '' as $$
 select role from public.profiles where id = (select auth.uid())
$$;
create function private.object_active(p_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.objects where id=p_id and deleted_at is null) and auth.uid() is not null
$$;
create function private.has_assigned_tasks(p_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.tasks where object_id=p_id and assignee_id=(select auth.uid()) and deleted_at is null)
$$;
revoke all on function private.current_role(), private.object_active(uuid), private.has_assigned_tasks(uuid) from public, anon, authenticated;
grant execute on function private.current_role(), private.object_active(uuid), private.has_assigned_tasks(uuid) to authenticated;
create policy profiles_read on public.profiles for select to authenticated using ((select private.current_role()) is not null);
create policy objects_read on public.objects for select to authenticated using (
 deleted_at is null and ((select private.current_role())='manager' or ((select private.current_role())='executor' and private.has_assigned_tasks(id)))
);
create policy tasks_read on public.tasks for select to authenticated using (
 deleted_at is null and private.object_active(object_id) and ((select private.current_role())='manager' or ((select private.current_role())='executor' and assignee_id=(select auth.uid())))
);
create policy history_read on public.task_status_history for select to authenticated using (
 (select private.current_role())='manager' or exists(select 1 from public.tasks t where t.id=task_id)
);
