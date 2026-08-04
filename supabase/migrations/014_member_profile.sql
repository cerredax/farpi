-- Perfil del miembro: nombre editable por el administrador y color propio.
--
-- Dos huecos que venían de lo mismo, que un miembro apenas tenía perfil:
--
-- 1. El nombre solo lo cambiaba su dueño (`update_my_family_profile`), así que
--    Ajustes ofrecía editar a cualquiera pero el servidor lo rechazaba. Ahora
--    puede uno mismo o un admin de esa misma familia.
-- 2. El color de un adulto no se guardaba: salía de su posición en la lista, y
--    cambiaba solo al entrar alguien nuevo. Pasa a ser un dato suyo, como el de
--    los hijos. `null` conserva el comportamiento anterior (color por posición),
--    que es lo que tienen todos los miembros ya existentes.
--
-- Sigue sin poder tocarse `role`, `family_id` ni `user_id`. Se retira
-- `avatar_url` del contrato: la app nunca lo usó (mandaba null en cada edición,
-- que además borraba el avatar). Cuando haya avatares tendrá su propia función.

alter table public.family_members
  add column if not exists color text;

create or replace function public.update_family_member_profile(
  p_member_id    uuid,
  p_display_name text,
  p_color        text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_user_id   uuid;
begin
  if auth.uid() is null then
    raise exception 'Acceso denegado: el usuario no está autenticado';
  end if;

  if p_display_name is null or trim(p_display_name) = '' then
    raise exception 'El nombre no puede estar vacío';
  end if;

  select family_id, user_id into v_family_id, v_user_id
  from public.family_members
  where id = p_member_id;

  if v_family_id is null then
    raise exception 'El miembro no existe';
  end if;

  -- Uno mismo siempre; a los demás, solo un admin de esa familia. Ser admin de
  -- otra familia no sirve: se comprueba contra la familia del miembro editado.
  if v_user_id <> auth.uid() and not exists (
    select 1 from public.family_members
    where family_id = v_family_id
      and user_id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Acceso denegado: solo un administrador puede editar a otro miembro';
  end if;

  update public.family_members
  set display_name = trim(p_display_name),
      color        = nullif(trim(coalesce(p_color, '')), '')
  where id = p_member_id;
end;
$$;

grant execute on function public.update_family_member_profile(uuid, text, text) to authenticated;

drop function if exists public.update_my_family_profile(uuid, text, text);
