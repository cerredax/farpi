-- Permite asignar eventos y documentos a cualquier miembro de la familia, no
-- solo a los hijos. Hasta ahora `child_id` era la única forma de asignar, de
-- modo que los adultos no podían aparecer como responsables de nada.
--
-- Se añade `member_id` en lugar de generalizar `child_id` porque hijos y
-- miembros son cosas distintas: un miembro tiene cuenta y entra en la app; un
-- hijo es alguien de quien la familia lleva registro. Una fila puede apuntar a
-- uno, a otro o a ninguno (= "toda la familia"), pero nunca a los dos.

alter table public.events
  add column if not exists member_id uuid references public.family_members(id) on delete set null;

alter table public.documents
  add column if not exists member_id uuid references public.family_members(id) on delete set null;

create index if not exists idx_events_member    on public.events(member_id);
create index if not exists idx_documents_member on public.documents(member_id);

-- Un evento o documento se asigna a un hijo O a un miembro, no a ambos.
alter table public.events
  drop constraint if exists events_una_sola_asignacion;
alter table public.events
  add constraint events_una_sola_asignacion
  check (child_id is null or member_id is null);

alter table public.documents
  drop constraint if exists documents_una_sola_asignacion;
alter table public.documents
  add constraint documents_una_sola_asignacion
  check (child_id is null or member_id is null);

-- Integridad entre familias, igual que la de `child_id` en la migración 007:
-- no se puede asignar a alguien de otra familia.
create or replace function public.check_event_member_family()
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
      raise exception 'events: member_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_event_member_family on public.events;
create trigger trg_event_member_family
  before insert or update on public.events
  for each row execute function public.check_event_member_family();

create or replace function public.check_document_member_family()
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
      raise exception 'documents: member_id no pertenece a la misma family_id';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_document_member_family on public.documents;
create trigger trg_document_member_family
  before insert or update on public.documents
  for each row execute function public.check_document_member_family();
