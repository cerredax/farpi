-- ============================================================
-- NIDO — Suscripciones a notificaciones push (Web Push)
-- Cada fila es un dispositivo/navegador suscrito de un usuario.
-- ============================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Cada usuario gestiona solo sus propias suscripciones.
drop policy if exists "Usuario gestiona sus push" on public.push_subscriptions;
create policy "Usuario gestiona sus push"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
