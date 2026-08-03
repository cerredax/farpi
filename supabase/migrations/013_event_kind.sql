-- Vacaciones: días seguidos en los que alguien de la familia está fuera.
--
-- No se crea una tabla nueva porque unas vacaciones son exactamente un evento
-- de varios días asignado a una persona: mismas policies, misma asignación,
-- misma integridad entre familias. Basta con distinguir el tipo y aprovechar
-- `end_at`, que en un evento normal marca la hora de fin y aquí marca el último
-- día.

alter table public.events
  add column if not exists kind text not null default 'evento';

alter table public.events
  drop constraint if exists events_kind_valido;
alter table public.events
  add constraint events_kind_valido check (kind in ('evento', 'vacaciones'));

-- Unas vacaciones ocupan días completos y necesitan un día final; si no, no hay
-- rango que pintar en el calendario.
alter table public.events
  drop constraint if exists events_vacaciones_con_rango;
alter table public.events
  add constraint events_vacaciones_con_rango
  check (kind <> 'vacaciones' or (all_day = true and end_at is not null));

create index if not exists idx_events_kind on public.events(kind);
