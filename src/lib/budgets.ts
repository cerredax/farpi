import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
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
 * El mes en tres letras: `jun`, `sep`. Lo que cabe bajo una barra a 390 px y en un
 * chip de la tira de meses.
 *
 * Vive aquí y no en cada pantalla porque lo usan dos —el gráfico del resumen y el
 * selector— y tienen que decir lo mismo, y porque los doce miden igual: eso es lo
 * que deja alinearlos sin medir ninguno, y su test lo vigila.
 *
 * El `replace` es una red: **esta versión de date-fns no pone punto en ninguno de
 * los doce**, pero otras locales suyas abrevian «sept.» y un punto suelto a 10 px
 * es ruido que además roba una letra de mes.
 */
export function mesCorto(mes: string): string {
  return format(parseISO(`${mes}-01`), 'LLL', { locale: es }).replace('.', '')
}

/**
 * Cuántos meses por delante del de hoy se ofrecen siempre, aunque estén vacíos.
 *
 * Tres es el horizonte real de «lo que sé que me va a llegar» en una casa: el
 * seguro que vence, la matrícula, el IBI. Más allá la tira se llena de meses en
 * los que no hay nada y se convierte en un calendario, que es otra pantalla.
 */
const MESES_POR_DELANTE = 3

/**
 * Qué meses se ofrecen para moverse por Finanzas, del más viejo al más nuevo.
 *
 * Sustituye a las dos flechas (04-09-2026). Con ellas se llegaba a cualquier mes
 * y a ninguno de un toque: ir a junio desde septiembre eran tres, y por el camino
 * no se veía dónde estabas ni dónde había algo que mirar. Una lista finita se
 * puede enseñar entera, y para eso hay que decidir dónde empieza y dónde acaba.
 *
 * **Por detrás llega hasta donde haya algo** —el primer mes con plan guardado o
 * con un apunte— y nunca más allá: los meses anteriores a que la familia empezara
 * a usar la app no tienen nada que contar, y ofrecerlos sería ofrecer el infinito.
 *
 * **Por delante, tres meses fijos y los que hagan falta.** Los tres son para poder
 * apuntar lo que ya sabes que llega; el «los que hagan falta» es lo que impide que
 * un apunte con fecha de marzo se quede en un mes al que no se puede llegar. La
 * regla vale para los dos lados: **un mes que tiene algo siempre está en la lista**.
 *
 * `mesMirado` es el que se está viendo, y entra en la lista aunque se haya quedado
 * sin nada. Cubre un solo camino y conviene que lo cubra: estando en marzo porque
 * allí había un apunte, borrarlo encogería el rango y dejaría la tira **sin ningún
 * mes marcado**, mirando un mes que ya no ofrece. No es un callejón —el mes de hoy
 * sigue en la tira— pero es de las cosas que luego cuesta entender.
 *
 * Pura y sin reloj: `mesActual` entra por argumento, como en el resto del archivo.
 */
export function mesesNavegables(
  mesActual: string,
  planes: MonthPlan[],
  expenses: Expense[],
  mesMirado?: string,
): string[] {
  const conAlgo = [
    ...planes.map(p => p.month),
    ...expenses.map(e => mesDe(e.date)),
    ...(mesMirado ? [mesMirado] : []),
  ]

  let desde = mesActual
  let hasta = mesActual
  for (let i = 0; i < MESES_POR_DELANTE; i++) hasta = mesVecino(hasta, 1)

  // Comparar `YYYY-MM` como cadenas ordena igual que por fecha, que es la razón
  // de que el mes se guarde en ese formato en toda la app.
  for (const mes of conAlgo) {
    if (mes < desde) desde = mes
    if (mes > hasta) hasta = mes
  }

  const meses: string[] = []
  for (let cursor = desde; cursor <= hasta; cursor = mesVecino(cursor, 1)) meses.push(cursor)
  return meses
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
// `budgets` son **la plantilla**: cómo suele ser un mes en esta casa, una cifra
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
 * - `plantilla` — el mes en curso, todavía sin cerrar: espejo de lo que hay
 *   puesto ahora mismo. Se cambia un fijo y se ve al momento.
 * - `copia` — un mes con su foto ya guardada. Normalmente uno que terminó, pero
 *   también el mes en curso si se cerró a mano antes de tiempo.
 * - `sin-plan` — un mes terminado que nunca llegó a cerrarse. No se inventa nada:
 *   la pantalla lo dice. Enseñar la plantilla de hoy sería exactamente el error
 *   que este cambio vino a arreglar.
 * - `por-venir` — un mes que aún no ha empezado. **Sale en cero**, porque en un
 *   mes que no ha llegado no ha pasado nada; lo que quedaría con la plantilla de
 *   hoy se pide aparte (`conPrevision`) y se enseña como lo que es, una
 *   previsión. Se separó de `plantilla` el 02-09-2026, porque un octubre con
 *   «quedan 2.194 €» y un botón de apuntar invitaba a meterle gastos a un mes
 *   que no ha llegado; el 03-09-2026 dejó además de enseñar la previsión de
 *   entrada, porque una cifra en el sitio donde el resto de los meses llevan un
 *   saldo se lee como un saldo por mucho que debajo diga que no lo es.
 */
export type OrigenDelMes = 'plantilla' | 'copia' | 'sin-plan' | 'por-venir'

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
 * Si algo de la plantilla **ya existía antes de que el mes terminara**.
 *
 * Es la guarda contra los meses inventados (03-09-2026). Al cerrar un mes se
 * copia la plantilla, y una plantilla que se puso después de que ese mes acabara
 * nunca estuvo en él: agosto se cerró el 1 de septiembre con unas nóminas
 * creadas el día 1, así que agosto acabó diciendo que entraron 2.400 € que nadie
 * vio. El esquema ya avisaba del riesgo en el relleno de meses pasados, que solo
 * tocó los que tenían apuntes; el cierre automático no llevaba la cautela.
 *
 * Se compara con el primer día del mes siguiente, así que algo creado a mitad de
 * mes sí cuenta: estuvo en ese mes, aunque fuera media.
 */
export function existiaEnElMes(createdAt: string, mes: string): boolean {
  return createdAt < `${mesVecino(mes, 1)}-01`
}

/**
 * Qué valía en un mes: la plantilla viva si el mes no ha terminado, y la copia
 * congelada si terminó.
 *
 * `mesActual` se pasa desde fuera en vez de leer el reloj aquí dentro. Es una
 * función pura y así se puede probar cualquier mes sin tocar la hora del sistema,
 * que es la misma razón por la que `date-utils.ts` recibe siempre la fecha.
 *
 * `conPrevision` solo pinta en un mes que aún no ha llegado, y por defecto va
 * apagado: octubre sale vacío hasta que alguien pide ver qué quedaría con la
 * plantilla de hoy. Los meses que ya son no lo miran, porque para ellos no hay
 * nada que prever.
 */
export function plantillaDelMes(
  mes: string,
  mesActual: string,
  fixed: FixedEntry[],
  budgets: Budget[],
  planes: MonthPlan[],
  conPrevision = false,
): PlantillaDelMes {
  const plan = planes.find(p => p.month === mes)

  if (!plan) {
    if (mes < mesActual) return { origen: 'sin-plan', fijos: [], partidas: [] }
    if (mes > mesActual && !conPrevision) return { origen: 'por-venir', fijos: [], partidas: [] }
    return {
      // Un mes por venir enseña lo mismo que el de hoy —la plantilla— pero se
      // marca aparte: quien lo mira está viendo una previsión, no un mes.
      origen: mes > mesActual ? 'por-venir' : 'plantilla',
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
  /**
   * Los gastos que cuelgan de la partida ese mes, del más reciente al más
   * antiguo — el mismo orden que «El día a día».
   *
   * Van aquí y no se filtran en la pantalla (03-09-2026) porque es lo mismo que
   * ya hay que recorrer para sumar `gastado`, y porque así la fila que abre una
   * partida enseña exactamente lo que su cifra cuenta: si sale «412 de 350», las
   * líneas de debajo suman 412 y no hay dos maneras de contarlo.
   */
  apuntes: Expense[]
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
  // Por `apuntesDelMes` y no por un `filter` suelto: lo que devuelve va a la
  // pantalla tal cual, así que tiene que salir ya ordenado como la lista del mes.
  const delMes = soloGastos(apuntesDelMes(expenses, mes))
  return plantilla.partidas.map(partida => {
    const apuntes = partida.budgetId === null
      ? []
      : delMes.filter(e => e.budget_id === partida.budgetId)
    const gastado = sumaDe(apuntes)
    const limite = partida.limiteCents
    return {
      partida,
      apuntes,
      gastado,
      restante: limite - gastado,
      porcentaje: Math.min(100, Math.round((gastado / limite) * 100)),
      pasado: gastado > limite,
    }
  })
}

// `gastosSinPartida` vivía aquí y se fue con su único consumidor el 04-09-2026: la
// nota de «El mes» que decía «Hay 3 gastos sin partida: no cuentan para ninguna».
// Lo que contaba sigue estando en `repartoPorPartida`, que junta esos gastos bajo
// «Sin partida» y los cuenta con su porcentaje, que es donde el dato sirve para
// algo. Está en el historial de git si vuelve a hacer falta.

// ─── Lo que dibuja la pestaña «Cómo vamos» ────────────────────────────────────
//
// Cuatro preguntas, cuatro cálculos, todos puros: si el mes en curso va rápido o
// lento, cómo ha ido cada uno de los últimos meses, en qué se ha ido el de uno
// concreto y en qué se reparte lo que entra. Se calculan aquí y no en el
// componente por lo de siempre —así se pueden probar sin navegador— y porque casi
// todos tienen un caso raro que no se ve mirando la pantalla: un mes que nunca se
// cerró, un mes sin nada con que compararse, una partida que no existía el mes
// pasado.

// ─── ¿Cómo va el mes? ─────────────────────────────────────────────────────────

/**
 * Lo gastado **acumulado día a día**, del 1 al último del mes.
 *
 * El array tiene un hueco por día —el índice 0 es el día 1— y cada uno lleva lo
 * que se llevaba gastado al terminar ese día, así que **nunca baja**: es lo que
 * hace que dos meses se puedan comparar por su forma y no por sus picos.
 *
 * Solo gastos. Un ingreso a mitad de mes haría bajar la línea y convertiría «lo
 * que llevas gastado» en un saldo, que es otra pregunta y ya la contesta la
 * tarjeta de «El mes».
 */
export function gastoAcumulado(expenses: Expense[], mes: string): number[] {
  const dias = diasDelMes(mes)
  const porDia = new Array<number>(dias).fill(0)

  for (const gasto of soloGastos(apuntesDelMes(expenses, mes))) {
    // `date` es `YYYY-MM-DD` y el día se corta de la cadena, como en `mesDe`: por
    // aquí pasan fechas de calendario y `new Date()` las movería de día con el
    // huso. Un día fuera de rango no puede pasar —el mes ya está filtrado— pero
    // el `min` deja la función total y no una que revienta con un dato raro.
    const dia = Math.min(Number(gasto.date.slice(8, 10)), dias)
    porDia[dia - 1] += gasto.amount_cents
  }

  let llevado = 0
  return porDia.map(delDia => (llevado += delDia))
}

/** Cuántos días tiene un `YYYY-MM`. El día 0 del siguiente es el último de este. */
export function diasDelMes(mes: string): number {
  const [ano, m] = mes.split('-').map(Number)
  return new Date(ano, m, 0).getDate()
}

/**
 * El ritmo al que **se suele** gastar: la media, día a día, de los meses cerrados.
 *
 * Es la mitad que le da sentido a la otra. Una línea sola dice cuánto llevas y no
 * dice lo único que se quiere saber a día 15, que es si eso es mucho o poco para
 * esta casa; con el ritmo de al lado, la respuesta se ve sin leer una cifra.
 *
 * **Solo meses cerrados**, y por eso pide los planes: un mes a medias arrastraría
 * su media hacia abajo justamente en los días que aún no han pasado, y el mes en
 * curso se compararía con algo que no es un mes entero. Con los meses cortos el
 * último día se repite hasta rellenar los 31, que es lo correcto —en un mes de 30
 * días, «lo que llevabas el 31» es lo que llevabas al acabar—.
 *
 * Devuelve `[]` si no hay ningún mes cerrado con gasto: sin nada con que comparar
 * no hay ritmo, y la pantalla no dibuja el bloque en vez de inventarse una línea.
 */
export function ritmoHabitual(
  planes: MonthPlan[],
  expenses: Expense[],
  mesActual: string,
  dias = 31,
): number[] {
  const cerrados = planes
    .map(p => p.month)
    .filter(mes => mes < mesActual)
    .map(mes => gastoAcumulado(expenses, mes))
    .filter(acumulado => acumulado[acumulado.length - 1] > 0)

  if (cerrados.length === 0) return []

  return Array.from({ length: dias }, (_, i) => {
    const suma = cerrados.reduce(
      // El último día de un mes corto se estira: `Math.min` en vez de un cero, que
      // hundiría la media de febrero los días 29, 30 y 31.
      (total, acumulado) => total + acumulado[Math.min(i, acumulado.length - 1)],
      0,
    )
    return Math.round(suma / cerrados.length)
  })
}

// ─── Lo demás de la pestaña ───────────────────────────────────────────────────

export interface MesDeLaSerie {
  /** `YYYY-MM`. */
  mes: string
  entra: number
  sale: number
  /** `entra - sale`. **Negativo si ese mes se fue de las manos.** */
  queda: number
  origen: OrigenDelMes
}

/**
 * Los últimos `cuantos` meses, del más viejo al más nuevo, que es como se leen de
 * izquierda a derecha.
 *
 * **Los meses sin plan se van fuera, no salen a cero.** Es la diferencia entre
 * «ese mes no gastasteis nada» y «de ese mes no sabemos»: una barra a cero dice lo
 * primero y sería mentira. Un hueco en medio de la serie es más honesto y además
 * se explica solo.
 *
 * `entra` y `sale` llevan los fijos **de ese mes** y lo apuntado a mano. Los fijos
 * salen de la copia congelada si el mes está cerrado, así que la serie cuenta lo
 * que de verdad pasó y no lo que pasaría con la plantilla de hoy. Antes del
 * 02-09-2026 este gráfico no se podía dibujar: todos los meses habrían dicho lo
 * mismo.
 */
export function serieDeMeses(
  mesFinal: string,
  cuantos: number,
  mesActual: string,
  fixed: FixedEntry[],
  budgets: Budget[],
  planes: MonthPlan[],
  expenses: Expense[],
): MesDeLaSerie[] {
  // Se camina hacia atrás de uno en uno y se le da la vuelta al final, en vez de
  // ampliar `mesVecino` a saltos de N: esa función es «el mes de al lado» y darle
  // un entero cualquiera la convierte en aritmética de meses, que es otra cosa.
  const haciaAtras: string[] = []
  let cursor = mesFinal
  for (let i = 0; i < cuantos; i++) {
    haciaAtras.push(cursor)
    cursor = mesVecino(cursor, -1)
  }

  const meses: MesDeLaSerie[] = []

  for (const mes of haciaAtras.reverse()) {
    const plantilla = plantillaDelMes(mes, mesActual, fixed, budgets, planes)
    // Fuera los meses de los que no se puede contar nada: el que nunca se cerró
    // —no se sabe qué había puesto— y el que aún no ha llegado, que solo tendría
    // la previsión de la plantilla y una serie no compara lo que pasó con lo que
    // pasaría. Con `mesFinal` en el mes en curso el segundo no aparece nunca,
    // pero la función es pura y se le puede pedir cualquier tramo.
    if (plantilla.origen === 'sin-plan' || plantilla.origen === 'por-venir') continue

    const cuenta = cuentaDelMes(plantilla, expenses, mes)
    const entra = cuenta.ingresosFijos + cuenta.ingresosApuntados
    const sale = cuenta.gastosFijos + cuenta.gastosApuntados
    meses.push({ mes, entra, sale, queda: entra - sale, origen: plantilla.origen })
  }

  return meses
}

/**
 * Lo que se queda de media al mes, sobre los meses que hay en la serie.
 *
 * Es la frase que contesta «¿cómo van los meses?» sin mirar el gráfico, y por eso
 * va escrita encima de él: seis barras dicen la forma, no la cifra. Sin meses
 * devuelve cero, que es lo único honesto y lo que hace que la pantalla no la
 * escriba.
 *
 * Se redondea al céntimo con `Math.round` y no truncando: media de 100 y 101 son
 * 100,50, y quedarse con 100 escondería medio céntimo por mes sin motivo.
 */
export function mediaQueQueda(serie: MesDeLaSerie[]): number {
  if (serie.length === 0) return 0
  return Math.round(serie.reduce((total, m) => total + m.queda, 0) / serie.length)
}

export interface TrozoDelReparto {
  key: string
  nombre: string
  emoji: string | null
  total: number
  /** De 0 a 100, sobre el gasto total del mes. Para el arco y para el texto. */
  porcentaje: number
  /**
   * Cuánto ha cambiado frente al mes anterior, en por ciento. **`null` cuando no
   * hay con qué comparar**, que es la mitad de los casos y no es lo mismo que cero.
   * Lo rellena `conVariacion`; `repartoPorPartida` siempre lo deja a `null`.
   */
  variacion: number | null
}

/**
 * En qué se ha ido el gasto de un mes, de más a menos.
 *
 * **Lo que no cuelga de ninguna partida entra igual**, como «Sin partida». Es la
 * mitad de lo que gasta una casa y esconderlo dejaría un desglose que no suma el
 * mes: la pregunta es «en qué se va el dinero», no «en qué se va el dinero que
 * supimos clasificar».
 *
 * **Se corta en `maximo` y el resto se junta en «Otras».** No es solo estética:
 * doce filas dejan de ser un gráfico y son una lista, y las últimas serían rayas
 * de dos píxeles que no dicen nada. Seis es lo que cabe leyéndose de un vistazo.
 *
 * Solo gastos: un ingreso no se «va» a ninguna parte.
 */
export function repartoPorPartida(
  plantilla: PlantillaDelMes,
  expenses: Expense[],
  mes: string,
  maximo = 5,
): TrozoDelReparto[] {
  const gastos = soloGastos(apuntesDelMes(expenses, mes))
  const total = sumaDe(gastos)
  if (total === 0) return []

  const trozos: TrozoDelReparto[] = plantilla.partidas
    .map(partida => ({
      key: partida.key,
      nombre: partida.name,
      emoji: partida.emoji,
      total: partida.budgetId === null
        ? 0
        : sumaDe(gastos.filter(g => g.budget_id === partida.budgetId)),
      porcentaje: 0,
      variacion: null,
    }))
    .filter(t => t.total > 0)

  const sinPartida = sumaDe(gastos.filter(g => !g.budget_id))
  if (sinPartida > 0) {
    trozos.push({ key: 'sin-partida', nombre: 'Sin partida', emoji: null, total: sinPartida, porcentaje: 0, variacion: null })
  }

  trozos.sort((a, b) => b.total - a.total)

  const visibles = trozos.slice(0, maximo)
  const resto = trozos.slice(maximo)
  if (resto.length > 0) {
    visibles.push({
      key: 'otras',
      nombre: resto.length === 1 ? resto[0].nombre : 'Otras',
      emoji: resto.length === 1 ? resto[0].emoji : null,
      total: sumaDe2(resto),
      porcentaje: 0,
      variacion: null,
    })
  }

  return visibles.map(t => ({ ...t, porcentaje: Math.round((t.total / total) * 100) }))
}

/** Suma de trozos. `sumaDe` es de `Expense[]` y aquí ya no hay gastos, hay trozos. */
function sumaDe2(trozos: TrozoDelReparto[]): number {
  return trozos.reduce((total, t) => total + t.total, 0)
}

/**
 * El mismo reparto, diciendo **cuánto ha cambiado cada trozo** frente al mes
 * anterior.
 *
 * Es lo que convierte una foto en una señal: «Compra 291 €» no dice nada por sí
 * solo, «Compra 291 €, +18% que en agosto» sí. Va aparte de `repartoPorPartida`
 * porque esa función mira un mes y esta necesita dos, y porque así el cálculo de
 * siempre no se paga cuando no hay con qué comparar.
 *
 * **Se casa por nombre y no por `key`.** Las claves no sobreviven al cambio de
 * mes: la de un mes en curso es el id de la partida y la de un mes cerrado es el
 * id de su línea del plan, así que serían dos claves para la misma compra. El
 * nombre sí viaja —la copia guarda el de entonces— y es además lo que ve quien
 * lee. Renombrar una partida cuesta perder una variación, que es honesto: durante
 * ese mes, «Comida» y «Compra» no son lo mismo para nadie que mire la pantalla.
 *
 * **«Otras» nunca lleva variación.** Agrupa lo que sobra, y lo que sobra no es lo
 * mismo cada mes: compararlo daría un número exacto y sin significado.
 *
 * Y `null` **no es cero**: un trozo que no existía el mes pasado no ha subido un
 * 100 %, es que no había nada de eso. La pantalla no escribe nada en ese caso.
 */
export function conVariacion(
  trozos: TrozoDelReparto[],
  delMesAnterior: TrozoDelReparto[],
): TrozoDelReparto[] {
  return trozos.map(trozo => {
    if (trozo.key === 'otras') return trozo
    const antes = delMesAnterior.find(t => t.key !== 'otras' && t.nombre === trozo.nombre)
    if (!antes || antes.total === 0) return trozo
    return { ...trozo, variacion: Math.round(((trozo.total - antes.total) / antes.total) * 100) }
  })
}

/** Una partida que se pasa de su límite más veces de las que no. */
export interface PartidaQueSePasa {
  nombre: string
  /** En cuántos meses se pasó, de los `de` en los que existió y tuvo límite. */
  veces: number
  de: number
}

/**
 * Las partidas que **se pasan a menudo**, de la que más a la que menos.
 *
 * Es lo único de toda la pestaña que señala algo que se puede arreglar, y por eso
 * está: «la compra se pasó 3 de los últimos 4 meses» no habla del mes, habla de que
 * el límite está mal puesto. Lo que se arregla está en «Lo fijo».
 *
 * **Más de la mitad, y nunca con un solo mes.** Pasarse una vez de dos es un mes
 * raro, no una costumbre, y decirlo sería regañar por una compra grande; con `de`
 * escrito al lado, además, quien lee juzga por su cuenta.
 *
 * Mira los mismos meses que la serie y con la misma regla —la plantilla que valía
 * entonces—, así que un límite que se subió en julio no hace que junio parezca
 * descontrolado. Los meses sin plan no cuentan para el denominador: de ellos no se
 * sabe qué límite había.
 */
export function partidasQueSePasan(
  mesFinal: string,
  cuantos: number,
  mesActual: string,
  fixed: FixedEntry[],
  budgets: Budget[],
  planes: MonthPlan[],
  expenses: Expense[],
): PartidaQueSePasa[] {
  const cuenta = new Map<string, { veces: number; de: number }>()

  let cursor = mesFinal
  for (let i = 0; i < cuantos; i++, cursor = mesVecino(cursor, -1)) {
    const plantilla = plantillaDelMes(cursor, mesActual, fixed, budgets, planes)
    if (plantilla.origen === 'sin-plan' || plantilla.origen === 'por-venir') continue

    for (const resumen of resumenPartidas(plantilla, expenses, cursor)) {
      // Una partida sin límite no se puede pasar de nada, y contarla en el
      // denominador diluiría a las que sí lo tienen.
      if (resumen.partida.limiteCents <= 0) continue
      const previo = cuenta.get(resumen.partida.name) ?? { veces: 0, de: 0 }
      cuenta.set(resumen.partida.name, {
        veces: previo.veces + (resumen.pasado ? 1 : 0),
        de: previo.de + 1,
      })
    }
  }

  return [...cuenta.entries()]
    .map(([nombre, { veces, de }]) => ({ nombre, veces, de }))
    .filter(p => p.de > 1 && p.veces * 2 > p.de)
    .sort((a, b) => (b.veces / b.de) - (a.veces / a.de) || b.veces - a.veces)
}

// ─── En qué se reparte lo que entra ───────────────────────────────────────────

export interface RepartoDeLoQueEntra {
  /** Los ingresos fijos más lo que haya entrado a mano. El denominador. */
  entra: number
  gastosFijos: number
  /** Lo gastado que cuelga de alguna partida del mes. */
  enPartidas: number
  /** Y lo gastado que no cuelga de ninguna. */
  otrosGastos: number
  /** Lo que sobra. **Negativo si el mes se fue de las manos.** */
  queda: number
}

/**
 * En qué se reparte **lo que entra**, no lo que sale.
 *
 * Es la única de las cuatro que cambia el denominador, y en eso está su valor: el
 * resto de la pantalla dice cuánto sale y en qué, y ninguna contesta «¿cuánto de
 * lo que ganamos se lo lleva el alquiler?». Esa proporción no se deduce de las
 * cifras sueltas y es la que no cambia de un mes a otro, así que es la que dice
 * cómo está montada esta casa.
 *
 * Las cuatro partes suman lo que entra por construcción: `queda` es el resto, así
 * que la barra siempre cierra y no hay que cuadrarla en la pantalla.
 *
 * Devuelve `null` si no entra nada: sin denominador no hay proporción, y una barra
 * de porcentajes sobre cero sería un dibujo inventado.
 */
export function repartoDeLoQueEntra(
  plantilla: PlantillaDelMes,
  expenses: Expense[],
  mes: string,
): RepartoDeLoQueEntra | null {
  const delMes = apuntesDelMes(expenses, mes)
  const entra = sumaDeLineas(plantilla.fijos, 'ingreso') + sumaDe(soloIngresos(delMes))
  if (entra === 0) return null

  const gastos = soloGastos(delMes)
  const conPartida = new Set(
    plantilla.partidas.map(p => p.budgetId).filter((id): id is string => id !== null),
  )
  const gastosFijos = sumaDeLineas(plantilla.fijos, 'gasto')
  const enPartidas = sumaDe(gastos.filter(g => g.budget_id && conPartida.has(g.budget_id)))
  const otrosGastos = sumaDe(gastos) - enPartidas

  return {
    entra,
    gastosFijos,
    enPartidas,
    otrosGastos,
    queda: entra - gastosFijos - enPartidas - otrosGastos,
  }
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
