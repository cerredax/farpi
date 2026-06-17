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
