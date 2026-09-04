-- Farpi — parche del 04-09-2026: borrar la cuenta vuelve a funcionar
--
-- **Aplicado y validado el 04-09-2026**: `node scripts/validate-rls.mjs` dio
-- 165/165 contra la base real, con las dos comprobaciones nuevas de la §12 en
-- verde. Anotado en docs/supabase-validation.md.
--
-- Se pega entero en el SQL Editor del proyecto real, como todo el esquema (no hay
-- CLI de Supabase enlazada: local y producción son el mismo proyecto). Es una sola
-- función, `create or replace`, así que pasarlo dos veces no hace nada la segunda.
--
-- Igual que `supabase/aplicar-meses-cerrados.sql`, este archivo **se reescribe
-- entero** si el trigger vuelve a cambiar: no crece con parches encima. Lo que
-- vale siempre es `supabase/schema.sql`.
--
-- ── Qué estaba roto ─────────────────────────────────────────────────────────
--
-- `documents.storage_owner` es `on delete set null` contra `auth.users`, y el
-- trigger `trg_document_storage_inmutable` que entró el 03-09-2026 lanza una
-- excepción en cuanto esa columna cambia. Postgres ejecuta la acción referencial
-- como un **update** sobre `documents`, así que pasa por el trigger: las dos
-- piezas se pisan.
--
-- El caso real, y es el caso normal de esta app: dos adultos en la misma casa,
-- los dos admin, uno ha subido papeles. Ese borra su cuenta en Ajustes. La
-- familia no se cierra —queda la otra persona—, así que las fichas siguen ahí
-- cuando `/api/account/delete` llama a `deleteUser`; la acción referencial
-- intenta poner el dueño a nulo, el trigger salta y se cae el borrado entero.
-- Un 500 permanente, sin ninguna salida por la interfaz.
--
-- Las 163 comprobaciones no lo veían porque la limpieza del validador borra las
-- familias **antes** que los usuarios, y con la familia se van las fichas en
-- cascada: cuando le toca el turno al usuario ya no queda nada que apunte a él.
-- El arnés lleva ahora dos comprobaciones que sí lo miran, en la §12.
--
-- ── Cómo se arregla ─────────────────────────────────────────────────────────
--
-- Dejando pasar **solo** ese caso, y reconocido por de dónde sale y no por quién
-- lo pide: que el dueño anterior ya no exista en `auth.users`. Eso no lo puede
-- fabricar un miembro con malas intenciones, porque no le puede borrar la cuenta
-- a nadie. El sabotaje que cerró el 03-09-2026 —poner a nulo el dueño de una
-- ficha ajena para dejarla inservible— sigue cerrado.

create or replace function public.check_document_storage_inmutable()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.storage_owner is distinct from old.storage_owner then
    -- La única salida, y no es una grieta (04-09-2026). `storage_owner` es
    -- `on delete set null` contra `auth.users`, y Postgres ejecuta esa acción
    -- referencial como un **update** sobre esta tabla: entra por este mismo
    -- trigger. Sin esta salida, borrar la cuenta de quien había subido un papel
    -- en una familia que le sobrevive fallaba entero —la excepción tumbaba el
    -- `delete` de `auth.users`— y Ajustes devolvía un 500 para siempre.
    --
    -- Se distingue por **de dónde sale**, no por quién lo pide: la única forma
    -- de que el dueño anterior ya no exista en `auth.users` es que se acabe de
    -- borrar en esta misma transacción, y eso no lo puede fabricar un miembro
    -- con malas intenciones, que no le puede borrar la cuenta a nadie. El
    -- sabotaje sigue cerrado: poner a nulo el dueño de una ficha ajena cuyo
    -- dueño conserva su cuenta falla igual que antes.
    --
    -- Que la ficha se quede sin dueño es el estado correcto y ya estaba
    -- previsto: es el mismo que el de las fichas de antes del 27-08-2026, y la
    -- policy de `insert` lo admite explícitamente. El archivo ya era ilegible de
    -- todos modos —la conexión de Drive se va en cascada con el usuario— y lo
    -- que la casa quiere conservar (nombre, carpeta, caducidad, de quién es)
    -- sigue en su sitio.
    --
    -- Dentro de este `if`, `new` nulo implica `old` no nulo, así que las dos
    -- condiciones de abajo bastan. Es `security definer` solo para poder leer
    -- `auth.users`, que `authenticated` no ve; no escribe nada.
    if new.storage_owner is not null
      or exists (select 1 from auth.users where id = old.storage_owner)
    then
      raise exception 'documents: storage_owner no se puede cambiar';
    end if;
  end if;
  if new.storage_path is distinct from old.storage_path then
    raise exception 'documents: storage_path no se puede cambiar';
  end if;
  if new.storage_provider is distinct from old.storage_provider then
    raise exception 'documents: storage_provider no se puede cambiar';
  end if;
  return new;
end;
$$;

-- ── Comprobar ───────────────────────────────────────────────────────────────
-- La función tiene que ser `security definer` y mencionar `auth.users`:
--   select prosecdef, position('auth.users' in prosrc) > 0 as mira_usuarios
--   from pg_proc where proname = 'check_document_storage_inmutable';
--
-- El trigger sigue siendo el mismo y no hay que recrearlo: `create or replace
-- function` no lo toca.
--
-- Después: `node scripts/validate-rls.mjs`.
