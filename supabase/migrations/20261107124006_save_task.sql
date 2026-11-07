create function public.save_task(p_title text,p_description text,p_object_id uuid,p_assignee_id uuid,p_id uuid default null,p_expected_version integer default null)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare result public.tasks; old_object uuid;
begin
 if auth.uid() is null or private.current_role() is distinct from 'manager' then raise sqlstate 'PT403' using message='Недостаточно прав'; end if;
 if coalesce(length(btrim(p_title)),0)=0 then raise sqlstate 'PT422' using message='Заполните название'; end if;
 if not exists(select 1 from public.profiles where id=p_assignee_id and role='executor') then raise sqlstate 'PT422' using message='Выберите исполнителя'; end if;
 if p_id is not null then select object_id into old_object from public.tasks where id=p_id and deleted_at is null; end if;
 -- Один порядок блокировок для переноса задачи и удаления объекта.
 perform id from public.objects where id in (p_object_id,old_object) order by id for update;
 if not exists(select 1 from public.objects where id=p_object_id and deleted_at is null) then raise sqlstate 'PT404' using message='Объект не найден или недоступен'; end if;
 if p_id is null then
  insert into public.tasks(title,description,object_id,assignee_id,author_id) values(btrim(p_title),coalesce(p_description,''),p_object_id,p_assignee_id,auth.uid()) returning * into result;
  insert into public.task_status_history(task_id,from_status,to_status,actor_id,actor_name) select result.id,null,'new',id,display_name from public.profiles where id=auth.uid();
 else
  select * into result from public.tasks where id=p_id and deleted_at is null for update;
  if not found or not private.object_active(result.object_id) then raise sqlstate 'PT404' using message='Запись не найдена или недоступна'; end if;
  if p_expected_version is distinct from result.version then raise sqlstate 'PT409' using message='Задача уже изменена. Обновите данные'; end if;
  update public.tasks set title=btrim(p_title),description=coalesce(p_description,''),object_id=p_object_id,assignee_id=p_assignee_id,version=version+1,updated_at=now() where id=p_id returning * into result;
 end if;
 return result;
end $$;
revoke all on function public.save_task(text,text,uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.save_task(text,text,uuid,uuid,uuid,integer) to authenticated;
