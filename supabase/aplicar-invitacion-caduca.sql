-- ============================================================================
-- Farpi · La invitación caduca, y tres índices (03-09-2026, resincronizado el 04-09-2026)
-- ============================================================================
--
-- Aplicar **entero y de una vez** en el SQL Editor del proyecto real. Es lo mismo
-- que ya está en `supabase/schema.sql`, extraído para no reaplicar el esquema
-- completo. Es idempotente: los índices van con `if not exists` y la RPC con
-- `create or replace`.
--
-- **Este archivo no crece con parches: se reescribe entero cada vez que cambia
-- algo de la invitación**, igual que `supabase/aplicar-meses-cerrados.sql`. Lo
-- que hay aquí es siempre lo último que vale, no el delta del día que se creó.
--
-- Esa regla no estaba escrita y costó cara. El 03-09-2026, unas horas después de
-- crear este archivo, la revisión de seguridad le añadió a la RPC una segunda
-- guarda —la cuenta tiene que ser anterior a la invitación, o haber nacido de
-- ella— y se aplicó a la base y a `schema.sql`, pero no aquí. Durante un día este
-- archivo fue un `create or replace` con la versión vieja esperando a que alguien
-- lo reejecutase por los índices: habría reabierto el agujero de par en par
-- —quien viese un `invite_id` podía registrarse con el correo de la persona
-- invitada y entrar en su casa— y sin dejar rastro, porque la RPC habría seguido
-- existiendo y respondiendo. Un `create or replace` guardado es una máquina del
-- tiempo; o se mantiene al día o no se guarda.

-- ── 1. Los tres índices que se habían quedado fuera de la regla ──────────────
-- La app pide siempre `?family_id=eq.…` en estas tres tablas, y `list_items`
-- solo tenía el índice por lista: sirve para pintar una cesta abierta, no para
-- traerse las de la casa.
create index if not exists children_family_idx     on public.children(family_id);
create index if not exists lists_family_idx        on public.lists(family_id);
create index if not exists list_items_family_idx   on public.list_items(family_id);

-- ── 2. Quién puede aceptar una invitación ────────────────────────────────────
-- Dos guardas, y las dos hacen falta. La de los 30 días, porque lo que abre la
-- familia no es el enlace del correo —ese lo caduca Supabase en unas horas— sino
-- el `invite_id` de la URL de vuelta, y esa URL se puede guardar. Y la de la edad
-- de la cuenta, porque cotejar el correo da por hecho que tener la cuenta prueba
-- tener el correo, y eso lo decide un interruptor del panel de Supabase.
--
-- Va la RPC entera y no un parche: `create or replace function` no admite medias
-- funciones, y una recortada a mano es la forma más fácil de perder el `grant` o
-- el `search_path`.
create or replace function public.accept_family_invite(p_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite            public.family_invites%rowtype;
  v_caller_uid        uuid := auth.uid();
  v_caller_email      text;
  v_caller_invited_at timestamptz;
  v_caller_created_at timestamptz;
begin
  if v_caller_uid is null then
    raise exception 'Acceso denegado: usuario no autenticado';
  end if;

  select email, invited_at, created_at
    into v_caller_email, v_caller_invited_at, v_caller_created_at
  from auth.users where id = v_caller_uid;

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

  -- Y la cuenta tiene que ser **anterior a la invitación, o haber nacido de
  -- ella** (03-09-2026).
  --
  -- El cotejo del correo de arriba parece suficiente y no lo es: da por hecho
  -- que tener la cuenta prueba tener el correo, y eso lo decide un interruptor
  -- del panel de Supabase. Con "Confirm email" apagado —se apaga en un click
  -- para probar en local, y así se queda— Supabase da por confirmado a quien se
  -- registra, así que quien tuviera a la vista un `invite_id` (viaja en la URL
  -- de vuelta del correo) podía registrarse con el correo de la persona
  -- invitada, sin llegar a leerlo, y entrar en su casa. Mirar
  -- `email_confirmed_at` no arregla nada por lo mismo: apagado el ajuste, esa
  -- columna viene rellena de fábrica.
  --
  -- Lo que sí distingue a quien de verdad estaba invitado es **de dónde sale su
  -- cuenta**: o la creó el propio correo de invitación (`invited_at`), o ya
  -- existía antes de que la invitación se escribiera. Registrarse *después* de
  -- ver el enlace es exactamente el ataque, y no hay caso legítimo que se
  -- parezca: quien se apunta a Farpi por su cuenta y luego recibe la invitación
  -- tiene la cuenta más vieja que ella.
  --
  -- El mensaje es el mismo que el del correo que no cuadra, a propósito: a un
  -- desconocido con el id en la mano se le cuenta lo mismo en los dos casos.
  --
  -- Va **después** de la caducidad y no antes por una razón de prueba: lo único
  -- que sabe envejecer una invitación en `validate-rls.mjs` es el service role
  -- moviéndole el `created_at`, y entonces cualquier cuenta de prueba es más
  -- nueva que ella. Con esta comprobación delante, la de los 30 días se pondría
  -- en verde sin llegar a ejecutarse nunca. Lo que se cuenta de más al ponerla
  -- aquí es que una invitación caducó, a quien además acertó el correo.
  if v_caller_invited_at is null and v_caller_created_at > v_invite.created_at then
    raise exception 'Acceso denegado: la invitación no pertenece a este usuario';
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
-- Y la RPC tiene que traer **las dos** guardas, no solo la primera:
--   select position('30 days' in prosrc) > 0        as caduca,
--          position('v_caller_invited_at' in prosrc) > 0 as mira_la_edad_de_la_cuenta
--   from pg_proc where proname = 'accept_family_invite';
--
-- Después: `node scripts/validate-rls.mjs`.
