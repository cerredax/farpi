-- Farpi — cambios de seguridad del 03-09-2026, para aplicar en el SQL Editor.
--
-- Ya están dentro de supabase/schema.sql; esto es el trozo suelto y en orden, que es
-- como se aplica a la base de verdad. Las dos funciones son `create or replace` y el
-- trigger se borra antes de crearse, así que volver a ejecutarlo entero no rompe nada.
--
-- Después: `node scripts/validate-rls.mjs` (161 comprobaciones) y anotar el resultado en
-- docs/supabase-validation.md.

-- ============================================================================
-- 1. El dueño y la ruta del archivo de un documento no se reescriben
-- ============================================================================

-- Ni el dueño del archivo ni su id se pueden reescribir (03-09-2026).
--
-- La policy de `documents` acota `storage_owner` a `auth.uid()` **o a nulo**, y
-- ese "o a nulo" —que está para las fichas de antes de Drive— dejaba una grieta:
-- cualquier miembro podía poner a nulo el dueño de una ficha ajena por
-- PostgREST y, con `storage_path` intacto, el proxy de lectura pasaba a pedir
-- ese archivo con el token de quien mira. No lee nada —`drive.file` solo ve lo
-- que subió la propia app con **ese** token— pero deja el documento inservible
-- para toda la casa, y eso es sabotaje sin que la RLS se entere.
--
-- Se arregla aquí y no en la policy porque una policy no puede comparar con la
-- fila anterior: `with check` solo ve la nueva. Y se cierran las dos columnas y
-- no solo el dueño, porque la pareja es la que dice dónde están los bytes.
--
-- La app nunca las toca al editar (ver `updateDocument` en
-- `src/lib/supabase-repos/documents.ts`, que actualiza nombre, descripción,
-- categoría, asignación y caducidad): mover un archivo de disco es dar de alta
-- otra ficha, no editar esta.
create or replace function public.check_document_storage_inmutable()
returns trigger language plpgsql as $$
begin
  if new.storage_owner is distinct from old.storage_owner then
    raise exception 'documents: storage_owner no se puede cambiar';
  end if;
  if new.storage_path is distinct from old.storage_path then
    raise exception 'documents: storage_path no se puede cambiar';
  end if;
  if new.storage_provider is distinct from old.storage_provider then
    raise exception 'documents: storage_provider no se puede cambiar';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_document_storage_inmutable on public.documents;
create trigger trg_document_storage_inmutable before update on public.documents  for each row execute function public.check_document_storage_inmutable();

-- ============================================================================
-- 2. Aceptar una invitación exige que la cuenta no se haya creado después de
--    que la invitación se escribiera
-- ============================================================================

-- Aceptar una invitación. Quien la acepta todavía no es miembro, así que no hay
-- policy que pueda dejarle escribir: tiene que ser una RPC. Comprueba que la
-- invitación es para su email, que su cuenta no se creó **después** de que la
-- invitación se escribiera —si no, cualquiera con el id entraría en casa ajena—,
-- que no lleve más de 30 días esperando, y es idempotente si ya era miembro por
-- otra vía.
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
