-- Festivos: días en los que no se trabaja ni hay colegio.
--
-- Es la cuarta cara del mismo campo, después de `vacaciones` (013) y `descanso`
-- (017), y por la misma razón que aquellas no merece tabla propia: mismas
-- policies, misma asignación, misma integridad entre familias.
--
-- Se separa de los otros tres porque responde a otra pregunta. Un plan es de
-- alguien y ocurre a una hora; unas vacaciones y un descanso dicen quién no está
-- disponible; un festivo **no es de nadie**: es una propiedad del día, y afecta
-- igual a toda la casa. De ahí que el calendario lo pinte en gris y no en la
-- paleta de personas, donde el color significa siempre "de quién es esto".
--
-- Cada familia apunta los suyos y esa es la intención: los nacionales, los de la
-- comunidad, los del pueblo y los del colegio no salen de ninguna lista que
-- sirva para todos, y cambian de un año a otro.

alter table public.events
  drop constraint if exists events_kind_valido;
alter table public.events
  add constraint events_kind_valido check (kind in ('evento', 'vacaciones', 'descanso', 'festivo'));

-- Un festivo ocupa días completos y necesita día final, igual que unas
-- vacaciones o un descanso: un puente son dos o tres días seguidos.
-- `validateEventDraft` ya lo exige en la app y `eventCoversDay` cuenta con el
-- rango. Se añade aparte, sin tocar las dos que ya dejaron correctas la 013 y
-- la 017.
alter table public.events
  drop constraint if exists events_festivo_con_rango;
alter table public.events
  add constraint events_festivo_con_rango
  check (kind <> 'festivo' or (all_day = true and end_at is not null));
