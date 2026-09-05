-- ============================================================================
-- Farpi · Ajustes de un fijo en un mes (05-09-2026)
-- ============================================================================
--
-- Aplicar **entero y de una vez** en el SQL Editor del proyecto real. Es lo mismo
-- que ya está en `supabase/schema.sql`, extraído para no reaplicar el esquema
-- completo, igual que `aplicar-meses-cerrados.sql`.
--
-- **Es seguro volver a ejecutarlo tantas veces como haga falta.** Todo es
-- idempotente y **no escribe ni un dato**: crea la tabla nueva, su índice, sus
-- dos triggers y su policy, y vuelve a dejar `close_month_copy` con el
-- `coalesce` que copia el importe ajustado de cada mes.
--
-- Qué resuelve: la limpieza son 120 € al mes y hay meses de 150 y meses de 90.
-- Hasta ahora cambiar eso obligaba a mover la referencia —y con ella todos los
-- meses abiertos— o a apuntar la diferencia en el día a día, que mezcla un recibo
-- con la compra. Ahora la referencia vive en `fixed_entries` y **solo lo que se
-- sale de lo normal** vive aquí. Un mes sin fila vale lo que diga la plantilla.
-- ============================================================================


-- ── 1. La tabla ───────────────────────────────────────────────────────────────

-- Lo que un fijo costó **en un mes concreto**, cuando no fue lo de siempre.
--
-- **Por qué existe** (05-09-2026). La limpieza son 120 € al mes, pero hay meses
-- de 150 y meses de 90. Hasta hoy había dos salidas y ninguna servía: cambiar el
-- fijo reescribe la referencia y con ella todos los meses abiertos —la casa
-- pierde el «esto suele costar 120»—, y apuntar la diferencia en el día a día
-- mezcla un recibo con la compra y deja el desglose de «Gastos fijos» diciendo lo
-- que no fue.
--
-- **Es un ajuste de un mes y no una vigencia.** Poner 150 en septiembre no toca
-- octubre: octubre vuelve solo a los 120. Se descartó la vigencia —«de aquí en
-- adelante»— porque el caso de la casa es el que da nombre a esto: un mes sale
-- más y el siguiente menos, sin que la referencia cambie nunca. Y porque una
-- vigencia obliga a decidir qué pasa hacia atrás, que es una pregunta que aquí no
-- hay que contestar.
--
-- La referencia sigue viviendo en `fixed_entries.amount_cents` y no se mueve: un
-- mes sin fila aquí vale lo que diga la plantilla. Es la misma forma que tienen
-- las excepciones de la recurrencia en `events`: no se copia lo normal, se guarda
-- solo lo que se sale.
--
-- `on delete cascade` desde el fijo: sin el fijo, un ajuste suyo no significa
-- nada. Los meses ya cerrados no se ven afectados, porque copiaron el importe.
create table if not exists public.fixed_entry_overrides (
  id             uuid primary key default uuid_generate_v4(),
  family_id      uuid not null references public.families(id) on delete cascade,
  fixed_entry_id uuid not null references public.fixed_entries(id) on delete cascade,
  -- `YYYY-MM`, texto y no `date`, por lo mismo que en `month_plans`: un mes no es
  -- un día y guardarlo como el día 1 invita a compararlo con una fecha de gasto.
  month          text not null,
  amount_cents   integer not null,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Un fijo tiene un solo importe en un mes. El `unique` es lo que deja que la
  -- pantalla escriba con un `upsert` sin preguntar antes si ya había ajuste.
  constraint fixed_entry_overrides_uno_por_mes unique (fixed_entry_id, month),
  constraint fixed_entry_overrides_mes_valido check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  constraint fixed_entry_overrides_importe_valido check (amount_cents between 1 and 100000000)
);


-- ── 2. Índice ─────────────────────────────────────────────────────────────────

-- Los ajustes de mes se leen enteros y de una vez, para poder resolver cualquier
-- mes sin volver a la base. Son unos pocos por familia y año.
create index if not exists fixed_entry_overrides_family_idx on public.fixed_entry_overrides(family_id, month);


-- ── 3. `updated_at` ───────────────────────────────────────────────────────────

drop trigger if exists set_fixed_entry_overrides_updated_at on public.fixed_entry_overrides;
create trigger set_fixed_entry_overrides_updated_at before update on public.fixed_entry_overrides for each row execute function public.set_updated_at();


-- ── 4. El fijo tiene que ser de la misma familia ──────────────────────────────

-- El ajuste lleva `family_id` propio para que su policy sea barata, y eso abre la
-- puerta a que no case con el del fijo. Es la misma cautela que en los pares de
-- asignación: sin ella, colar un `family_id` ajeno en el insert dejaría una fila
-- que la RLS deja leer a quien no toca.
create or replace function public.check_fixed_entry_override_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.fixed_entries where id = new.fixed_entry_id and family_id = new.family_id
  ) then
    raise exception 'fixed_entry_overrides: fixed_entry_id no pertenece a la misma family_id';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fixed_entry_override_family on public.fixed_entry_overrides;
create trigger trg_fixed_entry_override_family before insert or update on public.fixed_entry_overrides for each row execute function public.check_fixed_entry_override_family();


-- ── 5. RLS ────────────────────────────────────────────────────────────────────

alter table public.fixed_entry_overrides enable row level security;

drop policy if exists "Miembros CRUD ajustes de fijos de su familia" on public.fixed_entry_overrides;
create policy "Miembros CRUD ajustes de fijos de su familia"
  on public.fixed_entry_overrides for all
  using (family_id in (select public.my_family_ids()));


-- ── 6. El cierre copia el importe del mes, no la referencia ───────────────────
--
-- Sin esto, cerrar septiembre deshacía el ajuste sin avisar y la foto contaba lo
-- que no pasó, que es justo lo que el cierre existe para evitar. Es la misma
-- función que ya está en `schema.sql` y en `aplicar-meses-cerrados.sql`, con el
-- `coalesce` y el `left join` dentro.

create or replace function public.close_month_copy(p_family_id uuid, p_month text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filas       integer;
  v_fin         timestamptz;
  v_copiadas    integer;
  v_candidatas  integer;
begin
  if p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'close_month_copy: el mes tiene que ser YYYY-MM, y llegó %', p_month;
  end if;

  -- El primer instante del mes siguiente, en el calendario de la familia. Es la
  -- frontera de «esto ya existía en ese mes» (03-09-2026, ver abajo).
  v_fin := ((to_date(p_month || '-01', 'YYYY-MM-DD') + interval '1 month')
            at time zone 'Europe/Madrid');

  insert into public.month_plans (family_id, month)
  values (p_family_id, p_month)
  on conflict (family_id, month) do nothing;

  get diagnostics v_filas = row_count;
  if v_filas = 0 then
    return false;  -- ya estaba cerrado; no se toca nada
  end if;

  -- **Solo se copia lo que ya existía antes de que el mes terminara**
  -- (03-09-2026). Una plantilla puesta después nunca estuvo en ese mes: agosto
  -- se cerró el 1 de septiembre con unas nóminas creadas ese mismo día 1, y
  -- acabó diciendo que entraron 3.130 € que nadie vio. El relleno de meses
  -- pasados del final de este archivo ya llevaba la cautela —solo tocó los meses
  -- con apuntes—; el cierre automático, no.
  --
  -- **Y el importe que se copia es el de ese mes**, no el de la plantilla
  -- (05-09-2026): si la limpieza se ajustó a 150 € en septiembre, septiembre se
  -- cierra con 150. Sin el `coalesce`, cerrar el mes deshacía el ajuste sin
  -- avisar y la foto contaba lo que no pasó, que es justo lo que el cierre
  -- existe para evitar.
  insert into public.month_plan_lines
    (family_id, month, line, name, emoji, amount_cents, child_id, member_id, sort_order)
  select f.family_id, p_month, f.kind, f.name, f.emoji,
         coalesce(o.amount_cents, f.amount_cents),
         f.child_id, f.member_id, f.sort_order
  from public.fixed_entries f
  left join public.fixed_entry_overrides o
    on o.fixed_entry_id = f.id and o.month = p_month
  where f.family_id = p_family_id
    and f.created_at < v_fin;

  get diagnostics v_copiadas = row_count;

  insert into public.month_plan_lines
    (family_id, month, line, budget_id, name, emoji, amount_cents, sort_order)
  select b.family_id, p_month, 'partida', b.id, b.name, b.emoji, b.monthly_limit_cents,
         b.sort_order
  from public.budgets b
  where b.family_id = p_family_id
    and b.created_at < v_fin;

  get diagnostics v_filas = row_count;
  v_copiadas := v_copiadas + v_filas;

  select count(*) into v_candidatas
  from (
    select 1 from public.fixed_entries where family_id = p_family_id
    union all
    select 1 from public.budgets where family_id = p_family_id
  ) t;

  -- Había plantilla, pero nada de ella estuvo en ese mes: mejor sin cerrar. Un
  -- mes sin plan suma cero y la pantalla lo dice («de este mes no se guardó el
  -- plan»); cerrado con una copia vacía diría «mes cerrado» sobre un mes del que
  -- en realidad no se sabe nada.
  if v_copiadas = 0 and v_candidatas > 0 then
    delete from public.month_plans where family_id = p_family_id and month = p_month;
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.close_month_copy(uuid, text) from public;
revoke all on function public.close_month_copy(uuid, text) from anon;
revoke all on function public.close_month_copy(uuid, text) from authenticated;
