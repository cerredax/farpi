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
