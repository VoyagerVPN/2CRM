create function public.save_object(p_name text, p_address text, p_id uuid default null, p_expected_version integer default null)
returns public.objects language plpgsql security definer set search_path = '' as $$
declare result public.objects;
begin
 if auth.uid() is null or private.current_role() is distinct from 'manager' then raise sqlstate 'PT403' using message='Недостаточно прав'; end if;
 if coalesce(length(btrim(p_name)),0)=0 or coalesce(length(btrim(p_address)),0)=0 then raise sqlstate 'PT422' using message='Заполните название и адрес'; end if;
 if p_id is null then
  insert into public.objects(name,address,author_id) values(btrim(p_name),btrim(p_address),auth.uid()) returning * into result;
 else
  select * into result from public.objects where id=p_id and deleted_at is null for update;
  if not found then raise sqlstate 'PT404' using message='Запись не найдена или недоступна'; end if;
  if p_expected_version is distinct from result.version then raise sqlstate 'PT409' using message='Объект уже изменён. Обновите данные'; end if;
  update public.objects set name=btrim(p_name),address=btrim(p_address),version=version+1,updated_at=now() where id=p_id returning * into result;
 end if;
 return result;
end $$;
revoke all on function public.save_object(text,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.save_object(text,text,uuid,integer) to authenticated;
