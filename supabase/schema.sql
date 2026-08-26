-- ============================================================================
-- Nido — esquema completo de la base de datos
-- ============================================================================
--
-- Este archivo describe la base **tal como está**, no cómo llegó hasta aquí.
-- Aplicándolo sobre un proyecto Supabase vacío queda una base idéntica a la de
-- producción: tablas, restricciones, índices, triggers, funciones, RLS, RPCs y
-- el bucket de documentos con sus policies.
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
  -- Las repeticiones se materializan como filas sueltas que comparten grupo, en
  -- vez de guardar una regla y calcularla al vuelo: así se puede mover o borrar
  -- una sola ocurrencia sin inventar excepciones.
  recurrence_group_id uuid,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint events_kind_valido check (kind in ('evento', 'vacaciones', 'descanso', 'festivo')),
  constraint events_vacaciones_con_rango check (kind <> 'vacaciones' or (all_day = true and end_at is not null)),
  constraint events_descanso_con_rango   check (kind <> 'descanso'   or (all_day = true and end_at is not null)),
  constraint events_festivo_con_rango    check (kind <> 'festivo'    or (all_day = true and end_at is not null)),
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

-- Los papeles: DNI, informes médicos, el libro de familia. El archivo vive en
-- Storage (bucket privado `documents`) y aquí queda la ficha. `size_bytes` y
-- `mime_type` están acotados en la propia tabla y no solo en la app, porque la
-- app no es el único camino hasta la base.
create table if not exists public.documents (
  id            uuid primary key default uuid_generate_v4(),
  family_id     uuid not null references public.families(id) on delete cascade,
  child_id      uuid references public.children(id) on delete set null,
  member_id     uuid references public.family_members(id) on delete set null,
  name          text not null,
  description   text,
  category      text check (category is null or category in ('salud', 'colegio', 'personal', 'otros')),
  storage_path  text not null,
  mime_type     text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes    bigint not null default 0 check (size_bytes >= 0 and size_bytes <= 20971520),
  -- Cuándo caduca, para avisar antes: el pasaporte del niño, la tarjeta sanitaria.
  expires_on    date,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint documents_una_sola_asignacion check (child_id is null or member_id is null)
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
create index if not exists meal_plans_family_date_idx on public.meal_plans(family_id, date);

create index if not exists documents_family_idx   on public.documents(family_id, created_at desc);
create index if not exists idx_documents_member    on public.documents(member_id);
create index if not exists idx_documents_expires   on public.documents(family_id, expires_on);

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
drop trigger if exists set_meal_plans_updated_at on public.meal_plans;
drop trigger if exists set_documents_updated_at  on public.documents;
drop trigger if exists set_tasks_updated_at      on public.tasks;

create trigger set_families_updated_at   before update on public.families   for each row execute function public.set_updated_at();
create trigger set_events_updated_at     before update on public.events     for each row execute function public.set_updated_at();
create trigger set_lists_updated_at      before update on public.lists      for each row execute function public.set_updated_at();
create trigger set_meal_plans_updated_at before update on public.meal_plans for each row execute function public.set_updated_at();
create trigger set_documents_updated_at  before update on public.documents  for each row execute function public.set_updated_at();
create trigger set_tasks_updated_at      before update on public.tasks      for each row execute function public.set_updated_at();

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

drop trigger if exists trg_list_item_family      on public.list_items;
drop trigger if exists trg_event_child_family    on public.events;
drop trigger if exists trg_event_member_family   on public.events;
drop trigger if exists trg_document_child_family on public.documents;
drop trigger if exists trg_document_member_family on public.documents;
drop trigger if exists trg_task_child_family     on public.tasks;
drop trigger if exists trg_task_member_family    on public.tasks;

create trigger trg_list_item_family       before insert or update on public.list_items for each row execute function public.check_list_item_family();
create trigger trg_event_child_family     before insert or update on public.events     for each row execute function public.check_event_child_family();
create trigger trg_event_member_family    before insert or update on public.events     for each row execute function public.check_event_member_family();
create trigger trg_document_child_family  before insert or update on public.documents  for each row execute function public.check_document_child_family();
create trigger trg_document_member_family before insert or update on public.documents  for each row execute function public.check_document_member_family();
create trigger trg_task_child_family      before insert or update on public.tasks      for each row execute function public.check_task_child_family();
create trigger trg_task_member_family     before insert or update on public.tasks      for each row execute function public.check_task_member_family();

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
alter table public.meal_plans         enable row level security;
alter table public.documents          enable row level security;
alter table public.tasks              enable row level security;
alter table public.family_invites     enable row level security;
alter table public.push_subscriptions enable row level security;

-- --- families ---------------------------------------------------------------
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

-- ============================================================================
-- 5. Storage: el bucket de documentos
-- ============================================================================
--
-- Privado. Los archivos se sirven con URL firmada de 60 segundos, nunca por URL
-- pública. La carpeta de primer nivel es el `family_id`, y de ahí sale la
-- comprobación: `(storage.foldername(name))[1]` tiene que ser una familia del
-- usuario.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "Miembros leen documentos de su familia" on storage.objects;
create policy "Miembros leen documentos de su familia"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select family_id::text from public.family_members where user_id = auth.uid()
    )
  );

drop policy if exists "Miembros suben documentos a su familia" on storage.objects;
create policy "Miembros suben documentos a su familia"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select family_id::text from public.family_members where user_id = auth.uid()
    )
  );

drop policy if exists "Miembros actualizan documentos de su familia" on storage.objects;
create policy "Miembros actualizan documentos de su familia"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select family_id::text from public.family_members where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select family_id::text from public.family_members where user_id = auth.uid()
    )
  );

drop policy if exists "Miembros borran documentos de su familia" on storage.objects;
create policy "Miembros borran documentos de su familia"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select family_id::text from public.family_members where user_id = auth.uid()
    )
  );

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
