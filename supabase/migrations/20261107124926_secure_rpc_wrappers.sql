alter function public.save_object(text,text,uuid,integer) set schema private;
revoke all on function private.save_object(text,text,uuid,integer) from public, anon, authenticated;
grant execute on function private.save_object(text,text,uuid,integer) to authenticated;
create function public.save_object(p_name text,p_address text,p_id uuid default null,p_expected_version integer default null) returns public.objects language sql security invoker set search_path='' as $$ select private.save_object(p_name,p_address,p_id,p_expected_version) $$;
revoke all on function public.save_object(text,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.save_object(text,text,uuid,integer) to authenticated;

alter function public.save_task(text,text,uuid,uuid,uuid,integer) set schema private;
revoke all on function private.save_task(text,text,uuid,uuid,uuid,integer) from public, anon, authenticated;
grant execute on function private.save_task(text,text,uuid,uuid,uuid,integer) to authenticated;
create function public.save_task(p_title text,p_description text,p_object_id uuid,p_assignee_id uuid,p_id uuid default null,p_expected_version integer default null) returns public.tasks language sql security invoker set search_path='' as $$ select private.save_task(p_title,p_description,p_object_id,p_assignee_id,p_id,p_expected_version) $$;
revoke all on function public.save_task(text,text,uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.save_task(text,text,uuid,uuid,uuid,integer) to authenticated;

alter function public.change_task_status(uuid,integer,text,text) set schema private;
revoke all on function private.change_task_status(uuid,integer,text,text) from public, anon, authenticated;
grant execute on function private.change_task_status(uuid,integer,text,text) to authenticated;
create function public.change_task_status(p_task_id uuid,p_expected_version integer,p_status text,p_comment text default null) returns public.tasks language sql security invoker set search_path='' as $$ select private.change_task_status(p_task_id,p_expected_version,p_status,p_comment) $$;
revoke all on function public.change_task_status(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.change_task_status(uuid,integer,text,text) to authenticated;

alter function public.delete_task(uuid,integer) set schema private;
revoke all on function private.delete_task(uuid,integer) from public, anon, authenticated;
grant execute on function private.delete_task(uuid,integer) to authenticated;
create function public.delete_task(p_id uuid,p_expected_version integer) returns void language sql security invoker set search_path='' as $$ select private.delete_task(p_id,p_expected_version) $$;
revoke all on function public.delete_task(uuid,integer) from public,anon,authenticated;
grant execute on function public.delete_task(uuid,integer) to authenticated;

alter function public.delete_object(uuid,integer,integer) set schema private;
revoke all on function private.delete_object(uuid,integer,integer) from public, anon, authenticated;
grant execute on function private.delete_object(uuid,integer,integer) to authenticated;
create function public.delete_object(p_id uuid,p_expected_version integer,p_expected_task_count integer) returns void language sql security invoker set search_path='' as $$ select private.delete_object(p_id,p_expected_version,p_expected_task_count) $$;
revoke all on function public.delete_object(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.delete_object(uuid,integer,integer) to authenticated;