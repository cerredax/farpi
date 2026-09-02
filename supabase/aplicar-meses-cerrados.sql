-- ============================================================================
-- Farpi · Los meses cerrados (02-09-2026)
-- ============================================================================
--
-- Aplicar entero, de una vez, en el SQL Editor del proyecto real. Es lo mismo
-- que ya está en `supabase/schema.sql`, extraído para no reaplicar el esquema
-- completo.
--
-- Todo es idempotente salvo por un matiz que importa: el relleno del final
-- **solo es correcto mientras la plantilla siga siendo la que valía en los meses
-- que rellena**. Hoy lo es —Finanzas nació el 31-08-2026 y los fijos el
-- 01-09-2026, y nada ha cambiado desde entonces—. Si esto se queda sin aplicar
-- semanas y para entonces has tocado un fijo, borra el bloque 6 y avísame.
-- ============================================================================


-- ── 1. Las dos tablas ───────────────────────────────────────────────────────

-- El plan de un mes que ya terminó: la foto de la plantilla el día que se cerró.
--
-- **Por qué existe.** `fixed_entries` y `budgets` son el **mes tipo**: cómo suele
-- ser un mes en esta casa. Son una cifra que vale hasta que se cambie, así que
-- por sí solas no saben contar el pasado: subir el alquiler de 800 a 850 en marzo
-- hacía que enero también dijera 850. Hasta el 02-09-2026 eso era una
-- contrapartida asumida; dejó de serlo en cuanto la pregunta pasó a ser «¿cómo
-- fue enero?» y no solo «¿cómo va este mes?».
--
-- **La regla, entera.** El mes en curso es **espejo** de la plantilla: se cambia
-- un fijo y se ve al momento, que es lo que hace falta cuando te acabas de
-- equivocar al darlo de alta o cuando montas la app a mitad de mes. El mes que
-- termina se queda con una **copia congelada**, y a partir de ahí nada de lo que
-- se toque en la plantilla lo mueve.
--
-- **Nadie cierra nada a mano.** Lo hace la RPC `close_previous_month`, que es
-- idempotente y la llaman dos sitios: el cron diario y la propia app al arrancar
-- si ve que el mes pasado no está cerrado. Un botón de «cerrar el mes» sería
-- exactamente la tarea administrativa que esta app existe para no pedir.
--
-- Son dos tablas y no una porque hace falta distinguir «este mes se cerró y no
-- había nada» de «este mes no se ha cerrado». Con solo las líneas, las dos cosas
-- son cero filas.
create table if not exists public.month_plans (
  family_id uuid not null references public.families(id) on delete cascade,
  -- `YYYY-MM`, texto y no `date`. Un mes no es un día, y guardarlo como el día 1
  -- invita a que alguien lo compare con una fecha de gasto y se lleve un susto
  -- con los husos horarios. Es la misma razón por la que `mesDe()` corta la
  -- cadena en vez de pasar por `Date`.
  month     text not null,
  closed_at timestamptz not null default now(),
  primary key (family_id, month),
  constraint month_plans_mes_valido check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

-- Cada línea de esa foto: los fijos tal y como estaban y las partidas con su
-- límite. Se copian **el nombre y el emoji**, no solo el importe: si en abril se
-- borra la partida «Coche», enero tiene que seguir diciendo «Coche 150 €» y no un
-- hueco. Por eso `budget_id` es `on delete set null` y no `cascade` — el enlace
-- sirve para casar los gastos con su barra mientras la partida exista, pero la
-- línea vive sin él.
create table if not exists public.month_plan_lines (
  id           uuid primary key default uuid_generate_v4(),
  family_id    uuid not null references public.families(id) on delete cascade,
  month        text not null,
  -- 'ingreso' y 'gasto' son fijos; 'partida' es un límite de gasto al mes.
  line         text not null,
  budget_id    uuid references public.budgets(id) on delete set null,
  name         text not null,
  emoji        text,
  -- El importe del fijo, o el límite de la partida. Siempre positivo: el signo lo
  -- pone `line`, igual que `kind` en `expenses`.
  amount_cents integer not null,
  child_id     uuid references public.children(id) on delete set null,
  member_id    uuid references public.family_members(id) on delete set null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  constraint month_plan_lines_del_plan foreign key (family_id, month)
    references public.month_plans(family_id, month) on delete cascade,
  constraint month_plan_lines_importe_valido check (amount_cents between 1 and 100000000),
  constraint month_plan_lines_tipo_valido check (line in ('ingreso', 'gasto', 'partida')),
  constraint month_plan_lines_una_sola_asignacion check (child_id is null or member_id is null),
  -- Una partida congelada sin `budget_id` es legítima —la borraron después—, pero
  -- un fijo nunca lleva uno: no cuelga de ninguna partida, igual que en la
  -- plantilla `fixed_entries` no tiene la columna.
  constraint month_plan_lines_fijo_sin_partida check (line = 'partida' or budget_id is null)
);


-- ── 2. El índice ────────────────────────────────────────────────────────────

-- El plan de un mes se lee entero y de golpe, siempre por familia y mes.
create index if not exists month_plan_lines_mes_idx  on public.month_plan_lines(family_id, month, sort_order);


-- ── 3. RLS ──────────────────────────────────────────────────────────────────

alter table public.month_plans        enable row level security;
alter table public.month_plan_lines   enable row level security;


-- ── 4. Las policies (solo lectura) ──────────────────────────────────────────

-- Los meses cerrados **se leen y no se escriben**. Es la única pareja de tablas
-- de contenido con policy de solo `select`, y es a propósito: lo que hace que un
-- mes cerrado signifique algo es que nadie pueda reescribirlo desde la app, ni
-- por error ni a mano. Quien lo escribe es `close_previous_month`, que es
-- `security definer` y pasa por encima de esto.
drop policy if exists "Miembros leen los meses cerrados de su familia" on public.month_plans;
create policy "Miembros leen los meses cerrados de su familia"
  on public.month_plans for select
  using (family_id in (select public.my_family_ids()));

drop policy if exists "Miembros leen las lineas de los meses cerrados de su familia" on public.month_plan_lines;
create policy "Miembros leen las lineas de los meses cerrados de su familia"
  on public.month_plan_lines for select
  using (family_id in (select public.my_family_ids()));


-- ── 5. Las dos funciones ────────────────────────────────────────────────────

-- Cierra un mes copiando la plantilla tal y como está ahora mismo.
--
-- **Idempotente y sin devolver error si ya estaba cerrado**, porque la llaman dos
-- sitios que no se coordinan: el cron diario y la app al arrancar. El `insert ...
-- on conflict do nothing` es lo que resuelve la carrera entre dos móviles de la
-- misma casa abriendo la app el día 1 a la vez, y el `row_count` de después es lo
-- que evita duplicar las líneas.
--
-- `security definer` porque las dos tablas no tienen policy de escritura para
-- nadie: es justo lo que hace que un mes cerrado se pueda dar por bueno. Y **no
-- comprueba la familia**, así que su `execute` se revoca ahí abajo: quien la llama
-- desde la app es `close_previous_month`, que sí la comprueba, y desde el cron el
-- service role, que ya pasa por encima de todo. Sin ese `revoke` cualquiera podría
-- cerrarle el mes a cualquier familia, porque Postgres concede `execute` a
-- `public` por defecto en cada función nueva.
create or replace function public.close_month(p_family_id uuid, p_month text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filas integer;
begin
  if p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'close_month: el mes tiene que ser YYYY-MM, y llegó %', p_month;
  end if;

  -- Solo se cierran meses **terminados**. El mes en curso es espejo de la
  -- plantilla a propósito, y congelarlo antes de tiempo dejaría a quien monta la
  -- app a mitad de mes con una foto vacía que ya no se puede rellenar.
  --
  -- La zona horaria va escrita aquí y no leída de ninguna parte, igual que en el
  -- cron: la familia vive en España y un mes se acaba cuando se acaba en su
  -- calendario, no en UTC. En UTC, el 1 de marzo a las 00:30 en Madrid todavía
  -- sería febrero y el cierre se saltaría un día.
  if p_month >= to_char(now() at time zone 'Europe/Madrid', 'YYYY-MM') then
    return false;
  end if;

  insert into public.month_plans (family_id, month)
  values (p_family_id, p_month)
  on conflict (family_id, month) do nothing;

  get diagnostics v_filas = row_count;
  if v_filas = 0 then
    return false;  -- ya estaba cerrado; no se toca nada
  end if;

  insert into public.month_plan_lines
    (family_id, month, line, name, emoji, amount_cents, child_id, member_id, sort_order)
  select f.family_id, p_month, f.kind, f.name, f.emoji, f.amount_cents,
         f.child_id, f.member_id, f.sort_order
  from public.fixed_entries f
  where f.family_id = p_family_id;

  insert into public.month_plan_lines
    (family_id, month, line, budget_id, name, emoji, amount_cents, sort_order)
  select b.family_id, p_month, 'partida', b.id, b.name, b.emoji, b.monthly_limit_cents,
         b.sort_order
  from public.budgets b
  where b.family_id = p_family_id;

  return true;
end;
$$;

revoke all on function public.close_month(uuid, text) from public;
revoke all on function public.close_month(uuid, text) from anon;
revoke all on function public.close_month(uuid, text) from authenticated;
-- Y devuelta a quien sí la llama por su nombre: el cron, con el service role. El
-- `revoke` de arriba se lleva por delante la concesión implícita a `public`, que
-- es de donde la tenía, así que sin esta línea el cron dejaría de poder cerrar
-- meses y solo se notaría un mes después.
grant execute on function public.close_month(uuid, text) to service_role;

-- El mes que acaba de terminar, para una familia del que llama. Es la que usa la
-- app: nadie tiene que saber calcular «el mes pasado» en dos sitios.
--
-- **Solo cierra el mes anterior, nunca más atrás.** Si el cron estuvo caído tres
-- meses, copiar la plantilla de hoy en enero escribiría en enero unos números que
-- puede que en enero no fueran esos. Un mes sin cerrar se ve y se puede arreglar;
-- un mes cerrado con datos inventados, no.
create or replace function public.close_previous_month(p_family_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mes text;
begin
  if p_family_id not in (select public.my_family_ids()) then
    raise exception 'Acceso denegado: no perteneces a esa familia';
  end if;

  v_mes := to_char(
    (date_trunc('month', now() at time zone 'Europe/Madrid') - interval '1 month'),
    'YYYY-MM'
  );

  return public.close_month(p_family_id, v_mes);
end;
$$;

grant execute on function public.close_previous_month(uuid) to authenticated;


-- ── 6. Relleno de una sola vez ──────────────────────────────────────────────
-- ============================================================================
-- Relleno de los meses que ya habían pasado (02-09-2026)
-- ============================================================================
--
-- Se ejecuta **una sola vez**, el día que se aplica todo esto. Cierra con la
-- plantilla de hoy todos los meses terminados que tengan algún apunte, y hoy eso
-- es correcto porque la plantilla no ha cambiado desde que se puso: Finanzas
-- nació el 31-08-2026 y los fijos el 01-09-2026. Hecho un mes más tarde, esta
-- misma sentencia habría escrito números inventados.
--
-- Es idempotente por el `on conflict` de `close_month`, así que volver a lanzarla
-- no duplica nada.
do $$
declare
  r record;
begin
  for r in
    select distinct family_id, to_char(date, 'YYYY-MM') as mes
    from public.expenses
  loop
    perform public.close_month(r.family_id, r.mes);
  end loop;
end;
$$;


-- ── 7. Comprobación ─────────────────────────────────────────────────────────
--
-- Qué meses han quedado cerrados y con cuántas líneas cada uno. No cambia nada.
select p.month,
       count(l.id) filter (where l.line in ('ingreso', 'gasto')) as fijos,
       count(l.id) filter (where l.line = 'partida')             as partidas,
       p.closed_at
from public.month_plans p
left join public.month_plan_lines l on l.family_id = p.family_id and l.month = p.month
group by p.family_id, p.month, p.closed_at
order by p.month desc;
