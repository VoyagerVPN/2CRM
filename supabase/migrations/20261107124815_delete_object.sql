create function public.delete_object(p_id uuid,p_expected_version integer,p_expected_task_count integer) returns void language plpgsql security definer set search_path='' as $$
declare result public.objects; task_count integer;
begin
 if auth.uid() is null or private.current_role() is distinct from 'manager' then raise sqlstate 'PT403' using message='Недостаточно прав'; end if;
 select * into result from public.objects where id=p_id and deleted_at is null for update;
 if not found then raise sqlstate 'PT404' using message='Запись не найдена или недоступна'; end if;
 select count(*) into task_count from public.tasks where object_id=p_id and deleted_at is null;
 if p_expected_version is distinct from result.version or p_expected_task_count is distinct from task_count then raise sqlstate 'PT409' using message='Объект или число его задач изменились. Проверьте данные и подтвердите удаление ещё раз'; end if;
 update public.tasks set deleted_at=now(),updated_at=now(),version=version+1 where object_id=p_id and deleted_at is null;
 update public.objects set deleted_at=now(),updated_at=now(),version=version+1 where id=p_id;
end $$;
revoke all on function public.delete_object(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.delete_object(uuid,integer,integer) to authenticated;
