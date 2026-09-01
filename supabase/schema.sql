-- ============================================================================
-- Farpi — esquema completo de la base de datos
-- ============================================================================
--
-- Este archivo describe la base **tal como está**, no cómo llegó hasta aquí.
-- Aplicándolo sobre un proyecto Supabase vacío queda una base idéntica a la de
-- producción: tablas, restricciones, índices, triggers, funciones, RLS y RPCs.
--
-- Ya no hay Storage. Los archivos de los documentos viven en el Google Drive de
-- quien los sube desde el 27-08-2026; aquí queda la ficha y, en
-- `storage_connections`, el permiso prestado de cada persona.
--
-- Sustituye a las 21 migraciones incrementales (`001…021`) con las que se
-- construyó entre junio y agosto de 2026. Se aplastaron el 26-08-2026, al cerrar
-- el proyecto, porque habían dejado de ayudar: para saber qué valores admitía
-- `events.kind` había que leer tres archivos y seguir dos `drop constraint`, y
-- ese historial ya lo guarda git. Siguen ahí, en el commit anterior a este, si
-- alguna vez hace falta ver el porqué de una decisión concreta.
--
-- **Cómo se aplica**: por el SQL Editor de Supabase, de una vez. No hay CLI de
-- Supabase enlazada al proyecto a propósito, porque local y producción apuntan
-- al mismo sitio y un `db push` distraído escribiría sobre datos reales.
--
-- **Cómo se cambia**: editando este archivo *y* aplicando el `alter` suelto en
-- el SQL Editor. Las dos cosas, o el archivo miente. Después, `node
-- scripts/validate-rls.mjs`, que comprueba contra la base de verdad que las
-- policies y las RPCs siguen haciendo lo que dicen, y se anota el resultado en
-- `docs/supabase-validation.md`.
--
-- Es idempotente donde se puede (`if not exists`, `drop policy if exists`), así
-- que volver a pasarlo entero sobre una base ya montada no rompe nada. Lo que no
-- hace es borrar: no es un `reset`. Y ojo, `create table if not exists` no añade
-- columnas a una tabla que ya existe — para eso está el `alter` a mano.
--
-- ----------------------------------------------------------------------------
-- La regla que lo ordena todo
-- ----------------------------------------------------------------------------
--
-- Un usuario solo ve datos de las familias donde figura en `family_members`. Eso
-- es `my_family_ids()`, y todas las policies de las tablas de contenido son la
-- misma línea: `family_id in (select public.my_family_ids())`.
--
-- Lo que no se puede expresar así va por RPC `security definer`, porque necesita
-- leer o escribir algo que el usuario no alcanza directamente:
-- `create_family_with_admin`, `update_family_member_profile`,
-- `remove_family_member`, `update_family_member_role` y `accept_family_invite`.
--
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. Tablas
-- ============================================================================

-- La familia. Todo cuelga de aquí y todo se borra con ella (`on delete cascade`).
create table if not exists public.families (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  -- Franjas de comida visibles en la pantalla de comidas. Ocultar una no borra
  -- sus `meal_plans`: se dejan de pintar, y si se reactiva la franja reaparecen.
  meal_slots  text[] not null default array['breakfast', 'lunch', 'snack', 'dinner']::text[],
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint families_meal_slots_validos check (
    meal_slots <@ array['breakfast', 'lunch', 'dinner', 'snack']::text[]
    and cardinality(meal_slots) between 1 and 4
  )
);

comment on column public.families.meal_slots is
  'Franjas de comida visibles en la pantalla de comidas. Ocultar una no borra sus meal_plans.';

-- Quién entra en la casa. Un usuario de `auth.users` puede estar en varias.
--
-- Ojo con las policies de esta tabla: solo hay `select` e `insert`. Cambiar un
-- rol o echar a alguien pasa por RPC, porque las dos cosas tienen que validar la
-- regla del último admin y una policy no sabe hacer eso.
create table if not exists public.family_members (
  id           uuid primary key default uuid_generate_v4(),
  family_id    uuid not null references public.families(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  -- Color de la persona en el calendario y en las listas. Nulo = sin asignar, y
  -- entonces la interfaz le da uno de la paleta por orden.
  color        text,
  role         text not null default 'member' check (role in ('admin', 'member')),
  created_at   timestamptz not null default now(),
  unique(family_id, user_id)
);

-- Los hijos, y también los adultos que no tienen cuenta —una abuela que no usa
-- la app pero a la que se le apuntan descansos—. De ahí `kind`: son personas de
-- la casa a las que se les asignan cosas, no usuarios.
create table if not exists public.children (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  name        text not null,
  birth_date  date,
  color       text not null default '#8BA888',
  kind        text not null default 'hijo',
  created_at  timestamptz not null default now(),
  constraint children_kind_valido check (kind in ('hijo', 'adulto'))
);

-- El calendario. Cuatro cosas distintas en una tabla, y es a propósito: comparten
-- policies, asignación e integridad entre familias, así que separarlas serían
-- cuatro veces lo mismo.
--
--   evento      un plan, a una hora, de alguien
--   vacaciones  quién no está disponible, días completos
--   descanso    igual, pero de quien cuida (sobre todo las abuelas)
--   festivo     el día no es de nadie: no hay trabajo ni colegio
--
-- Las tres últimas ocupan días enteros y por eso exigen `all_day` y `end_at`.
create table if not exists public.events (
  id                  uuid primary key default uuid_generate_v4(),
  family_id           uuid not null references public.families(id) on delete cascade,
  -- De quién es. Como mucho uno de los dos, nunca los dos a la vez.
  child_id            uuid references public.children(id) on delete set null,
  member_id           uuid references public.family_members(id) on delete set null,
  title               text not null,
  description         text,
  start_at            timestamptz not null,
  end_at              timestamptz,
  all_day             boolean not null default false,
  color               text,
  kind                text not null default 'evento',
  -- El año en que nació quien cumple, solo en `kind = 'cumple'` y solo si se
  -- sabe: de ahí sale la edad. No se deduce de `start_at` porque la serie anual
  -- arranca en el año en curso, así que la fecha dice el día que se celebra y
  -- no el día que nació.
  birth_year          int,
  -- Las repeticiones se materializan como filas sueltas que comparten grupo, en
  -- vez de guardar una regla y calcularla al vuelo: así se puede mover o borrar
  -- una sola ocurrencia sin inventar excepciones.
  recurrence_group_id uuid,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint events_kind_valido check (kind in ('evento', 'vacaciones', 'descanso', 'festivo', 'cumple')),
  constraint events_vacaciones_con_rango check (kind <> 'vacaciones' or (all_day = true and end_at is not null)),
  constraint events_descanso_con_rango   check (kind <> 'descanso'   or (all_day = true and end_at is not null)),
  constraint events_festivo_con_rango    check (kind <> 'festivo'    or (all_day = true and end_at is not null)),
  -- Un cumpleaños ocupa el día entero y solo ese día: no tiene hora ni dura
  -- hasta el jueves.
  constraint events_cumple_de_un_dia     check (kind <> 'cumple'     or (all_day = true and end_at is null)),
  -- El año solo tiene sentido en un cumpleaños, y solo si es un año posible.
  constraint events_birth_year_valido    check (birth_year is null or (kind = 'cumple' and birth_year between 1900 and 2200)),
  constraint events_una_sola_asignacion  check (child_id is null or member_id is null)
);

-- Las listas de casa: la compra, la farmacia, lo que haga falta.
create table if not exists public.lists (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  name        text not null,
  emoji       text,
  color       text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Lo de dentro. `family_id` va repetido aquí además de en `lists` para que la
-- policy no tenga que cruzar tablas; el trigger `trg_list_item_family` se encarga
-- de que los dos digan lo mismo.
create table if not exists public.list_items (
  id            uuid primary key default uuid_generate_v4(),
  list_id       uuid not null references public.lists(id) on delete cascade,
  family_id     uuid not null references public.families(id) on delete cascade,
  text          text not null,
  completed     boolean not null default false,
  completed_at  timestamptz,
  completed_by  uuid references auth.users(id) on delete set null,
  sort_order    integer not null default 0,
  -- Cuántas hacen falta. Entero y no texto libre: en el súper se toca, no se
  -- teclea, y un número admite los botones de más y de menos. Lo que no cabe aquí
  -- —"2 kg", "media docena"— se escribe en el nombre. El tope evita que un dedo
  -- apoyado en el botón deje un número que no cabe en la fila.
  quantity      int not null default 1,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint list_items_quantity_valida check (quantity between 1 and 99)
);

-- Lo que hay que tener apuntado y no es una fecha, una tarea ni un papel: el
-- teléfono del pediatra, la clave del wifi, la talla de las botas del colegio.
-- Nace el 31-08-2026 con la forma más sencilla que sirve: un título, un texto
-- libre y un emoji para reconocerla. Sin categorías y sin campos: una casa tiene
-- veinte notas, no doscientas, y para veinte manda el buscador.
--
-- `pinned` es lo único que ordena por encima del tiempo. La clave del wifi se
-- consulta todo el año y no se toca nunca, así que ordenar solo por
-- `updated_at` la hundiría bajo cualquier nota escrita ayer.
--
-- Ojo con lo que se guarda aquí: es texto plano en la base, protegido por la
-- RLS y por nada más. Sirve para la clave del wifi de casa; no es un gestor de
-- contraseñas y la pantalla lo dice.
create table if not exists public.notes (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  title       text not null,
  body        text,
  emoji       text,
  pinned      boolean not null default false,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Dinero: presupuestos, gastos y presupuestos pedidos fuera
-- ----------------------------------------------------------------------------
--
-- Tres tablas para dos preguntas distintas que en español se llaman igual.
-- `budgets` + `expenses` contestan «¿vamos bien este mes?»; `quotes` contesta
-- «¿cuál de los tres presupuestos de la caldera aceptamos?». Comparten pantalla
-- y nada más: ni claves ajenas entre ellas ni columnas comunes.
--
-- **Todo el dinero va en céntimos, en `integer`.** Ni `float`, que redondea
-- mal, ni `numeric`, que llegaría a JavaScript como cadena y habría que
-- convertirlo en cada lectura. Un `integer` aguanta 21 millones de euros en
-- céntimos, muy por encima del tope de un millón que ponen los `check`.

-- Cuánto se quiere gastar al mes en algo. El tope es **fijo y no por mes**: una
-- fila por categoría, no una por categoría y mes. Poner el tope de septiembre
-- sería una tarea administrativa cada treinta días, que es justo lo que esta app
-- existe para no pedir; quien quiera cambiarlo lo cambia y vale desde ya.
--
-- Sin color, a propósito: en Farpi el color dice **de quién** es algo, y un
-- presupuesto no es de nadie. Lo que lo distingue de un vistazo es su emoji, como
-- en las listas.
create table if not exists public.budgets (
  id                  uuid primary key default uuid_generate_v4(),
  family_id           uuid not null references public.families(id) on delete cascade,
  name                text not null,
  emoji               text,
  monthly_limit_cents integer not null,
  sort_order          integer not null default 0,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Un tope de cero no es un tope, es un presupuesto que nace incumplido. El
  -- techo de un millón de euros está para que un dedo torpe en el teclado
  -- numérico no deje una barra de progreso que no se puede ni pintar.
  constraint budgets_limite_valido check (monthly_limit_cents between 1 and 100000000)
);

-- Un gasto de la casa. Lo que hace que el tope de arriba signifique algo.
--
-- `budget_id` es opcional y se queda a null si se borra el presupuesto: el gasto
-- pasó de verdad y no se borra porque su categoría desaparezca. La pantalla los
-- junta bajo «Sin presupuesto», que además es el sitio donde se ven los gastos
-- de las cosas que nadie presupuestó.
--
-- `child_id` y `member_id` son **quién lo pagó**, con la misma forma que en
-- eventos, tareas y documentos: como mucho uno de los dos, y los dos a null
-- significa «de la casa», no «no se sabe». Se reutiliza el par de columnas de
-- siempre para que valga el mismo selector de personas y las mismas reglas de
-- integridad, en vez de inventar un tercer modo de señalar a alguien.
create table if not exists public.expenses (
  id           uuid primary key default uuid_generate_v4(),
  family_id    uuid not null references public.families(id) on delete cascade,
  budget_id    uuid references public.budgets(id) on delete set null,
  child_id     uuid references public.children(id) on delete set null,
  member_id    uuid references public.family_members(id) on delete set null,
  amount_cents integer not null,
  date         date not null,
  description  text,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Un gasto de cero euros no es un gasto. Los negativos tampoco entran: una
  -- devolución contada como gasto negativo haría que «llevamos 180 de 300» dejara
  -- de poder leerse de un vistazo, y una casa no lleva contabilidad de partida
  -- doble.
  constraint expenses_importe_valido check (amount_cents between 1 and 100000000),
  constraint expenses_una_sola_asignacion check (child_id is null or member_id is null)
);

-- Lo que te pasa el fontanero, el dentista o la academia. Es la otra mitad de la
-- palabra «presupuesto» y una tabla aparte porque no tiene nada que ver con el
-- gasto del mes: aquí todavía no se ha pagado nada.
--
-- Comparar dos o tres para lo mismo es el 90 % de para qué sirve, y por eso el
-- «para qué» (`title`) y el «quién lo da» (`provider`) son columnas distintas: la
-- pantalla agrupa por título y así los tres de la caldera salen juntos, con el
-- más barato marcado. Sin tabla de trabajos ni de proveedores — dos tablas más
-- para que una casa apunte tres presupuestos al año no sale a cuenta, y el
-- formulario ofrece los títulos que ya existen para que no haya que teclearlos
-- bien dos veces.
create table if not exists public.quotes (
  id           uuid primary key default uuid_generate_v4(),
  family_id    uuid not null references public.families(id) on delete cascade,
  title        text not null,
  provider     text not null,
  amount_cents integer not null,
  status       text not null default 'pedido',
  valid_until  date,
  notes        text,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint quotes_importe_valido check (amount_cents between 1 and 100000000),
  -- Tres estados y no más: se pide, se acepta o se descarta. «Caducado» no es un
  -- estado que nadie tenga que marcar a mano, lo dice `valid_until` comparado con
  -- hoy.
  constraint quotes_estado_valido check (status in ('pedido', 'aceptado', 'descartado'))
);

-- Qué se come. Una comida por familia, día y franja: el `unique` es lo que deja
-- que la pantalla escriba sin preguntar antes si ya había algo.
create table if not exists public.meal_plans (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  date        date not null,
  slot        text not null check (slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  name        text not null,
  notes       text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(family_id, date, slot)
);

-- Los papeles: DNI, informes médicos, el libro de familia. Aquí queda **solo la
-- ficha**: el archivo vive en el Google Drive de quien lo subió (27-08-2026;
-- antes estaba en el bucket privado `documents`). `size_bytes` y `mime_type`
-- están acotados en la propia tabla y no solo en la app, porque la app no es el
-- único camino hasta la base.
create table if not exists public.documents (
  id            uuid primary key default uuid_generate_v4(),
  family_id     uuid not null references public.families(id) on delete cascade,
  child_id      uuid references public.children(id) on delete set null,
  member_id     uuid references public.family_members(id) on delete set null,
  name          text not null,
  description   text,
  category      text check (category is null or category in ('salud', 'colegio', 'personal', 'otros')),
  -- Dónde está el archivo para su proveedor: el `fileId` de Drive. El nombre es
  -- herencia del bucket y se queda: renombrar una columna en producción para
  -- ganar precisión de vocabulario no compensa.
  storage_path  text not null,
  -- Quién lo guarda. Hoy solo hay un valor, y aun así la columna existe: es la
  -- que elige implementación en `src/lib/document-storage`. Añadir Dropbox u
  -- OneDrive será un valor más en este check y una clase nueva.
  storage_provider text not null default 'google_drive'
    check (storage_provider in ('google_drive')),
  -- En el Drive de **quién** vive. Es a esta persona a la que se le pide el
  -- token prestado para servírselo al resto de la familia. No es lo mismo que
  -- `created_by` aunque hoy coincidan: uno dice quién dio de alta la ficha y
  -- otro en qué disco están los bytes.
  storage_owner uuid references auth.users(id) on delete set null,
  mime_type     text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes    bigint not null default 0 check (size_bytes >= 0 and size_bytes <= 20971520),
  -- Cuándo caduca, para avisar antes: el pasaporte del niño, la tarjeta sanitaria.
  expires_on    date,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint documents_una_sola_asignacion check (child_id is null or member_id is null)
);

-- El permiso prestado de cada persona sobre su almacenamiento externo. Cuelga
-- del usuario, no de la familia: el Drive es suyo, y si está en dos familias es
-- la misma conexión para las dos.
--
-- **Los dos tokens se guardan cifrados** (AES-256-GCM, `DOCS_TOKEN_KEY`), y esta
-- tabla tiene RLS activada **sin una sola policy**, a propósito: así no entra
-- nadie salvo el service role desde una ruta API. Dar `select` al dueño parece
-- inofensivo y no lo es — la CSP lleva `'unsafe-inline'` en los scripts y por
-- tanto no para un XSS en línea, que con esa policy se llevaría un refresh token
-- y con él acceso permanente al Drive de una persona. La interfaz no lee esto:
-- pregunta a `/api/documents/providers`, que devuelve si hay conexión y con qué
-- correo, y ni un token.
create table if not exists public.storage_connections (
  user_id       uuid not null references auth.users(id) on delete cascade,
  provider      text not null check (provider in ('google_drive')),
  -- La cuenta de Google donde caen los archivos. Solo para poder decir "conectado
  -- como…": con varias cuentas en el mismo navegador es fácil autorizar la que no
  -- era y no enterarse hasta que otro no puede abrir el documento.
  account_email text,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  -- La carpeta "Farpi" dentro de ese Drive, cacheada para no buscarla en cada
  -- subida. Si se borra a mano, se vuelve a crear sola.
  folder_ref    text,
  -- Se marca, no se borra: la interfaz necesita distinguir "nunca conectó" de
  -- "conectó y dejó de valer", que son dos mensajes distintos.
  revoked_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, provider)
);

-- Los pendientes. Lo atrasado no se marca en rojo y ya: la app lo arrastra a hoy,
-- que es donde hay que verlo.
create table if not exists public.tasks (
  id             uuid primary key default uuid_generate_v4(),
  family_id      uuid not null references public.families(id) on delete cascade,
  title          text not null,
  notes          text,
  priority       text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date       date,
  completed      boolean not null default false,
  completed_at   timestamptz,
  completed_by   uuid references auth.users(id) on delete set null,
  child_id       uuid references public.children(id) on delete set null,
  member_id      uuid references public.family_members(id) on delete set null,
  recurrence     text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  recurrence_end date,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint tasks_una_sola_asignacion check (child_id is null or member_id is null)
);

-- Invitaciones. Van aparte de `family_members` a propósito: invitar a alguien no
-- lo mete en la familia, solo abre la puerta. El miembro nace cuando acepta, en
-- `accept_family_invite`.
create table if not exists public.family_invites (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  email       text not null,
  role        text not null default 'member' check (role in ('admin', 'member')),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  invited_by  uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Suscripciones Web Push, una por navegador. Cuelgan del usuario y no de la
-- familia: el aviso llega al teléfono de alguien, no a una casa.
create table if not exists public.push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- 2. Índices
-- ============================================================================
--
-- Todos van por `family_id` delante, porque toda consulta de la app empieza
-- filtrando por familia: es lo que impone la RLS.

create index if not exists events_family_start_idx     on public.events(family_id, start_at);
create index if not exists idx_events_kind             on public.events(kind);
create index if not exists idx_events_member           on public.events(member_id);
create index if not exists events_recurrence_group_idx on public.events(recurrence_group_id)
  where recurrence_group_id is not null;

create index if not exists list_items_list_idx      on public.list_items(list_id, sort_order);
-- Las fijadas primero y luego lo tocado hace menos, que es el orden en que se leen.
create index if not exists notes_family_idx         on public.notes(family_id, pinned desc, updated_at desc);
create index if not exists meal_plans_family_date_idx on public.meal_plans(family_id, date);

-- El gasto se lee siempre por mes y de lo más reciente a lo más viejo, que es
-- justo este orden. Los presupuestos, por su orden de la pantalla.
create index if not exists budgets_family_idx        on public.budgets(family_id, sort_order);
create index if not exists expenses_family_date_idx  on public.expenses(family_id, date desc);
create index if not exists idx_expenses_budget       on public.expenses(budget_id);
create index if not exists idx_expenses_member       on public.expenses(member_id);
create index if not exists idx_expenses_child        on public.expenses(child_id);
-- Los presupuestos pedidos se agrupan por «para qué es», así que se piden ya
-- juntos por título.
create index if not exists quotes_family_idx         on public.quotes(family_id, title, amount_cents);

create index if not exists documents_family_idx   on public.documents(family_id, created_at desc);
create index if not exists idx_documents_member    on public.documents(member_id);
create index if not exists idx_documents_expires   on public.documents(family_id, expires_on);
-- Para el aviso al quitar a un miembro: "esta persona subió N documentos que
-- dejarán de poder abrirse".
create index if not exists idx_documents_storage_owner on public.documents(storage_owner);

create index if not exists tasks_family_idx    on public.tasks(family_id);
create index if not exists tasks_due_date_idx  on public.tasks(family_id, due_date);
create index if not exists tasks_completed_idx on public.tasks(family_id, completed);
create index if not exists idx_tasks_child     on public.tasks(child_id);
create index if not exists idx_tasks_member    on public.tasks(member_id);

create index if not exists family_invites_family_idx on public.family_invites(family_id);
-- Una sola invitación pendiente por email y familia. Parcial: si se cancela o se
-- acepta, se puede volver a invitar.
create unique index if not exists family_invites_pending_email_idx
  on public.family_invites(family_id, lower(email))
  where status = 'pending';

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

-- ============================================================================
-- 3. Funciones y triggers
-- ============================================================================

-- `updated_at` al día sin que la app tenga que acordarse.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_families_updated_at   on public.families;
drop trigger if exists set_events_updated_at     on public.events;
drop trigger if exists set_lists_updated_at      on public.lists;
drop trigger if exists set_notes_updated_at      on public.notes;
drop trigger if exists set_budgets_updated_at    on public.budgets;
drop trigger if exists set_expenses_updated_at   on public.expenses;
drop trigger if exists set_quotes_updated_at     on public.quotes;
drop trigger if exists set_meal_plans_updated_at on public.meal_plans;
drop trigger if exists set_documents_updated_at  on public.documents;
drop trigger if exists set_tasks_updated_at      on public.tasks;
drop trigger if exists set_storage_connections_updated_at on public.storage_connections;

create trigger set_families_updated_at   before update on public.families   for each row execute function public.set_updated_at();
create trigger set_events_updated_at     before update on public.events     for each row execute function public.set_updated_at();
create trigger set_lists_updated_at      before update on public.lists      for each row execute function public.set_updated_at();
create trigger set_notes_updated_at      before update on public.notes      for each row execute function public.set_updated_at();
create trigger set_budgets_updated_at    before update on public.budgets    for each row execute function public.set_updated_at();
create trigger set_expenses_updated_at   before update on public.expenses   for each row execute function public.set_updated_at();
create trigger set_quotes_updated_at     before update on public.quotes     for each row execute function public.set_updated_at();
create trigger set_meal_plans_updated_at before update on public.meal_plans for each row execute function public.set_updated_at();
create trigger set_documents_updated_at  before update on public.documents  for each row execute function public.set_updated_at();
create trigger set_tasks_updated_at      before update on public.tasks      for each row execute function public.set_updated_at();
create trigger set_storage_connections_updated_at before update on public.storage_connections for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Integridad entre familias
-- ----------------------------------------------------------------------------
--
-- La RLS impide ver datos de otra familia, pero no impide *escribir* un
-- `child_id` o un `member_id` de otra: son claves ajenas válidas, y la policy
-- solo mira `family_id`. Sin estos triggers, un cliente manipulado podría colgar
-- un evento suyo del hijo de otra casa. Van en `security definer` porque tienen
-- que leer filas que el usuario no ve.

create or replace function public.check_list_item_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.lists where id = new.list_id and family_id = new.family_id
  ) then
    raise exception 'list_items: list_id no pertenece a la misma family_id';
  end if;
  return new;
end;
$$;

create or replace function public.check_event_child_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.child_id is not null then
    if not exists (
      select 1 from public.children where id = new.child_id and family_id = new.family_id
    ) then
      raise exception 'events: child_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.check_event_member_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.member_id is not null then
    if not exists (
      select 1 from public.family_members where id = new.member_id and family_id = new.family_id
    ) then
      raise exception 'events: member_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.check_document_child_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.child_id is not null then
    if not exists (
      select 1 from public.children where id = new.child_id and family_id = new.family_id
    ) then
      raise exception 'documents: child_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.check_document_member_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.member_id is not null then
    if not exists (
      select 1 from public.family_members where id = new.member_id and family_id = new.family_id
    ) then
      raise exception 'documents: member_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.check_task_child_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.child_id is not null then
    if not exists (
      select 1 from public.children where id = new.child_id and family_id = new.family_id
    ) then
      raise exception 'tasks: child_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.check_task_member_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.member_id is not null then
    if not exists (
      select 1 from public.family_members where id = new.member_id and family_id = new.family_id
    ) then
      raise exception 'tasks: member_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.check_expense_budget_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.budget_id is not null then
    if not exists (
      select 1 from public.budgets where id = new.budget_id and family_id = new.family_id
    ) then
      raise exception 'expenses: budget_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.check_expense_child_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.child_id is not null then
    if not exists (
      select 1 from public.children where id = new.child_id and family_id = new.family_id
    ) then
      raise exception 'expenses: child_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.check_expense_member_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.member_id is not null then
    if not exists (
      select 1 from public.family_members where id = new.member_id and family_id = new.family_id
    ) then
      raise exception 'expenses: member_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_list_item_family      on public.list_items;
drop trigger if exists trg_event_child_family    on public.events;
drop trigger if exists trg_event_member_family   on public.events;
drop trigger if exists trg_document_child_family on public.documents;
drop trigger if exists trg_document_member_family on public.documents;
drop trigger if exists trg_task_child_family     on public.tasks;
drop trigger if exists trg_task_member_family    on public.tasks;
drop trigger if exists trg_expense_budget_family on public.expenses;
drop trigger if exists trg_expense_child_family  on public.expenses;
drop trigger if exists trg_expense_member_family on public.expenses;

create trigger trg_list_item_family       before insert or update on public.list_items for each row execute function public.check_list_item_family();
create trigger trg_event_child_family     before insert or update on public.events     for each row execute function public.check_event_child_family();
create trigger trg_event_member_family    before insert or update on public.events     for each row execute function public.check_event_member_family();
create trigger trg_document_child_family  before insert or update on public.documents  for each row execute function public.check_document_child_family();
create trigger trg_document_member_family before insert or update on public.documents  for each row execute function public.check_document_member_family();
create trigger trg_task_child_family      before insert or update on public.tasks      for each row execute function public.check_task_child_family();
create trigger trg_task_member_family     before insert or update on public.tasks      for each row execute function public.check_task_member_family();
create trigger trg_expense_budget_family  before insert or update on public.expenses  for each row execute function public.check_expense_budget_family();
create trigger trg_expense_child_family   before insert or update on public.expenses  for each row execute function public.check_expense_child_family();
create trigger trg_expense_member_family  before insert or update on public.expenses  for each row execute function public.check_expense_member_family();

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================

-- Las familias del usuario autenticado. Es la pieza central: todas las policies
-- de contenido preguntan por aquí.
--
-- `security definer` porque tiene que leer `family_members` sin pasar por la RLS
-- de esa misma tabla, que la usaría a ella —recursión—. `search_path` fijo para
-- que nadie pueda colar un esquema propio delante de `public`.
create or replace function public.my_family_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select family_id
  from public.family_members
  where user_id = auth.uid()
$$;

alter table public.families           enable row level security;
alter table public.family_members     enable row level security;
alter table public.children           enable row level security;
alter table public.events             enable row level security;
alter table public.lists              enable row level security;
alter table public.list_items         enable row level security;
alter table public.notes              enable row level security;
alter table public.budgets            enable row level security;
alter table public.expenses           enable row level security;
alter table public.quotes             enable row level security;
alter table public.meal_plans         enable row level security;
alter table public.documents          enable row level security;
alter table public.tasks              enable row level security;
alter table public.family_invites     enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.storage_connections enable row level security;

-- --- families ---------------------------------------------------------------
--
-- Select para los miembros, update solo para los admin, y **ninguna policy de
-- `delete`**: cerrar una familia va por la RPC `delete_family` (§6), que antes
-- comprueba que quien borra es admin de esa familia y que le queda alguna otra.
drop policy if exists "Miembros ven su familia" on public.families;
create policy "Miembros ven su familia"
  on public.families for select
  using (id in (select public.my_family_ids()));

drop policy if exists "Miembros admin actualizan su familia" on public.families;
create policy "Miembros admin actualizan su familia"
  on public.families for update
  using (
    id in (
      select family_id from public.family_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- --- family_members ---------------------------------------------------------
--
-- Solo `select` e `insert`. No hay policy de `update` ni de `delete`, y no es un
-- olvido: cambiar un rol o echar a alguien tiene que comprobar antes que la
-- familia no se quede sin ningún admin, y eso vive en `update_family_member_role`
-- y `remove_family_member`. Editar el nombre o el color, en
-- `update_family_member_profile`.
drop policy if exists "Miembros ven su familia" on public.family_members;
create policy "Miembros ven su familia"
  on public.family_members for select
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Admin gestiona miembros" on public.family_members;
drop policy if exists "Admin inserta miembros" on public.family_members;
create policy "Admin inserta miembros"
  on public.family_members for insert
  with check (
    family_id in (
      select family_id from public.family_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- --- contenido de la familia ------------------------------------------------
--
-- Todas la misma línea. `for all` sin `with check` explícito: Postgres reutiliza
-- la expresión de `using` para comprobar lo que se escribe, que es justo lo que
-- se quiere.
drop policy if exists "Miembros CRUD hijos de su familia" on public.children;
create policy "Miembros CRUD hijos de su familia"
  on public.children for all
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Miembros CRUD eventos de su familia" on public.events;
create policy "Miembros CRUD eventos de su familia"
  on public.events for all
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Miembros CRUD listas de su familia" on public.lists;
create policy "Miembros CRUD listas de su familia"
  on public.lists for all
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Miembros CRUD items de su familia" on public.list_items;
create policy "Miembros CRUD items de su familia"
  on public.list_items for all
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Miembros CRUD notas de su familia" on public.notes;
create policy "Miembros CRUD notas de su familia"
  on public.notes for all
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Miembros CRUD presupuestos de su familia" on public.budgets;
create policy "Miembros CRUD presupuestos de su familia"
  on public.budgets for all
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Miembros CRUD gastos de su familia" on public.expenses;
create policy "Miembros CRUD gastos de su familia"
  on public.expenses for all
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Miembros CRUD presupuestos pedidos de su familia" on public.quotes;
create policy "Miembros CRUD presupuestos pedidos de su familia"
  on public.quotes for all
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Miembros CRUD comidas de su familia" on public.meal_plans;
create policy "Miembros CRUD comidas de su familia"
  on public.meal_plans for all
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Miembros CRUD documentos de su familia" on public.documents;
create policy "Miembros CRUD documentos de su familia"
  on public.documents for all
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Miembros CRUD tareas de su familia" on public.tasks;
create policy "Miembros CRUD tareas de su familia"
  on public.tasks for all
  using (family_id in (select public.my_family_ids()));

-- --- family_invites ---------------------------------------------------------
--
-- Ver, cualquier miembro; crear, cancelar y modificar, solo un admin. Aceptar no
-- está aquí: lo hace `accept_family_invite`, porque quien acepta todavía no es
-- miembro de esa familia y ninguna policy le dejaría tocar la fila.
drop policy if exists "Miembros ven invitaciones de su familia" on public.family_invites;
create policy "Miembros ven invitaciones de su familia"
  on public.family_invites for select
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Admins gestionan invitaciones" on public.family_invites;
create policy "Admins gestionan invitaciones"
  on public.family_invites for insert
  with check (
    family_id in (
      select family_id from public.family_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins actualizan invitaciones" on public.family_invites;
create policy "Admins actualizan invitaciones"
  on public.family_invites for update
  using (
    family_id in (
      select family_id from public.family_members
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    family_id in (
      select family_id from public.family_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins cancelan invitaciones" on public.family_invites;
create policy "Admins cancelan invitaciones"
  on public.family_invites for delete
  using (
    family_id in (
      select family_id from public.family_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- --- push_subscriptions -----------------------------------------------------
--
-- Por usuario, no por familia.
drop policy if exists "Usuario gestiona sus push" on public.push_subscriptions;
create policy "Usuario gestiona sus push"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- storage_connections ----------------------------------------------------
-- Aquí no hay policy, y no es un olvido: con RLS activada y ninguna policy, la
-- tabla queda cerrada para `anon` y `authenticated`, y solo entra el service role
-- desde una ruta API. Es lo contrario de `push_subscriptions` a propósito —una
-- suscripción push es un endpoint del navegador, un refresh token es una llave
-- permanente al Drive de una persona—. Si alguien añade aquí un `select` "para
-- que la interfaz sepa si está conectada", que lea antes el comentario de la
-- tabla: para eso está `/api/documents/providers`.
drop policy if exists "Usuario gestiona sus conexiones" on public.storage_connections;

-- ============================================================================
-- 5. Storage: nada. Los archivos no los guarda Farpi
-- ============================================================================
--
-- Aquí vivía el bucket privado `documents` con sus cuatro policies. Se borró el
-- 27-08-2026, al pasar los archivos al Google Drive de quien los sube: la base se
-- queda con la ficha (`public.documents`) y el papel con su dueño.
--
-- La sección se queda vacía y con nombre para que el hueco se lea como una
-- decisión y no como un descuido. El bucket, sus policies y las diez
-- comprobaciones que tenía en `scripts/validate-rls.mjs` siguen en el historial de
-- git, en el commit que las quitó.
--
-- Quien guarda ahora es `src/lib/document-storage/`, y el permiso prestado de cada
-- persona está en `public.storage_connections`, más arriba.

-- ============================================================================
-- 6. RPCs
-- ============================================================================
--
-- Lo que las policies no pueden expresar. Todas `security definer` con
-- `search_path` fijo, todas comprueban `auth.uid()` lo primero, y las que tocan
-- roles validan la regla del último admin: **una familia siempre tiene al menos
-- un administrador**. La interfaz también lo impide, pero la que manda es esta.

-- Crear familia y quedarse dentro como admin, en una sola operación. No puede
-- ser un `insert` normal: al crear la familia el usuario todavía no es miembro
-- de nada, así que ninguna policy le dejaría meterse a sí mismo.
create or replace function public.create_family_with_admin(family_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id     uuid;
  caller_uid        uuid := auth.uid();
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

grant execute on function public.create_family_with_admin(text) to authenticated;

-- Cerrar una familia y llevarse todo lo suyo. Tampoco puede ser un `delete`
-- normal: `families` no tiene policy de `delete`, y no es un olvido —igual que en
-- `family_members`— porque antes hay dos cosas que comprobar y una policy no sabe
-- hacerlo. Que quien borra sea **admin de esa familia**, y que le quede alguna
-- otra: la app siempre trabaja dentro de una familia, así que quedarse sin
-- ninguna es un estado que no existe. Para dejarlo todo está borrar la cuenta,
-- que sí se lleva las familias donde estabas solo.
--
-- Los archivos de los documentos no se tocan, por lo mismo que en
-- `/api/account/delete`: están en el Google Drive de quien los subió y son suyos.
-- Lo que se va con la familia es la ficha, en cascada.
create or replace function public.delete_family(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller_uid  uuid := auth.uid();
  v_otras_count int;
begin
  if v_caller_uid is null then
    raise exception 'Acceso denegado: usuario no autenticado';
  end if;

  if not exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id = v_caller_uid and role = 'admin'
  ) then
    raise exception 'Acceso denegado: el usuario no es administrador de esta familia';
  end if;

  select count(*) into v_otras_count
  from public.family_members
  where user_id = v_caller_uid and family_id <> p_family_id;

  if v_otras_count = 0 then
    raise exception 'No se puede eliminar la única familia: crea otra antes o borra tu cuenta';
  end if;

  delete from public.families where id = p_family_id;
end;
$$;

grant execute on function public.delete_family(uuid) to authenticated;

-- Editar nombre y color de un miembro. Uno mismo siempre; a los demás, solo un
-- admin **de esa familia** —ser admin de otra no sirve, y por eso se comprueba
-- contra la familia del miembro editado y no contra las del que llama.
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

-- Echar a alguien de la familia. Protege al último admin.
create or replace function public.remove_family_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id   uuid;
  v_caller_uid  uuid := auth.uid();
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

-- Cambiar el rol de un miembro. Protege al último admin al degradar.
create or replace function public.update_family_member_role(p_member_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_family_id   uuid;
  v_caller_uid  uuid := auth.uid();
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

-- Aceptar una invitación. Quien la acepta todavía no es miembro, así que no hay
-- policy que pueda dejarle escribir: tiene que ser una RPC. Comprueba que la
-- invitación es para su email —si no, cualquiera con el id entraría en casa
-- ajena— y es idempotente si ya era miembro por otra vía.
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
-- Fin del esquema.
-- ============================================================================
