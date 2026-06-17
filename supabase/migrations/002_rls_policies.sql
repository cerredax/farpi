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
