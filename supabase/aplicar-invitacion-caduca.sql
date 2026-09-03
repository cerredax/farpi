-- Farpi — delta del 03-09-2026: la invitación caduca y tres índices que faltaban
--
-- Se aplica a mano en el SQL Editor, como todo el esquema (no hay CLI de Supabase
-- enlazada: local y producción son el mismo proyecto). Es idempotente: los índices
-- van con `if not exists` y la RPC con `create or replace`, así que ejecutarlo dos
-- veces no hace nada la segunda.
--
-- Lo de aquí está **ya** en `supabase/schema.sql`, que es la fuente de verdad.
-- Este archivo es la copia que se pega, y por eso lleva la RPC entera y no un
-- parche: `create or replace function` no admite medias funciones, y una RPC
-- recortada a mano es la forma más fácil de perder el `grant` o el `search_path`.

-- ── 1. Los tres índices que se habían quedado fuera de la regla ──────────────
-- La app pide siempre `?family_id=eq.…` en estas tres tablas, y `list_items`
-- solo tenía el índice por lista: sirve para pintar una cesta abierta, no para
-- traerse las de la casa.
create index if not exists children_family_idx     on public.children(family_id);
create index if not exists lists_family_idx        on public.lists(family_id);
create index if not exists list_items_family_idx   on public.list_items(family_id);

-- ── 2. La invitación caduca a los 30 días ───────────────────────────────────
-- El enlace del correo lo caduca Supabase a las pocas horas, pero lo que abre la
-- familia es el `invite_id` de la URL de vuelta, y esa URL se puede guardar.

-- Aceptar una invitación. Quien la acepta todavía no es miembro, así que no hay
-- policy que pueda dejarle escribir: tiene que ser una RPC. Comprueba que la
-- invitación es para su email —si no, cualquiera con el id entraría en casa
-- ajena—, que no lleve más de 30 días esperando, y es idempotente si ya era
-- miembro por otra vía.
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

  select email into v_caller_email from auth.users where id = v_caller_uid;

  select * into v_invite from public.family_invites where id = p_invite_id;
  if not found then
    raise exception 'Invitación no encontrada';
  end if;

  if v_invite.status = 'accepted' then
    raise exception 'La invitación ya fue aceptada';
  end if;
  if v_invite.status = 'cancelled' then
    raise exception 'La invitación fue cancelada';
  end if;

  if lower(v_invite.email) != lower(v_caller_email) then
    raise exception 'Acceso denegado: la invitación no pertenece a este usuario';
  end if;

  -- Una invitación no vale para siempre.
  --
  -- El enlace del correo lo caduca Supabase a las pocas horas, pero eso no cierra
  -- la puerta: lo que abre la familia es el `invite_id` de la URL de vuelta, y esa
  -- URL se puede guardar. Quien la tenga apuntada podía entrar en casa un año
  -- después, entrando con su cuenta y volviendo a visitarla. Una invitación es un
  -- «pasa» dicho un día concreto, no una llave.
  --
  -- Treinta días porque el caso real es alguien que tarda en mirar el correo o en
  -- crearse la cuenta, y eso se resuelve en días. Pasado el mes, el admin la
  -- vuelve a mandar, que cuesta un botón.
  --
  -- Va **después** de la comprobación del email a propósito: así solo se entera de
  -- que caducó quien de verdad estaba invitado. A un desconocido con el id en la
  -- mano se le sigue contestando lo mismo que antes y nada más.
  if v_invite.created_at < now() - interval '30 days' then
    raise exception 'La invitación ha caducado. Pide que te la manden otra vez.';
  end if;

  if exists (
    select 1 from public.family_members
    where family_id = v_invite.family_id and user_id = v_caller_uid
  ) then
    update public.family_invites
    set status = 'accepted', accepted_at = now()
    where id = p_invite_id;
    return v_invite.family_id;
  end if;

  insert into public.family_members (family_id, user_id, display_name, role)
  values (
    v_invite.family_id,
    v_caller_uid,
    coalesce(nullif(trim(split_part(v_caller_email, '@', 1)), ''), 'Miembro'),
    v_invite.role
  );

  update public.family_invites
  set status = 'accepted', accepted_at = now()
  where id = p_invite_id;

  return v_invite.family_id;
end;
$$;

grant execute on function public.accept_family_invite(uuid) to authenticated;

-- ── Comprobar ───────────────────────────────────────────────────────────────
-- Los tres índices tienen que estar:
--   select indexname from pg_indexes
--   where schemaname = 'public'
--     and indexname in ('children_family_idx', 'lists_family_idx', 'list_items_family_idx');
--
-- Y la RPC tiene que mencionar el intervalo:
--   select position('30 days' in prosrc) > 0 as caduca
--   from pg_proc where proname = 'accept_family_invite';
--
-- Después: `node scripts/validate-rls.mjs`. Tiene que dar 154/154.
