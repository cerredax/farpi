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
