-- ============================================================
-- NIDO — RPCs de onboarding
-- ============================================================

-- create_family_with_admin
-- Uso: llamar desde el cliente tras registro para crear la primera familia.
-- Crea familia + miembro admin en una sola transacción atómica.
-- Devuelve el UUID de la familia creada.
create or replace function public.create_family_with_admin(family_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id    uuid;
  caller_uid       uuid := auth.uid();
  clean_family_name text;
begin
  if caller_uid is null then
    raise exception 'Acceso denegado: el usuario no está autenticado';
  end if;

  clean_family_name := nullif(trim(coalesce(family_name, '')), '');
  if clean_family_name is null then
    raise exception 'El nombre de la familia no puede estar vacío';
  end if;

  insert into public.families (name)
  values (clean_family_name)
  returning id into new_family_id;

  insert into public.family_members (family_id, user_id, display_name, role)
  values (
    new_family_id,
    caller_uid,
    coalesce(nullif(trim(split_part(auth.jwt() ->> 'email', '@', 1)), ''), 'Admin'),
    'admin'
  );

  return new_family_id;
end;
$$;

-- Solo usuarios autenticados pueden llamar a esta función
grant execute on function public.create_family_with_admin(text) to authenticated;

-- ============================================================
-- update_my_family_profile
-- Permite al miembro autenticado actualizar únicamente
-- display_name y avatar_url de su propio registro.
-- No permite modificar role, family_id ni user_id.
-- ============================================================
create or replace function public.update_my_family_profile(
  member_id    uuid,
  display_name text,
  avatar_url   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Acceso denegado: el usuario no está autenticado';
  end if;

  if not exists (
    select 1 from public.family_members
    where id = member_id and user_id = auth.uid()
  ) then
    raise exception 'Acceso denegado: el miembro no pertenece al usuario autenticado';
  end if;

  if display_name is null or trim(display_name) = '' then
    raise exception 'El nombre no puede estar vacío';
  end if;

  update public.family_members
  set
    display_name = trim(update_my_family_profile.display_name),
    avatar_url   = update_my_family_profile.avatar_url
  where id = member_id;
end;
$$;

grant execute on function public.update_my_family_profile(uuid, text, text) to authenticated;
