import { resolveAssignee } from './assignees'
import { normalizaParaBuscar } from './text'
import type { Budget, Child, Expense, FamilyMember, FixedEntry, Quote } from '@/types'

/**
 * Lo que la pantalla de Finanzas necesita saber y no está guardado en ninguna
 * fila: cuánto queda del mes, cuánto llevamos de cada tope, quién puso el dinero
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
 * Los movimientos de un mes —gastos e ingresos—, de lo más reciente a lo más
 * antiguo. Van mezclados a propósito: la pregunta que contesta la lista es "¿qué
 * ha pasado este mes?", y partirla en dos obligaría a leer dos veces para saber
 * en qué día se quedó uno.
 */
export function movimientosDelMes(expenses: Expense[], mes: string): Expense[] {
  return expenses
    .filter(e => mesDe(e.date) === mes)
    .sort((a, b) => (a.date === b.date ? b.created_at.localeCompare(a.created_at) : b.date.localeCompare(a.date)))
}

/** Solo lo que sale. Lo que miran los topes y el reparto. */
export function soloGastos(movimientos: Expense[]): Expense[] {
  return movimientos.filter(m => m.kind === 'gasto')
}

/** Solo lo que entra sin ser fijo: una devolución, un trabajo suelto. */
export function soloIngresos(movimientos: Expense[]): Expense[] {
  return movimientos.filter(m => m.kind === 'ingreso')
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
   * Si la familia ha puesto algún fijo. Sin ninguno, `queda` sería el gasto del
   * mes en negativo, que no significa nada, y la pantalla enseña otra cosa.
   */
  hayFijos: boolean
}

/**
 * La cuenta del mes: con cuánto se contaba, qué se ha ido y qué queda.
 *
 * Es el número que esta pantalla existe para dar, y el que no se podía dar antes
 * de que hubiera ingresos: "llevas 180 de 300 en la compra" es una curiosidad;
 * "quedan 758 €" es lo que se pregunta en una casa.
 *
 * Los fijos **no dependen del mes que se mire**: son una cifra que vale hasta
 * que se cambie. Mirar mayo con el alquiler de hoy es la contrapartida asumida
 * de no llevar una fila por concepto y mes.
 */
export function cuentaDelMes(fixed: FixedEntry[], expenses: Expense[], mes: string): CuentaDelMes {
  const ingresosFijos = sumaDeFijos(fixed, 'ingreso')
  const gastosFijos = sumaDeFijos(fixed, 'gasto')
  const delMes = movimientosDelMes(expenses, mes)
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
    hayFijos: fixed.length > 0,
  }
}

// ─── Cómo va cada tope ────────────────────────────────────────────────────────

export interface ResumenTope {
  budget: Budget
  gastado: number
  /** Lo que queda. **Negativo si se ha pasado**, que es el caso que importa. */
  restante: number
  /** De 0 a 100 para pintar la barra. Se recorta arriba: la barra no se sale. */
  porcentaje: number
  pasado: boolean
}

/**
 * Cómo va cada tope este mes.
 *
 * Devuelve **todos** los topes, también los que no tienen ni un gasto: un tope en
 * el que no has gastado nada es justo lo que quieres ver a primeros de mes, y
 * esconderlo hasta el primer gasto haría que la pantalla cambiara de forma sola.
 *
 * Solo mira los **gastos**: un ingreso no cuelga de ningún tope, y si contara,
 * una devolución de 40 € liberaría 40 € de la compra sin que nadie haya dejado
 * de comprar.
 */
export function resumenTopes(
  budgets: Budget[],
  expenses: Expense[],
  mes: string,
): ResumenTope[] {
  const delMes = expenses.filter(e => e.kind === 'gasto' && mesDe(e.date) === mes)
  return [...budgets]
    .sort((a, b) => (a.sort_order === b.sort_order ? a.name.localeCompare(b.name, 'es') : a.sort_order - b.sort_order))
    .map(budget => {
      const gastado = sumaDe(delMes.filter(e => e.budget_id === budget.id))
      const limite = budget.monthly_limit_cents
      return {
        budget,
        gastado,
        restante: limite - gastado,
        porcentaje: Math.min(100, Math.round((gastado / limite) * 100)),
        pasado: gastado > limite,
      }
    })
}

/**
 * Los gastos del mes que no cuelgan de ningún tope. Los ingresos no cuentan:
 * nunca tienen tope y decir que hay "3 movimientos sin tope" cuando dos son
 * nóminas sería una alarma inventada.
 */
export function gastosSinTope(expenses: Expense[], mes: string): Expense[] {
  return soloGastos(movimientosDelMes(expenses, mes)).filter(e => !e.budget_id)
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

  for (const gasto of soloGastos(movimientosDelMes(expenses, mes))) {
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
