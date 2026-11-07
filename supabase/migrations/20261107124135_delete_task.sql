create function public.delete_task(p_id uuid,p_expected_version integer) returns void language plpgsql security definer set search_path='' as $$
declare result public.tasks; parent_id uuid;
begin
 if auth.uid() is null or private.current_role() is distinct from 'manager' then raise sqlstate 'PT403' using message='Недостаточно прав'; end if;
 select object_id into parent_id from public.tasks where id=p_id;
 perform id from public.objects where id=parent_id for update;
 select * into result from public.tasks where id=p_id and deleted_at is null for update;
 if not found or not private.object_active(result.object_id) then raise sqlstate 'PT404' using message='Запись не найдена или недоступна'; end if;
 if p_expected_version is distinct from result.version then raise sqlstate 'PT409' using message='Задача уже изменена. Обновите данные'; end if;
 update public.tasks set deleted_at=now(),updated_at=now(),version=version+1 where id=p_id;
end $$;
revoke all on function public.delete_task(uuid,integer) from public,anon,authenticated;
grant execute on function public.delete_task(uuid,integer) to authenticated;
