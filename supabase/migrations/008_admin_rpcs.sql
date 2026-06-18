-- RPCs de gestión de miembros con validación del último admin.
-- Solo admins de la familia pueden invocarlas.

create or replace function public.remove_family_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id  uuid;
  v_caller_uid uuid := auth.uid();
  v_admin_count int;
begin
  if v_caller_uid is null then
    raise exception 'Acceso denegado: usuario no autenticado';
  end if;

  select family_id into v_family_id
  from public.family_members
  where id = p_member_id;

  if v_family_id is null then
    raise exception 'Miembro no encontrado';
  end if;

  if not exists (
    select 1 from public.family_members
    where family_id = v_family_id and user_id = v_caller_uid and role = 'admin'
  ) then
    raise exception 'Acceso denegado: el usuario no es administrador de esta familia';
  end if;

  -- Protege el último admin
  if exists (select 1 from public.family_members where id = p_member_id and role = 'admin') then
    select count(*) into v_admin_count
    from public.family_members
    where family_id = v_family_id and role = 'admin' and id != p_member_id;

    if v_admin_count = 0 then
      raise exception 'No se puede eliminar al único administrador de la familia';
    end if;
  end if;

  delete from public.family_members where id = p_member_id;
end;
$$;

grant execute on function public.remove_family_member(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.update_family_member_role(p_member_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id  uuid;
  v_caller_uid uuid := auth.uid();
  v_admin_count int;
begin
  if v_caller_uid is null then
    raise exception 'Acceso denegado: usuario no autenticado';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'Rol inválido: debe ser "admin" o "member"';
  end if;

  select family_id into v_family_id
  from public.family_members
  where id = p_member_id;

  if v_family_id is null then
    raise exception 'Miembro no encontrado';
  end if;

  if not exists (
    select 1 from public.family_members
    where family_id = v_family_id and user_id = v_caller_uid and role = 'admin'
  ) then
    raise exception 'Acceso denegado: el usuario no es administrador de esta familia';
  end if;

  -- Protege el último admin al degradar
  if p_role = 'member' and exists (
    select 1 from public.family_members where id = p_member_id and role = 'admin'
  ) then
    select count(*) into v_admin_count
    from public.family_members
    where family_id = v_family_id and role = 'admin' and id != p_member_id;

    if v_admin_count = 0 then
      raise exception 'No se puede degradar al único administrador de la familia';
    end if;
  end if;

  update public.family_members set role = p_role where id = p_member_id;
end;
$$;

grant execute on function public.update_family_member_role(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- La policy "Admin gestiona miembros" for ALL de 002_rls_policies.sql permitía
-- INSERT/UPDATE/DELETE directos sin las validaciones anteriores. Se sustituye
-- por una policy de solo INSERT; UPDATE y DELETE se gestionan vía RPC.

drop policy if exists "Admin gestiona miembros" on public.family_members;

create policy "Admin inserta miembros"
  on public.family_members for insert
  with check (
    family_id in (
      select family_id from public.family_members
      where user_id = auth.uid() and role = 'admin'
    )
  );
