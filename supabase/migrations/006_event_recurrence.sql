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
