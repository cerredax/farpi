-- Cuántas unidades hacen falta de cada cosa.
--
-- Una lista de casa dice qué falta, y a veces cuánto: tres yogures no es lo
-- mismo que uno. Hasta ahora eso se escribía dentro del propio texto ("leche
-- x2"), que se lee peor, no se puede cambiar sin reescribir el nombre y ensucia
-- el catálogo de "lo de siempre", donde el nombre tiene que quedar limpio para
-- volver a pedirlo.
--
-- Es un entero y no un texto libre a propósito: en el súper se toca, no se
-- teclea, y un número admite los dos botones de más y de menos. Lo que no cabe
-- aquí —"2 kg", "media docena"— se sigue escribiendo en el nombre, que es donde
-- ya se escribía y donde tiene sentido leerlo.
--
-- Arranca en 1 para que lo que ya existe no cambie de significado: todas las
-- filas de la familia pasan a "hace falta una", que es justo lo que dicen hoy.

alter table public.list_items
  add column if not exists quantity int not null default 1;

-- El tope no es capricho. Sin él, un dedo apoyado en el botón de más deja un
-- número absurdo, y la fila lo tiene que pintar: 99 sobra para una casa.
alter table public.list_items
  drop constraint if exists list_items_quantity_valida;
alter table public.list_items
  add constraint list_items_quantity_valida check (quantity between 1 and 99);
