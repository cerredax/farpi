-- Qué franjas de comida se ven, por familia.
--
-- Las cuatro franjas —desayuno, comida, merienda y cena— están fijas en el
-- código desde el principio y salían siempre las cuatro. En una casa que no
-- merienda, esa fila es un hueco que la app pide llenar siete veces por semana.
--
-- Va en `families` y no en cada miembro a propósito: «en casa no merendamos» es
-- un hecho de la casa, no la preferencia de un teléfono. Guardado aquí se
-- configura una vez y vale para todos los móviles, y de paso no se pierde al
-- borrar los datos del navegador.
--
-- Ocultar una franja **no borra nada**. `meal_plans` no se toca: lo que hubiera
-- apuntado en esa franja sigue en la base y vuelve a verse si se reactiva. Es
-- una decisión de visibilidad, como el catálogo plegado de las listas.
--
-- No hace falta policy nueva: `families` ya tiene la de update de la 002
-- («Miembros admin actualizan su familia»), así que esto lo cambia un admin,
-- igual que el nombre de la familia.

alter table public.families
  add column if not exists meal_slots text[] not null
    default array['breakfast', 'lunch', 'snack', 'dinner']::text[];

-- Los valores válidos son los mismos que acepta `meal_plans.slot` en la 001, y
-- tiene que quedar al menos uno: sin ninguna franja la pantalla de comidas se
-- queda sin filas y no hay forma de volver a activarlas desde ella.
--
-- `cardinality` y no `array_length`: con el array vacío `array_length` devuelve
-- null, y un `check` que sale null se considera cumplido, así que `{}` se
-- colaría. `cardinality('{}')` es 0 y sí lo rechaza.
--
-- Lo que no se comprueba aquí es que no haya repetidos: necesita un
-- `count(distinct …)` y un `check` no admite subqueries. Se normaliza en el
-- cliente (`normalizeMealSlots`, en `src/lib/meal-slots.ts`), que además ordena
-- las franjas para que se guarden siempre igual.
alter table public.families
  drop constraint if exists families_meal_slots_validos;
alter table public.families
  add constraint families_meal_slots_validos check (
    meal_slots <@ array['breakfast', 'lunch', 'dinner', 'snack']::text[]
    and cardinality(meal_slots) between 1 and 4
  );

comment on column public.families.meal_slots is
  'Franjas de comida visibles en la pantalla de comidas. Ocultar una no borra sus meal_plans.';
