import { extractDate, getLocalDateString, isSameLocalDay, parseLocalDate } from './date-utils'
import { eventCoversDay, isVacation } from './events'
import { DIAS_AVISO_CADUCIDAD, MEAL_SLOTS, TASK_PRIORITIES } from './constants'
import { normalizaParaBuscar } from './text'
import type { Document, Event, MealPlan, MealSlot, Task, TaskPriority, ListItem, List, PendingItem, ItemMatch } from '@/types'

const TASK_PRIORITY_WEIGHT = Object.fromEntries(
  TASK_PRIORITIES.map((priority, index) => [priority.value, index])
) as Record<TaskPriority, number>

const MEAL_SLOT_WEIGHT = Object.fromEntries(
  MEAL_SLOTS.map(slot => [slot.key, slot.order])
) as Record<MealSlot, number>

export function selectTodayMeals(meals: MealPlan[], today = getLocalDateString()): MealPlan[] {
  return meals.filter(m => m.date === today)
}

export function selectPendingTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => !t.completed)
}

export function selectTaskGroups(tasks: Task[], today = getLocalDateString()): { pending: Task[]; completed: Task[] } {
  const pending: Task[] = []
  const completed: Task[] = []

  for (const task of tasks) {
    if (task.completed) completed.push(task)
    else pending.push(task)
  }

  pending.sort((a, b) => {
    const aOverdue = a.due_date ? a.due_date < today : false
    const bOverdue = b.due_date ? b.due_date < today : false
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
    if (!a.due_date && !b.due_date) return TASK_PRIORITY_WEIGHT[a.priority] - TASK_PRIORITY_WEIGHT[b.priority]
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    const dateCompare = a.due_date.localeCompare(b.due_date)
    return dateCompare !== 0 ? dateCompare : TASK_PRIORITY_WEIGHT[a.priority] - TASK_PRIORITY_WEIGHT[b.priority]
  })

  completed.sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))

  return { pending, completed }
}

/**
 * Parte las tareas pendientes en las que reclaman el día de hoy y el resto.
 *
 * Lo vencido cuenta como de hoy: una tarea de ayer sin hacer no es "más
 * adelante", es lo primero. Sin fecha va al resto — está apuntada, pero nadie
 * ha dicho que toque ahora.
 */
export function selectTodayTasks(
  tasks: Task[],
  today = getLocalDateString(),
): { hoy: Task[]; resto: Task[] } {
  const hoy: Task[] = []
  const resto: Task[] = []

  for (const task of tasks) {
    if (task.due_date && task.due_date <= today) hoy.push(task)
    else resto.push(task)
  }

  return { hoy, resto }
}

export function selectPendingItems(listItems: ListItem[], lists: List[]): PendingItem[] {
  const listsById = new Map(lists.map(list => [list.id, list]))

  return listItems
    .filter(i => !i.completed)
    .map(i => {
      const list = listsById.get(i.list_id)
      return { ...i, list_name: list?.name ?? '', list_emoji: list?.emoji ?? null }
    })
}

/**
 * Qué cestas tienen algo pendiente, con su icono. En Inicio no hace falta ver
 * los ítems uno a uno —para eso está la pantalla de listas—, sino saber dónde
 * queda algo por hacer.
 *
 * Sin cuenta: el número decía poco (que falten dos cosas o siete no cambia lo
 * que haces) y pegado al nombre se leía como parte de él, "Casa 2".
 *
 * Por orden alfabético: la cesta se busca por su nombre, y un orden que baila
 * cada vez que se marca algo obliga a releerlas todas.
 */
export function selectPendingItemsByList(
  items: PendingItem[],
): { id: string; name: string; emoji: string | null }[] {
  const porLista = new Map<string, { id: string; name: string; emoji: string | null }>()

  for (const item of items) {
    if (!porLista.has(item.list_id)) {
      porLista.set(item.list_id, { id: item.list_id, name: item.list_name, emoji: item.list_emoji })
    }
  }

  return [...porLista.values()].sort((a, b) => compararTexto(a.name, b.name))
}

/**
 * Las listas ordenadas para la pantalla de listas: primero las que tienen algo
 * pendiente, que son las que se abren, y dentro de cada grupo por orden
 * alfabético. Antes mandaba el orden de creación, que solo conoce quien las
 * creó.
 */
export function selectSortedLists(lists: List[], items: ListItem[]): List[] {
  const conPendientes = new Set(items.filter(i => !i.completed).map(i => i.list_id))

  return [...lists].sort((a, b) => {
    const aPend = conPendientes.has(a.id)
    const bPend = conPendientes.has(b.id)
    if (aPend !== bPend) return aPend ? -1 : 1
    return compararTexto(a.name, b.name)
  })
}

/** Orden alfabético en español: ignora tildes y mayúsculas, y la ñ va tras la n. */
function compararTexto(a: string, b: string): number {
  return a.localeCompare(b, 'es', { sensitivity: 'base' })
}

/**
 * Los ítems de una lista, partidos en pendientes y hechos, y cada grupo por
 * orden alfabético. Antes mandaba el orden de creación, que solo tiene sentido
 * para quien los escribió: buscar "leche" en la lista de la compra era recorrer
 * el historial de la familia.
 */
export function selectListItemGroups(items: ListItem[]): { pending: ListItem[]; completed: ListItem[] } {
  const pending: ListItem[] = []
  const completed: ListItem[] = []

  for (const item of items) {
    if (item.completed) completed.push(item)
    else pending.push(item)
  }

  pending.sort((a, b) => compararTexto(a.text, b.text))
  completed.sort((a, b) => compararTexto(a.text, b.text))

  return { pending, completed }
}

/**
 * Busca un texto en los ítems de todas las listas. Sirve para la pregunta
 * "¿en qué lista apunté esto?", que si no obliga a abrirlas una a una.
 *
 * Los pendientes van antes que los ya hechos: buscas para actuar, y lo tachado
 * es historial. Dentro de cada grupo se respeta el orden de la lista.
 */
export function selectItemMatches(listItems: ListItem[], lists: List[], query: string): ItemMatch[] {
  const consulta = normalizaParaBuscar(query.trim())
  if (!consulta) return []

  const listsById = new Map(lists.map(list => [list.id, list]))

  return listItems
    .filter(item => normalizaParaBuscar(item.text).includes(consulta))
    .map(item => {
      const list = listsById.get(item.list_id)
      return { ...item, list_name: list?.name ?? '', list_emoji: list?.emoji ?? null }
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const porLista = compararTexto(a.list_name, b.list_name)
      return porLista !== 0 ? porLista : compararTexto(a.text, b.text)
    })
}

/**
 * Sugerencias sacadas de lo que la familia ya ha escrito antes: platos del menú
 * o ítems de las listas. El "catálogo" no se mantiene a mano, se alimenta solo
 * del historial, así que no hay nada que dar de alta ni que limpiar.
 *
 * Sin consulta devuelve lo más repetido (los habituales); con consulta, lo que
 * coincide. Se agrupa ignorando tildes y mayúsculas para que "Lentejas" y
 * "lentejas" sean el mismo plato, y se muestra la forma escrita más veces.
 */
export function selectSuggestions(values: string[], query: string, limit = 5): string[] {
  const consulta = normalizaParaBuscar(query.trim())

  const porClave = new Map<string, { texto: string; veces: number; formas: Map<string, number> }>()

  for (const value of values) {
    const texto = value.trim()
    if (!texto) continue
    const clave = normalizaParaBuscar(texto)
    if (consulta && !clave.includes(consulta)) continue

    const entrada = porClave.get(clave) ?? { texto, veces: 0, formas: new Map<string, number>() }
    entrada.veces += 1
    const formaVeces = (entrada.formas.get(texto) ?? 0) + 1
    entrada.formas.set(texto, formaVeces)
    // Gana la grafía más usada; a empate, la primera que se vio.
    if (formaVeces > (entrada.formas.get(entrada.texto) ?? 0)) entrada.texto = texto
    porClave.set(clave, entrada)
  }

  // Lo ya escrito entero no se sugiere: no aporta nada teclear lo mismo.
  if (consulta) porClave.delete(consulta)

  return [...porClave.values()]
    .sort((a, b) => (b.veces !== a.veces ? b.veces - a.veces : a.texto.localeCompare(b.texto)))
    .slice(0, limit)
    .map(entrada => entrada.texto)
}

/**
 * Lo que falta en cada lista, por orden alfabético, para adelantarlo en su
 * tarjeta. Antes ahí había una barra de progreso con "2/5", que mide lo hecho:
 * la métrica de un gestor de proyectos, no de una casa. A nadie le importa
 * haber comprado el 40% de la compra; importa qué falta por comprar.
 */
export function selectPendingTextsByList(items: ListItem[]): Map<string, string[]> {
  const porLista = new Map<string, string[]>()

  for (const item of items) {
    if (item.completed) continue
    const textos = porLista.get(item.list_id)
    if (textos) textos.push(item.text)
    else porLista.set(item.list_id, [item.text])
  }

  for (const textos of porLista.values()) textos.sort(compararTexto)

  return porLista
}

/**
 * Las vacaciones que asoman en el tramo que se está mirando, ordenadas por
 * fecha de inicio. Sirven para la leyenda del calendario: la franja de color
 * dice que hay alguien de vacaciones, pero no de quién, y el color solo habla
 * si te lo sabes.
 *
 * Solapan si empiezan antes de que acabe el tramo y acaban después de que
 * empiece: unas vacaciones de agosto entero salen también mirando la semana
 * del 10, aunque ni empiecen ni acaben en ella.
 */
export function selectVisibleVacations(events: Event[], desde: string, hasta: string): Event[] {
  return events
    .filter(isVacation)
    .filter(v => {
      const inicio = extractDate(v.start_at)
      const fin = v.end_at ? extractDate(v.end_at) : inicio
      return inicio <= hasta && fin >= desde
    })
    .sort((a, b) => extractDate(a.start_at).localeCompare(extractDate(b.start_at)))
}

export function selectSortedMeals(meals: MealPlan[]): MealPlan[] {
  return [...meals].sort((a, b) => MEAL_SLOT_WEIGHT[a.slot] - MEAL_SLOT_WEIGHT[b.slot])
}

export function selectMealsByCell(meals: MealPlan[]): Map<string, MealPlan> {
  return new Map(meals.map(meal => [`${meal.date}:${meal.slot}`, meal]))
}

export function selectOccupiedMealSlots(meals: MealPlan[], date?: string): MealSlot[] {
  if (!date) return []
  return meals.filter(meal => meal.date === date).map(meal => meal.slot)
}

export function selectTodayEvents(events: Event[]): Event[] {
  const today = new Date()
  // Sin vacaciones: durarían días o semanas y saldrían aquí todas las mañanas
  // como si fueran un plan del día. Su sitio es el calendario.
  return events.filter(e => !isVacation(e) && eventCoversDay(e, today))
}

/**
 * Lo que viene en los próximos días, sin contar hoy.
 *
 * La ventana existe para que el bloque cumpla su título: antes devolvía los
 * cinco siguientes sin mirar la fecha, así que bajo "Esta semana" podía salir
 * algo de dentro de un mes. Las vacaciones se quedan fuera, como en el resto de
 * la pantalla de inicio: son del calendario.
 */
export function selectUpcomingEvents(events: Event[], limit = 5, dias = 7): Event[] {
  const now = new Date()
  const todayStr = getLocalDateString()
  const hasta = getLocalDateString(new Date(now.getTime() + dias * 86_400_000))

  return events
    .filter(e => {
      if (isVacation(e)) return false
      const d = new Date(e.start_at)
      if (isSameLocalDay(d, now)) return false
      const dia = getLocalDateString(d)
      return dia > todayStr && dia <= hasta
    })
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, limit)
}

/** Qué le pasa a un documento con su fecha de caducidad. `null` = no caduca. */
export type EstadoCaducidad = 'caducado' | 'pronto' | 'vigente'

/**
 * Un papel caducado no avisa por su cuenta: el DNI vale hasta que un día no
 * vale. Esto es lo que convierte la fecha guardada en algo que se ve venir, y
 * lo comparten la tarjeta del documento y el recordatorio diario.
 */
export function selectExpiryState(
  expiresOn: string | null,
  today = getLocalDateString(),
): EstadoCaducidad | null {
  if (!expiresOn) return null
  if (expiresOn < today) return 'caducado'
  // Al mediodía, así que un cambio de hora no convierte 30 días en 29.
  const dias = Math.round(
    (parseLocalDate(expiresOn).getTime() - parseLocalDate(today).getTime()) / 86_400_000
  )
  return dias <= DIAS_AVISO_CADUCIDAD ? 'pronto' : 'vigente'
}

/**
 * Busca texto libre en las tareas: título y notas. Con el tiempo la lista se
 * hace larga y "¿apunté lo del seguro?" solo se contesta a base de scroll.
 */
export function selectTaskMatches(tasks: Task[], query: string): Task[] {
  const consulta = normalizaParaBuscar(query.trim())
  if (!consulta) return tasks
  return tasks.filter(t =>
    normalizaParaBuscar(`${t.title} ${t.notes ?? ''}`).includes(consulta)
  )
}

/**
 * Busca texto libre en los documentos: nombre y descripción. Es la carpeta que
 * más crece y la que menos se mira, así que es donde antes se pierde algo.
 */
export function selectDocumentMatches(documents: Document[], query: string): Document[] {
  const consulta = normalizaParaBuscar(query.trim())
  if (!consulta) return documents
  return documents.filter(d =>
    normalizaParaBuscar(`${d.name} ${d.description ?? ''}`).includes(consulta)
  )
}

/**
 * Busca texto libre en los eventos: título y descripción, en todo el calendario
 * y no solo en el tramo que se está viendo. "¿Cuándo fue la revisión?" es una
 * pregunta sobre el pasado, y el pasado no se pinta.
 */
export function selectEventMatches(events: Event[], query: string): Event[] {
  const consulta = normalizaParaBuscar(query.trim())
  if (!consulta) return []
  return events
    .filter(e => normalizaParaBuscar(`${e.title} ${e.description ?? ''}`).includes(consulta))
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
}
