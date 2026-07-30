-- ============================================================
-- NIDO — Permitir el borrado de cuenta
-- Las referencias de autoría (created_by / completed_by / invited_by)
-- pasan a NULL al eliminar el usuario, en vez de bloquear el borrado.
-- ============================================================

-- 1) Quitar NOT NULL de las columnas de autoría.
alter table public.events     alter column created_by drop not null;
alter table public.tasks      alter column created_by drop not null;
alter table public.lists      alter column created_by drop not null;
alter table public.list_items alter column created_by drop not null;
alter table public.meal_plans alter column created_by drop not null;
alter table public.documents  alter column created_by drop not null;

-- 2) Recrear las claves foráneas con ON DELETE SET NULL.
alter table public.events drop constraint if exists events_created_by_fkey;
alter table public.events add constraint events_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.tasks drop constraint if exists tasks_created_by_fkey;
alter table public.tasks add constraint tasks_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.lists drop constraint if exists lists_created_by_fkey;
alter table public.lists add constraint lists_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.list_items drop constraint if exists list_items_created_by_fkey;
alter table public.list_items add constraint list_items_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.list_items drop constraint if exists list_items_completed_by_fkey;
alter table public.list_items add constraint list_items_completed_by_fkey
  foreign key (completed_by) references auth.users(id) on delete set null;

alter table public.meal_plans drop constraint if exists meal_plans_created_by_fkey;
alter table public.meal_plans add constraint meal_plans_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.documents drop constraint if exists documents_created_by_fkey;
alter table public.documents add constraint documents_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.family_invites drop constraint if exists family_invites_invited_by_fkey;
alter table public.family_invites add constraint family_invites_invited_by_fkey
  foreign key (invited_by) references auth.users(id) on delete set null;
