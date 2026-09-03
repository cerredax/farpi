-- Farpi — cambios de seguridad del 03-09-2026, para aplicar en el SQL Editor.
--
-- Ya está todo dentro de supabase/schema.sql; esto es el trozo suelto y en orden, que
-- es como se aplica a la base de verdad. Cuatro secciones, y las dos primeras se
-- aplicaron antes que las otras dos: la §3 sale de ejecutar el validador con la §1 y la
-- §2 puestas, y la §4 del repaso de los puntos menores del informe.
--
-- Es idempotente: las funciones son `create or replace`, el trigger se borra antes de
-- crearse y las policies llevan su `drop ... if exists`, así que volver a pasarlo entero
-- no rompe nada.
--
-- Después: `node scripts/validate-rls.mjs` (163 comprobaciones) y anotar el resultado en
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

-- ============================================================================
-- 3. La ficha de un documento la puede editar cualquier miembro (bis)
-- ============================================================================
--
-- Esto sale de ejecutar el validador con los dos cambios de arriba ya aplicados:
-- 160/161, y el que fallaba era el que se había puesto para vigilar que el trigger
-- nuevo no rompiera el renombrado. No lo rompía el trigger — estaba roto antes, y
-- lo rompía la policy `for all` con el `with check` de `storage_owner`, que Postgres
-- aplica también a los `update`. Detalle completo en el comentario de abajo.
--
-- Si ya has pasado las secciones 1 y 2, con esta basta.

-- Los documentos son la única tabla de contenido con **cuatro policies** en vez de
-- una, y no es simetría rota: es la única cuyas columnas alimentan una decisión
-- que se toma **con el cliente de servicio**. `/api/documents/[id]/file` lee
-- `storage_owner` de la ficha y con él pide prestado el token de esa persona para
-- servir el archivo, sin RLS que le pare. Así que quien escribe esa columna solo
-- puede ponerse a sí mismo: sin eso, cualquier miembro podía escribir ahí el id de
-- otro por PostgREST y hacer que Farpi fuera a buscar un archivo al Drive de un
-- tercero. El scope `drive.file` acota el daño (ese token solo ve lo que subió la
-- propia app), pero acotado no es lo mismo que cerrado.
--
-- **Estuvo en una sola policy `for all` con ese `with check`, y estaba mal**
-- (03-09-2026). Postgres aplica el `with check` a la fila nueva de **cualquier**
-- escritura, `update` incluido, y la fila nueva de un renombrado sigue llevando
-- dentro el `storage_owner` de quien subió el papel. Resultado: nadie podía editar
-- la ficha de un documento ajeno —ni el nombre, ni la carpeta, ni la caducidad—,
-- que es media pantalla de Documentos en una casa donde suben papeles dos personas.
-- La regla que se quería escribir no era «la ficha es de quien la subió», era «la
-- llave prestada solo se presta la de uno», y esas dos cosas se parecen solo si se
-- lee la policy en vez de probarla. Lo encontró la comprobación que se añadió para
-- vigilar justo lo contrario: que el trigger nuevo no rompiera el renombrado.
--
-- Ahora la regla del dueño vive **solo en el `insert`**, que es donde una fila nace
-- diciendo de quién es el disco. Que después no cambie no lo puede decir una policy
-- —`with check` solo ve la fila nueva, nunca la vieja— y lo dice el trigger
-- `trg_document_storage_inmutable`. **Las dos piezas van juntas**: si alguien
-- quitara ese trigger, este `update` sin `with check` de dueño volvería a dejar
-- señalar el Drive de un tercero, esta vez editando en vez de insertando.
--
-- `is null` sigue valiendo en el insert: son las fichas de antes del 27-08-2026,
-- cuando el archivo vivía en el bucket de Farpi y no en el Drive de nadie.
drop policy if exists "Miembros CRUD documentos de su familia" on public.documents;
drop policy if exists "Miembros ven los documentos de su familia" on public.documents;
create policy "Miembros ven los documentos de su familia"
  on public.documents for select
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Miembros suben documentos a su familia" on public.documents;
create policy "Miembros suben documentos a su familia"
  on public.documents for insert
  with check (
    family_id in (select public.my_family_ids())
    and (storage_owner is null or storage_owner = auth.uid())
  );

drop policy if exists "Miembros editan la ficha de su familia" on public.documents;
create policy "Miembros editan la ficha de su familia"
  on public.documents for update
  using (family_id in (select public.my_family_ids()))
  with check (family_id in (select public.my_family_ids()));

drop policy if exists "Miembros borran documentos de su familia" on public.documents;
create policy "Miembros borran documentos de su familia"
  on public.documents for delete
  using (family_id in (select public.my_family_ids()));

-- ============================================================================
-- 4. `family_members` se queda solo con `select`
-- ============================================================================
--
-- Del repaso de los puntos menores del informe. El `insert` dejaba a un admin meter
-- en su familia una fila con el `user_id` que quisiera, sin invitación; y no hacía
-- falta para nada, porque quien crea miembros de verdad son dos RPCs
-- `security definer` que pasan por encima de la RLS.

-- **Solo `select`.** No hay policy de `insert`, ni de `update`, ni de `delete`, y
-- ninguna de las tres es un olvido: entrar en una familia, cambiar un rol y echar a
-- alguien son las tres cosas que hay que validar antes —la invitación es para ese
-- correo, la familia no se queda sin ningún admin— y eso una policy no sabe hacerlo.
-- Viven en `accept_family_invite`, `update_family_member_role` y
-- `remove_family_member`; el nombre y el color, en `update_family_member_profile`.
--
-- El `insert` se fue el 03-09-2026. Dejaba a un admin meter en su familia una fila
-- con **el `user_id` que quisiera**, sin invitación y sin que la otra persona lo
-- supiera: no le abre los datos de nadie —al contrario, mete al tercero en su casa—
-- pero le hace aparecer una familia ajena en el conmutador, que es justo la puerta
-- que `family_invites` existe para cerrar. Y no hacía falta para nada: nadie inserta
-- aquí por PostgREST. Las dos filas que nacen de verdad las escriben
-- `create_family_with_admin` y `accept_family_invite`, las dos `security definer`,
-- que pasan por encima de la RLS y comprueban lo suyo antes.
drop policy if exists "Miembros ven su familia" on public.family_members;
create policy "Miembros ven su familia"
  on public.family_members for select
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Admin gestiona miembros" on public.family_members;
drop policy if exists "Admin inserta miembros" on public.family_members;
