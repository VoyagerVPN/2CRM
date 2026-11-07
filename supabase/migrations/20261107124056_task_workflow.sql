create function public.change_task_status(p_task_id uuid,p_expected_version integer,p_status text,p_comment text default null)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare result public.tasks; previous text; caller_role text := private.current_role();
begin
 if auth.uid() is null or caller_role is null then raise sqlstate 'PT403' using message='Недостаточно прав'; end if;
 select * into result from public.tasks where id=p_task_id and deleted_at is null for update;
 if not found or not private.object_active(result.object_id) or (caller_role='executor' and result.assignee_id<>auth.uid()) then raise sqlstate 'PT404' using message='Запись не найдена или недоступна'; end if;
 if p_expected_version is distinct from result.version then raise sqlstate 'PT409' using message='Задача уже изменена. Обновите данные'; end if;
 previous := result.status;
 if p_status is null or not ((previous='new' and p_status='in_progress') or (previous='in_progress' and p_status='in_review') or (previous='in_review' and p_status in ('accepted','rework')) or (previous='rework' and p_status='in_progress')) then raise sqlstate 'PT422' using message='Такой переход статуса запрещён'; end if;
 if (previous='in_review' and caller_role<>'manager') or (previous<>'in_review' and caller_role<>'executor') then raise sqlstate 'PT403' using message='Это действие недоступно для вашей роли'; end if;
 if p_status='rework' and coalesce(length(btrim(p_comment)),0)=0 then raise sqlstate 'PT422' using message='Укажите, что нужно исправить'; end if;
 update public.tasks set status=p_status,version=version+1,updated_at=now() where id=p_task_id returning * into result;
 insert into public.task_status_history(task_id,from_status,to_status,actor_id,actor_name,comment) select result.id,previous,p_status,id,display_name,nullif(btrim(p_comment),'') from public.profiles where id=auth.uid();
 return result;
end $$;
revoke all on function public.change_task_status(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.change_task_status(uuid,integer,text,text) to authenticated;
