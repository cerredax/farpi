-- ============================================================
-- NIDO — Recurrencia en tareas
-- ============================================================

alter table public.tasks
  add column if not exists recurrence      text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  add column if not exists recurrence_end  date;
