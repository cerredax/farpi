-- Una tarea ya puede tener dueño, y se guarda quién la marcó.
--
-- Eventos y documentos se asignan desde la migración 012, pero las tareas no,
-- que son justo donde más falta hace: en una casa compartida la pregunta de una
-- tarea es "¿quién la hace?". Sin esto, "Comprar pañales" era de nadie y de los
-- dos a la vez.
--
-- Mismo modelo que la 012: `child_id` o `member_id`, nunca los dos, y los dos a
-- null significa "de toda la familia".

alter table public.tasks
  add column if not exists child_id uuid references public.children(id) on delete set null;

alter table public.tasks
  add column if not exists member_id uuid references public.family_members(id) on delete set null;

-- Quién la dio por hecha. `completed_at` decía cuándo pero no quién, así que
-- "¿esto lo has hecho tú?" no tenía respuesta. `list_items` ya lo guardaba.
alter table public.tasks
  add column if not exists completed_by uuid references auth.users(id) on delete set null;

create index if not exists idx_tasks_child  on public.tasks(child_id);
create index if not exists idx_tasks_member on public.tasks(member_id);

alter table public.tasks
  drop constraint if exists tasks_una_sola_asignacion;
alter table public.tasks
  add constraint tasks_una_sola_asignacion
  check (child_id is null or member_id is null);

-- Integridad entre familias, igual que la de eventos y documentos en las
-- migraciones 007 y 012: no se puede asignar a alguien de otra familia.
create or replace function public.check_task_child_family()
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
      raise exception 'tasks: child_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_task_child_family on public.tasks;
create trigger trg_task_child_family
  before insert or update on public.tasks
  for each row execute function public.check_task_child_family();

create or replace function public.check_task_member_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.member_id is not null then
    if not exists (
      select 1 from public.family_members
      where id = new.member_id and family_id = new.family_id
    ) then
      raise exception 'tasks: member_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_task_member_family on public.tasks;
create trigger trg_task_member_family
  before insert or update on public.tasks
  for each row execute function public.check_task_member_family();
