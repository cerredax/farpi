-- Descansos: días en los que alguien de la familia no está disponible.
--
-- La 013 dejó `kind` con dos valores porque solo hacían falta dos: un plan
-- puntual y unas vacaciones. Un descanso es la tercera cara de lo mismo —el
-- turno libre de quien trabaja a turnos, el día que alguien no puede recoger a
-- los niños— y por la misma razón que las vacaciones no merece tabla propia:
-- mismas policies, misma asignación, misma integridad entre familias.
--
-- Se separa de `vacaciones` en lugar de reutilizarlo porque el calendario los
-- pinta distinto (la franja sigue siendo de las vacaciones, el descanso es una
-- marca circular en la celda) y porque solo el descanso responde a "¿puedo
-- contar con esta persona este día?".

alter table public.events
  drop constraint if exists events_kind_valido;
alter table public.events
  add constraint events_kind_valido check (kind in ('evento', 'vacaciones', 'descanso'));

-- Un descanso ocupa días completos y necesita día final, igual que unas
-- vacaciones: `validateEventDraft` ya lo exige en la app y `eventCoversDay`
-- cuenta con el rango. Se añade aparte en vez de ampliar
-- `events_vacaciones_con_rango` para no tocar lo que la 013 dejó correcto.
alter table public.events
  drop constraint if exists events_descanso_con_rango;
alter table public.events
  add constraint events_descanso_con_rango
  check (kind <> 'descanso' or (all_day = true and end_at is not null));
