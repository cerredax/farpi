-- ============================================================
-- NIDO — Esquema completo (migraciones 001–009 concatenadas)
-- Generado para pegar de una vez en Supabase → SQL Editor.
-- Ejecuta este bloque en un proyecto Supabase nuevo/vacío.
-- ============================================================


-- ─────────────────────────────────────────────────────────
-- 001_initial_schema.sql
-- ─────────────────────────────────────────────────────────
-- ============================================================
-- NIDO — Esquema inicial de base de datos
-- ============================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================================
-- FAMILIES
-- ============================================================
create table public.families (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- FAMILY_MEMBERS
-- Une usuarios de Supabase Auth con familias
-- ============================================================
create table public.family_members (
  id           uuid primary key default uuid_generate_v4(),
  family_id    uuid not null references public.families(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  role         text not null default 'member' check (role in ('admin', 'member')),
  created_at   timestamptz not null default now(),
  unique(family_id, user_id)
);

-- ============================================================
-- CHILDREN
-- ============================================================
create table public.children (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  name        text not null,
  birth_date  date,
  color       text not null default '#8BA888',
  created_at  timestamptz not null default now()
);

-- ============================================================
-- EVENTS
-- ============================================================
create table public.events (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  child_id    uuid references public.children(id) on delete set null,
  title       text not null,
  description text,
  start_at    timestamptz not null,
  end_at      timestamptz,
  all_day     boolean not null default false,
  color       text,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index events_family_start_idx on public.events(family_id, start_at);

-- ============================================================
-- LISTS
-- ============================================================
create table public.lists (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  name        text not null,
  emoji       text,
  color       text,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- LIST_ITEMS
-- ============================================================
create table public.list_items (
  id            uuid primary key default uuid_generate_v4(),
  list_id       uuid not null references public.lists(id) on delete cascade,
  family_id     uuid not null references public.families(id) on delete cascade,
  text          text not null,
  completed     boolean not null default false,
  completed_at  timestamptz,
  completed_by  uuid references auth.users(id),
  sort_order    integer not null default 0,
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now()
);

create index list_items_list_idx on public.list_items(list_id, sort_order);

-- ============================================================
-- MEAL_PLANS
-- ============================================================
create table public.meal_plans (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  date        date not null,
  slot        text not null check (slot in ('breakfast', 'lunch', 'dinner', 'snack')),
  name        text not null,
  notes       text,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(family_id, date, slot)
);

create index meal_plans_family_date_idx on public.meal_plans(family_id, date);

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table public.documents (
  id            uuid primary key default uuid_generate_v4(),
  family_id     uuid not null references public.families(id) on delete cascade,
  child_id      uuid references public.children(id) on delete set null,
  name          text not null,
  description   text,
  category      text check (category is null or category in ('salud', 'colegio', 'personal', 'otros')),
  storage_path  text not null,
  mime_type     text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes    bigint not null default 0 check (size_bytes >= 0 and size_bytes <= 20971520),
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index documents_family_idx on public.documents(family_id, created_at desc);

-- ============================================================
-- TASKS
-- ============================================================
create table public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  title       text not null,
  notes       text,
  priority    text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date    date,
  completed   boolean not null default false,
  completed_at timestamptz,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index tasks_family_idx    on public.tasks(family_id);
create index tasks_due_date_idx  on public.tasks(family_id, due_date);
create index tasks_completed_idx on public.tasks(family_id, completed);

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_families_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

create trigger set_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger set_lists_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

create trigger set_meal_plans_updated_at
  before update on public.meal_plans
  for each row execute function public.set_updated_at();

create trigger set_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();


-- ─────────────────────────────────────────────────────────
-- 002_rls_policies.sql
-- ─────────────────────────────────────────────────────────
-- ============================================================
-- NIDO — Row Level Security
-- Regla central: un usuario solo accede a datos de familias
-- a las que pertenece como miembro.
-- ============================================================

-- Función auxiliar: devuelve los family_ids del usuario actual.
-- security definer + search_path fijo evitan inyección de schema.
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

-- ============================================================
-- FAMILIES
-- ============================================================
alter table public.families enable row level security;

create policy "Miembros ven su familia"
  on public.families for select
  using (id in (select public.my_family_ids()));

create policy "Miembros admin actualizan su familia"
  on public.families for update
  using (
    id in (
      select family_id from public.family_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- FAMILY_MEMBERS
-- ============================================================
alter table public.family_members enable row level security;

create policy "Miembros ven su familia"
  on public.family_members for select
  using (family_id in (select public.my_family_ids()));

-- NOTA: No existe policy de update directo sobre family_members.
-- Para actualizar display_name o avatar_url usar la RPC
-- update_my_family_profile (003_rpc.sql), que solo permite
-- modificar esos dos campos y verifica la identidad del llamante.

create policy "Admin gestiona miembros"
  on public.family_members for all
  using (
    family_id in (
      select family_id from public.family_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- CHILDREN
-- ============================================================
alter table public.children enable row level security;

create policy "Miembros CRUD hijos de su familia"
  on public.children for all
  using (family_id in (select public.my_family_ids()));

-- ============================================================
-- EVENTS
-- ============================================================
alter table public.events enable row level security;

create policy "Miembros CRUD eventos de su familia"
  on public.events for all
  using (family_id in (select public.my_family_ids()));

-- ============================================================
-- LISTS
-- ============================================================
alter table public.lists enable row level security;

create policy "Miembros CRUD listas de su familia"
  on public.lists for all
  using (family_id in (select public.my_family_ids()));

-- ============================================================
-- LIST_ITEMS
-- ============================================================
alter table public.list_items enable row level security;

create policy "Miembros CRUD items de su familia"
  on public.list_items for all
  using (family_id in (select public.my_family_ids()));

-- ============================================================
-- MEAL_PLANS
-- ============================================================
alter table public.meal_plans enable row level security;

create policy "Miembros CRUD comidas de su familia"
  on public.meal_plans for all
  using (family_id in (select public.my_family_ids()));

-- ============================================================
-- DOCUMENTS
-- ============================================================
alter table public.documents enable row level security;

create policy "Miembros CRUD documentos de su familia"
  on public.documents for all
  using (family_id in (select public.my_family_ids()));

-- ============================================================
-- TASKS
-- ============================================================
alter table public.tasks enable row level security;

create policy "Miembros CRUD tareas de su familia"
  on public.tasks for all
  using (family_id in (select public.my_family_ids()));

-- ============================================================
-- STORAGE: bucket "documents"
-- (ejecutar en Dashboard > Storage o vía API)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);

-- create policy "Acceso solo a familia"
--   on storage.objects for all
--   using (
--     bucket_id = 'documents'
--     and (storage.foldername(name))[1] in (
--       select family_id::text from public.my_family_ids()
--     )
--   );


-- ─────────────────────────────────────────────────────────
-- 003_rpc.sql
-- ─────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────
-- 004_family_invites_storage.sql
-- ─────────────────────────────────────────────────────────
-- ============================================================
-- NIDO — Invitaciones familiares y Storage
-- ============================================================

-- ============================================================
-- FAMILY_INVITES
-- Invitaciones por email a personas que aún no tienen cuenta.
-- Una vez aceptada, se crea el family_member y la invitación
-- pasa a status = 'accepted'.
-- ============================================================
create table public.family_invites (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references public.families(id) on delete cascade,
  email       text not null,
  role        text not null default 'member' check (role in ('admin', 'member')),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  invited_by  uuid references auth.users(id),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Índice general para buscar invitaciones de una familia
create index family_invites_family_idx on public.family_invites(family_id);

-- Evita dos invitaciones pendientes al mismo email dentro de la misma familia
create unique index family_invites_pending_email_idx
  on public.family_invites(family_id, lower(email))
  where status = 'pending';

-- ============================================================
-- RLS: FAMILY_INVITES
-- ============================================================
alter table public.family_invites enable row level security;

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

-- ============================================================
-- STORAGE: bucket privado "documents"
-- Path esperado: {family_id}/{document_id}/{filename}
-- El primer segmento del path debe ser el family_id del usuario.
-- ============================================================
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


-- ─────────────────────────────────────────────────────────
-- 005_task_recurrence.sql
-- ─────────────────────────────────────────────────────────
-- ============================================================
-- NIDO — Recurrencia en tareas
-- ============================================================

alter table public.tasks
  add column if not exists recurrence      text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  add column if not exists recurrence_end  date;


-- ─────────────────────────────────────────────────────────
-- 006_event_recurrence.sql
-- ─────────────────────────────────────────────────────────
-- ============================================================
-- NIDO — Recurrencia de eventos
-- Añade recurrence_group_id a events para agrupar los eventos
-- individuales generados por una misma serie semanal.
-- Es un UUID de agrupación libre, no FK a ninguna tabla.
-- ============================================================

alter table public.events
  add column if not exists recurrence_group_id uuid;

create index if not exists events_recurrence_group_idx
  on public.events(recurrence_group_id)
  where recurrence_group_id is not null;


-- ─────────────────────────────────────────────────────────
-- 007_cross_family_integrity.sql
-- ─────────────────────────────────────────────────────────
-- Garantiza que list_items, events y documents no crucen fronteras de familia.
-- No se pueden usar CHECK constraints (no pueden referenciar otras tablas),
-- así que se usan triggers BEFORE INSERT OR UPDATE.

create or replace function public.check_list_item_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.lists
    where id = new.list_id and family_id = new.family_id
  ) then
    raise exception 'list_items: list_id no pertenece a la misma family_id';
  end if;
  return new;
end;
$$;

create trigger trg_list_item_family
  before insert or update on public.list_items
  for each row execute function public.check_list_item_family();

-- events.child_id debe pertenecer a la misma familia (nullable)
create or replace function public.check_event_child_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.child_id is not null then
    if not exists (
      select 1 from public.children
      where id = new.child_id and family_id = new.family_id
    ) then
      raise exception 'events: child_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_event_child_family
  before insert or update on public.events
  for each row execute function public.check_event_child_family();

-- documents.child_id debe pertenecer a la misma familia (nullable)
create or replace function public.check_document_child_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.child_id is not null then
    if not exists (
      select 1 from public.children
      where id = new.child_id and family_id = new.family_id
    ) then
      raise exception 'documents: child_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_document_child_family
  before insert or update on public.documents
  for each row execute function public.check_document_child_family();


-- ─────────────────────────────────────────────────────────
-- 008_admin_rpcs.sql
-- ─────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────
-- 009_accept_invite_rpc.sql
-- ─────────────────────────────────────────────────────────
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

