-- ============================================================
-- NIDO — RPC de aceptación de invitaciones familiares
-- ============================================================
-- accept_family_invite(p_invite_id uuid) → uuid (family_id)
--
-- El usuario autenticado acepta una invitación pendiente dirigida
-- a su email. La función:
--   1. Verifica que la invitación existe y está 'pending'.
--   2. Verifica que el email de la invitación coincide con el del
--      usuario autenticado (comprobación case-insensitive).
--   3. Crea la fila en family_members con el rol de la invitación.
--   4. Marca la invitación como 'accepted'.
--   5. Devuelve el family_id para que el cliente pueda cambiar
--      a esa familia inmediatamente.
--
-- Es security definer porque el usuario aún no pertenece a la
-- familia objetivo y no podría insertar en family_members por RLS.
-- ============================================================

create or replace function public.accept_family_invite(p_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite       public.family_invites%rowtype;
  v_caller_uid   uuid := auth.uid();
  v_caller_email text;
begin
  if v_caller_uid is null then
    raise exception 'Acceso denegado: usuario no autenticado';
  end if;

  -- Email del usuario autenticado (auth.users es accesible en security definer)
  select email into v_caller_email
  from auth.users
  where id = v_caller_uid;

  -- Cargar la invitación
  select * into v_invite
  from public.family_invites
  where id = p_invite_id;

  if not found then
    raise exception 'Invitación no encontrada';
  end if;

  if v_invite.status = 'accepted' then
    raise exception 'La invitación ya fue aceptada';
  end if;

  if v_invite.status = 'cancelled' then
    raise exception 'La invitación fue cancelada';
  end if;

  -- La invitación debe ser para el email del usuario
  if lower(v_invite.email) != lower(v_caller_email) then
    raise exception 'Acceso denegado: la invitación no pertenece a este usuario';
  end if;

  -- Si ya es miembro (p. ej. se unió por otra vía), solo marcar como aceptada
  if exists (
    select 1 from public.family_members
    where family_id = v_invite.family_id and user_id = v_caller_uid
  ) then
    update public.family_invites
    set status = 'accepted', accepted_at = now()
    where id = p_invite_id;

    return v_invite.family_id;
  end if;

  -- Crear el miembro con el display_name derivado del email
  insert into public.family_members (family_id, user_id, display_name, role)
  values (
    v_invite.family_id,
    v_caller_uid,
    coalesce(nullif(trim(split_part(v_caller_email, '@', 1)), ''), 'Miembro'),
    v_invite.role
  );

  -- Marcar la invitación como aceptada
  update public.family_invites
  set status = 'accepted', accepted_at = now()
  where id = p_invite_id;

  return v_invite.family_id;
end;
$$;

grant execute on function public.accept_family_invite(uuid) to authenticated;
