import { resolveAssignee } from './assignees'
import { normalizaParaBuscar } from './text'
import type {
  Budget, Child, Expense, FamilyMember, FixedEntry, MonthPlan, MovementKind, Quote,
} from '@/types'

/**
 * Lo que la pantalla de Finanzas necesita saber y no está guardado en ninguna
 * fila: cuánto queda del mes, cuánto llevamos de cada partida, quién puso el dinero
 * y cuál de los tres presupuestos de la caldera es el más barato.
 *
 * Todo son funciones puras sobre lo que el store ya tiene en memoria. No hay
 * vistas en la base ni sumas guardadas: una casa tiene decenas de gastos al mes,
 * no millones, y un total precalculado es un número que se queda viejo sin que
 * nadie se entere.
 */

// ─── El mes ───────────────────────────────────────────────────────────────────

/**
 * El mes de una fecha `YYYY-MM-DD`, como `YYYY-MM`.
 *
 * Cortando la cadena y no con `Date`: una fecha de gasto es un día del
 * calendario, no un instante, y pasarla por `Date` la mueve de mes en cuanto hay
 * un huso horario por medio. Es la misma regla que `date-utils.ts`.
 */
export function mesDe(fecha: string): string {
  return fecha.slice(0, 7)
}

/** El mes anterior o el siguiente, sobre `YYYY-MM`. */
export function mesVecino(mes: string, salto: 1 | -1): string {
  const [ano, m] = mes.split('-').map(Number)
  const total = ano * 12 + (m - 1) + salto
  return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`
}

/**
 * Los apuntes de un mes —gastos e ingresos—, de lo más reciente a lo más
 * antiguo. Van mezclados a propósito: la pregunta que contesta la lista es "¿qué
 * ha pasado este mes?", y partirla en dos obligaría a leer dos veces para saber
 * en qué día se quedó uno.
 */
export function apuntesDelMes(expenses: Expense[], mes: string): Expense[] {
  return expenses
    .filter(e => mesDe(e.date) === mes)
    .sort((a, b) => (a.date === b.date ? b.created_at.localeCompare(a.created_at) : b.date.localeCompare(a.date)))
}

/** Solo lo que sale. Lo que miran las partidas y el reparto. */
export function soloGastos(apuntes: Expense[]): Expense[] {
  return apuntes.filter(a => a.kind === 'gasto')
}

/** Solo lo que entra sin ser fijo: una devolución, un trabajo suelto. */
export function soloIngresos(apuntes: Expense[]): Expense[] {
  return apuntes.filter(a => a.kind === 'ingreso')
}

/** Suma de importes. Todos son positivos: el signo lo pone quien los agrupa. */
export function sumaDe(expenses: Expense[]): number {
  return expenses.reduce((total, e) => total + e.amount_cents, 0)
}

// ─── Los fijos y la cuenta del mes ────────────────────────────────────────────

/** Los fijos de un tipo, en el orden en el que se pintan. */
export function fijosDe(fixed: FixedEntry[], kind: FixedEntry['kind']): FixedEntry[] {
  return fixed
    .filter(f => f.kind === kind)
    .sort((a, b) => (a.sort_order === b.sort_order ? a.name.localeCompare(b.name, 'es') : a.sort_order - b.sort_order))
}

export function sumaDeFijos(fixed: FixedEntry[], kind: FixedEntry['kind']): number {
  return fixed.filter(f => f.kind === kind).reduce((total, f) => total + f.amount_cents, 0)
}

// ─── Qué plantilla valía en un mes ────────────────────────────────────────────
//
// La pieza que le da historia a Finanzas (02-09-2026). `fixed_entries` y
// `budgets` son el **mes tipo**: cómo suele ser un mes en esta casa, una cifra
// que vale hasta que se cambie. Por sí solas no saben contar el pasado, porque
// subir el alquiler en marzo hacía que enero también lo dijera.
//
// La regla es de una línea: **si el mes tiene copia, manda la copia; si no y el
// mes no ha terminado, refleja la plantilla.** Todo lo que la pantalla de «El mes»
// necesita saber pasa antes por aquí.
//
// El orden importa y no es el obvio. Se escribió al revés —primero «¿ha terminado
// el mes?»— y no dejaba cerrar un mes antes de tiempo: la copia estaba guardada y
// la pantalla seguía enseñando el espejo. Preguntar por la copia primero es lo que
// hace que cerrar septiembre el día 28 signifique algo.

/** Un fijo tal y como valía en un mes. Viene de la plantilla o de la copia. */
export interface FijoDelMes {
  key: string
  kind: MovementKind
  name: string
  emoji: string | null
  amountCents: number
  childId: string | null
  memberId: string | null
  sortOrder: number
}

/** Una partida tal y como valía en un mes, con el límite que tenía entonces. */
export interface PartidaDelMes {
  /**
   * La partida viva de la que salió, o `null` si se borró después de cerrarse el
   * mes. Es lo que casa los gastos con su barra; el resto de los datos están
   * copiados aquí justamente para que borrarla no deje un hueco en enero.
   */
  budgetId: string | null
  /** Clave estable para React. Cae en el id cuando lo hay. */
  key: string
  name: string
  emoji: string | null
  limiteCents: number
  sortOrder: number
}

/**
 * De dónde salen los números de un mes:
 *
 * - `plantilla` — el mes en curso o uno por venir, todavía sin cerrar: espejo de lo
 *   que hay puesto ahora mismo. Se cambia un fijo y se ve al momento.
 * - `copia` — un mes con su foto ya guardada. Normalmente uno que terminó, pero
 *   también el mes en curso si se cerró a mano antes de tiempo.
 * - `sin-plan` — un mes terminado que nunca llegó a cerrarse. No se inventa nada:
 *   la pantalla lo dice. Enseñar la plantilla de hoy sería exactamente el error
 *   que este cambio vino a arreglar.
 */
export type OrigenDelMes = 'plantilla' | 'copia' | 'sin-plan'

export interface PlantillaDelMes {
  origen: OrigenDelMes
  fijos: FijoDelMes[]
  partidas: PartidaDelMes[]
}

function ordenar<T extends { sortOrder: number; name: string }>(lineas: T[]): T[] {
  return [...lineas].sort((a, b) => (
    a.sortOrder === b.sortOrder ? a.name.localeCompare(b.name, 'es') : a.sortOrder - b.sortOrder
  ))
}

/**
 * Los fijos, primero los que entran y luego los que salen.
 *
 * El `sort_order` **empieza en cero en cada tipo** —las nóminas van 0, 1 y los
 * recibos también 0, 1, 2—, así que ordenar la lista mezclada solo por él
 * interleaba unos con otros y daba «Nómina, Alquiler, Nómina». Partir por `kind`
 * antes es lo que hace que esta lista se lea igual que la pantalla de la
 * plantilla, donde son dos bloques separados.
 */
function ordenarFijos(fijos: FijoDelMes[]): FijoDelMes[] {
  return [
    ...ordenar(fijos.filter(f => f.kind === 'ingreso')),
    ...ordenar(fijos.filter(f => f.kind === 'gasto')),
  ]
}

/**
 * Qué valía en un mes: la plantilla viva si el mes no ha terminado, y la copia
 * congelada si terminó.
 *
 * `mesActual` se pasa desde fuera en vez de leer el reloj aquí dentro. Es una
 * función pura y así se puede probar cualquier mes sin tocar la hora del sistema,
 * que es la misma razón por la que `date-utils.ts` recibe siempre la fecha.
 */
export function plantillaDelMes(
  mes: string,
  mesActual: string,
  fixed: FixedEntry[],
  budgets: Budget[],
  planes: MonthPlan[],
): PlantillaDelMes {
  const plan = planes.find(p => p.month === mes)

  if (!plan) {
    if (mes < mesActual) return { origen: 'sin-plan', fijos: [], partidas: [] }
    return {
      origen: 'plantilla',
      fijos: ordenarFijos(fixed.map(f => ({
        key: f.id,
        kind: f.kind,
        name: f.name,
        emoji: f.emoji,
        amountCents: f.amount_cents,
        childId: f.child_id,
        memberId: f.member_id,
        sortOrder: f.sort_order,
      }))),
      partidas: ordenar(budgets.map(b => ({
        budgetId: b.id,
        key: b.id,
        name: b.name,
        emoji: b.emoji,
        limiteCents: b.monthly_limit_cents,
        sortOrder: b.sort_order,
      }))),
    }
  }

  return {
    origen: 'copia',
    fijos: ordenarFijos(plan.lines.filter(l => l.line !== 'partida').map(l => ({
      key: l.id,
      kind: l.line as MovementKind,
      name: l.name,
      emoji: l.emoji,
      amountCents: l.amount_cents,
      childId: l.child_id,
      memberId: l.member_id,
      sortOrder: l.sort_order,
    }))),
    partidas: ordenar(plan.lines.filter(l => l.line === 'partida').map(l => ({
      budgetId: l.budget_id,
      key: l.id,
      name: l.name,
      emoji: l.emoji,
      limiteCents: l.amount_cents,
      sortOrder: l.sort_order,
    }))),
  }
}

// ─── La cuenta del mes ────────────────────────────────────────────────────────

export interface CuentaDelMes {
  ingresosFijos: number
  gastosFijos: number
  /** Con lo que se cuenta antes de gastar nada: los fijos, restados. */
  paraElMes: number
  /** Lo apuntado a mano este mes, cada cosa por su lado. */
  gastosApuntados: number
  ingresosApuntados: number
  /** Lo que queda. **Negativo si el mes se ha ido de las manos.** */
  queda: number
  /**
   * Si ese mes tenía algún fijo. Sin ninguno, `queda` sería el gasto del mes en
   * negativo, que no significa nada, y la pantalla enseña otra cosa.
   */
  hayFijos: boolean
  /** De dónde salen las cifras de arriba. La pantalla lo dice cuando no es hoy. */
  origen: OrigenDelMes
}

/**
 * La cuenta del mes: con cuánto se contaba, qué se ha ido y qué queda.
 *
 * Es el número que esta pantalla existe para dar, y el que no se podía dar antes
 * de que hubiera ingresos: "llevas 180 de 300 en la compra" es una curiosidad;
 * "quedan 758 €" es lo que se pregunta en una casa.
 *
 * **Los fijos que usa son los de ese mes**, no los de hoy: la plantilla ya viene
 * resuelta en `PlantillaDelMes`. Hasta el 02-09-2026 se leían siempre los de hoy y
 * mirar mayo enseñaba el alquiler de septiembre.
 *
 * En un mes sin plan guardado sale todo a cero y `hayFijos` en false, que es lo
 * que hace que la tarjeta enseñe lo gastado en vez de un "queda" inventado.
 */
export function cuentaDelMes(
  plantilla: PlantillaDelMes,
  expenses: Expense[],
  mes: string,
): CuentaDelMes {
  const ingresosFijos = sumaDeLineas(plantilla.fijos, 'ingreso')
  const gastosFijos = sumaDeLineas(plantilla.fijos, 'gasto')
  const delMes = apuntesDelMes(expenses, mes)
  const gastosApuntados = sumaDe(soloGastos(delMes))
  const ingresosApuntados = sumaDe(soloIngresos(delMes))
  const paraElMes = ingresosFijos - gastosFijos

  return {
    ingresosFijos,
    gastosFijos,
    paraElMes,
    gastosApuntados,
    ingresosApuntados,
    queda: paraElMes + ingresosApuntados - gastosApuntados,
    hayFijos: plantilla.fijos.length > 0,
    origen: plantilla.origen,
  }
}

/** Suma de los fijos de un tipo dentro de la plantilla ya resuelta de un mes. */
export function sumaDeLineas(fijos: FijoDelMes[], kind: MovementKind): number {
  return fijos.filter(f => f.kind === kind).reduce((total, f) => total + f.amountCents, 0)
}

// ─── Cómo va cada partida ─────────────────────────────────────────────────────

export interface ResumenPartida {
  partida: PartidaDelMes
  gastado: number
  /** Lo que queda. **Negativo si se ha pasado**, que es el caso que importa. */
  restante: number
  /** De 0 a 100 para pintar la barra. Se recorta arriba: la barra no se sale. */
  porcentaje: number
  pasado: boolean
}

/**
 * Cómo fue cada partida en un mes, con **el límite que tenía ese mes**.
 *
 * Devuelve **todas** las partidas, también las que no tienen ni un gasto: una
 * partida en la que no has gastado nada es justo lo que quieres ver a primeros de
 * mes, y esconderla hasta el primer gasto haría que la pantalla cambiara de forma
 * sola.
 *
 * Solo mira los **gastos**: un ingreso no cuelga de ninguna partida, y si contara,
 * una devolución de 40 € liberaría 40 € de la compra sin que nadie haya dejado
 * de comprar.
 *
 * En un mes cerrado se casa por `budgetId`, que es lo que la copia guarda. Una
 * partida borrada después de cerrarse el mes llega con `budgetId` a null: sigue
 * enseñando su nombre y su límite, y sus gastos —que también perdieron el
 * `budget_id`— pasan a contarse en «sin partida», que es donde están de verdad.
 */
export function resumenPartidas(
  plantilla: PlantillaDelMes,
  expenses: Expense[],
  mes: string,
): ResumenPartida[] {
  const delMes = expenses.filter(e => e.kind === 'gasto' && mesDe(e.date) === mes)
  return plantilla.partidas.map(partida => {
    const gastado = partida.budgetId === null
      ? 0
      : sumaDe(delMes.filter(e => e.budget_id === partida.budgetId))
    const limite = partida.limiteCents
    return {
      partida,
      gastado,
      restante: limite - gastado,
      porcentaje: Math.min(100, Math.round((gastado / limite) * 100)),
      pasado: gastado > limite,
    }
  })
}

/**
 * Los gastos del mes que no cuelgan de ninguna partida. Los ingresos no cuentan:
 * nunca tienen partida y decir que hay "3 apuntes sin partida" cuando dos son
 * nóminas sería una alarma inventada.
 */
export function gastosSinPartida(expenses: Expense[], mes: string): Expense[] {
  return soloGastos(apuntesDelMes(expenses, mes)).filter(e => !e.budget_id)
}

// ─── Quién puso el dinero ─────────────────────────────────────────────────────

export interface Aportacion {
  key: string
  nombre: string
  color: string | null
  total: number
}

/**
 * Cuánto ha puesto cada uno este mes.
 *
 * Es **quién pagó**, no una cuenta de quién le debe qué a quién. Farpi no lleva
 * saldos entre adultos a propósito: en cuanto una app de casa dice "Sofía te
 * debe 40 €", deja de ser una app de casa. Aquí solo se ve el reparto, y con eso
 * ya se sabe si toca que pague el otro la próxima compra grande.
 *
 * Lo pagado con la cuenta común —los dos ids a null— sale como "De casa", que es
 * el caso normal y no un hueco.
 *
 * **Solo cuenta lo que sale.** Si los ingresos entraran aquí, la línea diría
 * "Carlos 1.710 €" mezclando la nómina con la compra, y dejaría de significar lo
 * único que significa: quién ha ido poniendo el dinero del día a día. Lo que
 * entra se lee en los fijos, que es donde tiene sentido verlo.
 */
export function repartoDelMes(
  expenses: Expense[],
  mes: string,
  members: FamilyMember[],
  kids: Child[],
): Aportacion[] {
  const acumulado = new Map<string, Aportacion>()

  for (const gasto of soloGastos(apuntesDelMes(expenses, mes))) {
    const persona = resolveAssignee(gasto, members, kids)
    const key = persona?.key ?? 'casa'
    const previo = acumulado.get(key)
    if (previo) {
      previo.total += gasto.amount_cents
    } else {
      acumulado.set(key, {
        key,
        nombre: persona?.name ?? 'De casa',
        color: persona?.color ?? null,
        total: gasto.amount_cents,
      })
    }
  }

  return [...acumulado.values()].sort((a, b) => b.total - a.total)
}

// ─── Los presupuestos que te pasan de fuera ───────────────────────────────────

export interface GrupoDePresupuestos {
  /** Para qué es, tal y como se escribió la primera vez. */
  titulo: string
  quotes: Quote[]
  /** El id del más barato del grupo. `null` si solo hay uno: no hay comparación. */
  masBaratoId: string | null
  /** Ya se ha aceptado uno, así que el grupo está decidido. */
  decidido: boolean
}

/**
 * Cómo se comparan dos claves de agrupación. Sin tildes, sin mayúsculas y sin
 * espacios de más: "Cambiar la caldera" y "cambiar la  Caldera" son el mismo
 * trabajo, y que salieran en dos bloques distintos rompería lo único que esta
 * pantalla hace de verdad.
 */
function claveDe(titulo: string): string {
  return normalizaParaBuscar(titulo.trim()).replace(/\s+/g, ' ')
}

/**
 * Los presupuestos pedidos, agrupados por para qué son.
 *
 * Los grupos sin decidir van primero: son los que piden algo de quien mira. Y
 * dentro de cada grupo, de más barato a más caro, porque es el orden en el que
 * se leen tres precios que se están comparando.
 *
 * El más barato solo se marca **si el grupo sigue abierto**. Marcarlo en uno ya
 * decidido sería un reproche —"el que aceptaste no era el barato"— y esa
 * decisión ya está tomada, a veces por buenas razones que la app no sabe.
 */
export function agruparPresupuestos(quotes: Quote[]): GrupoDePresupuestos[] {
  const grupos = new Map<string, GrupoDePresupuestos>()

  for (const quote of quotes) {
    const clave = claveDe(quote.title)
    const grupo = grupos.get(clave)
    if (grupo) grupo.quotes.push(quote)
    else grupos.set(clave, { titulo: quote.title.trim(), quotes: [quote], masBaratoId: null, decidido: false })
  }

  const lista = [...grupos.values()].map(grupo => {
    const quotes = [...grupo.quotes].sort((a, b) => a.amount_cents - b.amount_cents)
    const decidido = quotes.some(q => q.status === 'aceptado')
    const vivos = quotes.filter(q => q.status !== 'descartado')
    return {
      ...grupo,
      quotes,
      decidido,
      masBaratoId: !decidido && vivos.length > 1 ? vivos[0].id : null,
    }
  })

  return lista.sort((a, b) => {
    if (a.decidido !== b.decidido) return a.decidido ? 1 : -1
    return a.titulo.localeCompare(b.titulo, 'es')
  })
}

/** Un precio que ya no vale: tenía fecha y quedó atrás. */
export function estaCaducado(quote: Quote, hoy: string): boolean {
  return quote.valid_until !== null && quote.valid_until < hoy
}

/** Los títulos ya usados, para ofrecerlos al apuntar otro del mismo trabajo. */
export function titulosDePresupuestos(quotes: Quote[]): string[] {
  const vistos = new Map<string, string>()
  for (const q of quotes) {
    const clave = claveDe(q.title)
    if (!vistos.has(clave)) vistos.set(clave, q.title.trim())
  }
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'es'))
}
