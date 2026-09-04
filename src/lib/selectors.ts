import { extractDate, getLocalDateString, isSameLocalDay, parseLocalDate } from './date-utils'
import { eventCoversDay, isAbsence, isBirthday, isDigestPlan } from './events'
import { DIAS_AVISO_CADUCIDAD, DIAS_VALIDEZ_INVITACION, DOC_CATEGORIES, MEAL_SLOTS, TASK_PRIORITIES } from './constants'
import { normalizaParaBuscar } from './text'
import type { DocCategory, Document, Event, MealPlan, MealSlot, Note, Task, TaskPriority, ListItem, List, PendingItem, ItemMatch } from '@/types'

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
 * Qué cestas tienen algo pendiente, con su icono y **con lo suyo dentro**. En
 * Inicio, plegado, no hace falta ver los ítems uno a uno —para eso está la
 * pantalla de listas—, sino saber dónde queda algo por hacer; desplegado, cada
 * cesta enseña sus ítems bajo su nombre.
 *
 * Cada ítem va **en su cesta y no en una lista corrida** (04-09-2026). Iban
 * todos seguidos con el nombre de su lista repetido debajo de cada uno, así que
 * la compra y la farmacia se leían como una sola cosa y el nombre de la lista
 * salía tantas veces como ítems tuviera.
 *
 * Sin cuenta: el número decía poco (que falten dos cosas o siete no cambia lo
 * que haces) y pegado al nombre se leía como parte de él, "Casa 2".
 *
 * Por orden alfabético: la cesta se busca por su nombre, y un orden que baila
 * cada vez que se marca algo obliga a releerlas todas. Dentro manda el orden en
 * el que llegan, que es el de la lista.
 */
export function selectPendingItemsByList(
  items: PendingItem[],
): { id: string; name: string; emoji: string | null; items: PendingItem[] }[] {
  const porLista = new Map<string, { id: string; name: string; emoji: string | null; items: PendingItem[] }>()

  for (const item of items) {
    const cesta = porLista.get(item.list_id)
    if (cesta) cesta.items.push(item)
    else porLista.set(item.list_id, { id: item.list_id, name: item.list_name, emoji: item.list_emoji, items: [item] })
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
 * Las **ausencias** —vacaciones y descansos— que asoman en el tramo que se está
 * mirando, ordenadas por fecha de inicio. Alimentan el bloque "Vacaciones y
 * descansos" del calendario, que es donde se dice de quién son y hasta cuándo:
 * el tinte del día avisa de que hay alguien fuera, pero no de quién.
 *
 * Antes solo devolvía vacaciones (`selectVisibleVacations`) y los descansos no
 * tenían bloque: acababan como una fila más de la agenda, repetida en cada día
 * de su rango. Las dos cosas contestan lo mismo —quién no está disponible—, así
 * que van juntas.
 *
 * Solapan si empiezan antes de que acabe el tramo y acaban después de que
 * empiece: unas vacaciones de agosto entero salen también mirando la semana
 * del 10, aunque ni empiecen ni acaben en ella.
 */
export function selectVisibleAbsences(events: Event[], desde: string, hasta: string): Event[] {
  return events
    .filter(isAbsence)
    .filter(v => {
      const inicio = extractDate(v.start_at)
      const fin = v.end_at ? extractDate(v.end_at) : inicio
      return inicio <= hasta && fin >= desde
    })
    .sort((a, b) => extractDate(a.start_at).localeCompare(extractDate(b.start_at)))
}

/**
 * Los cumpleaños apuntados que caen en el tramo que se está mirando, por fecha.
 *
 * Alimentan el bloque "Cumpleaños" del calendario, que es **el único sitio del
 * calendario donde salen** (28-08-2026). Un cumpleaños se apunta una vez y se
 * repite veinte años, así que una casa con cuatro abuelos y tres amigos del cole
 * metía siete filas fijas en la rejilla y en la agenda que no son nada que
 * hacer. En un bloque aparte se ven todos de un vistazo y no le quitan sitio a
 * lo que sí hay que hacer ese día.
 *
 * Un cumpleaños dura un día, así que aquí no hay solape que mirar como en
 * `selectVisibleAbsences`: o cae dentro o no.
 */
export function selectVisibleBirthdays(events: Event[], desde: string, hasta: string): Event[] {
  return events
    .filter(isBirthday)
    .filter(e => {
      const fecha = extractDate(e.start_at)
      return fecha >= desde && fecha <= hasta
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
  // Solo planes. Las vacaciones, los descansos y los festivos duran días o
  // semanas y saldrían aquí todas las mañanas como si fueran un plan del día.
  // Su sitio es el calendario.
  return events.filter(e => isDigestPlan(e) && eventCoversDay(e, today))
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
      if (!isDigestPlan(e)) return false
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
 * Si una invitación que sigue en «pendiente» ya no sirve para entrar.
 *
 * La decisión no se toma aquí: la toma `accept_family_invite` en la base, que es
 * la única que deja entrar a alguien. Esto solo es lo que hace que Ajustes no
 * mienta — una invitación de hace dos meses seguía luciendo «Pendiente», y quien
 * la mandó esperaba a alguien que ya no podía llegar. Sabiéndolo, el admin
 * cancela y vuelve a invitar, que cuesta un botón.
 *
 * `created_at` viene con hora (es un `timestamptz`), así que se compara por el
 * día y no por el instante: al que la mandó no le interesa si caducó a las nueve
 * o a las once.
 */
export function invitacionCaducada(
  createdAt: string | null | undefined,
  today = getLocalDateString(),
): boolean {
  // Sin fecha legible se dice que **no** ha caducado, y no es pereza: es la única
  // respuesta honesta cuando no se sabe. Llamar «caducada» a una invitación
  // recién enviada porque su fecha no se pudo leer haría que el admin la
  // cancelara para nada. Y evita el reventón: una fila guardada en `localStorage`
  // por una versión vieja del mock puede no traer `created_at`, y esto se pinta
  // dentro de un componente.
  if (!createdAt) return false
  const desde = parseLocalDate(createdAt.slice(0, 10))
  if (Number.isNaN(desde.getTime())) return false

  const dias = Math.round((parseLocalDate(today).getTime() - desde.getTime()) / 86_400_000)
  return dias > DIAS_VALIDEZ_INVITACION
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
 * La categoría con la que cuenta un documento. Sin categoría es «Otros», igual
 * que en su tarjeta: el papel está guardado en algún sitio, y ese sitio se
 * llama Otros.
 */
export function docCategoryOf(doc: Document): DocCategory {
  return doc.category ?? 'otros'
}

/**
 * Qué categorías se ofrecen como filtro en Documentos: **solo las que tienen
 * algún papel dentro**, en el orden del catálogo.
 *
 * Las once existen siempre al guardar un documento, pero enseñarlas todas como
 * filtro era ofrecer once puertas de las que la mitad daban a una pantalla
 * vacía. Y con un icono cada una, la tira se leía como un muro antes de llegar
 * al primer documento: cuatro filas a 390 px, y en escritorio once en una fila
 * con «Otros» colgando solo en la segunda.
 *
 * Es lo contrario de esconder contenido —lo que en esta app ha salido mal cada
 * vez—: una categoría vacía no es contenido, es un filtro muerto. Y la tira
 * crece sola a medida que la familia guarda papeles de más clases.
 *
 * `activa` se mantiene aunque se quede sin documentos: si borras el último
 * mientras la estás mirando, la pastilla no puede desaparecer bajo el dedo y
 * dejar la pantalla vacía sin decir por qué.
 */
export function selectDocCategoryFilters(
  documents: Document[],
  activa: DocCategory | null = null,
): { key: DocCategory; label: string }[] {
  const conAlgo = new Set(documents.map(docCategoryOf))
  if (activa) conAlgo.add(activa)
  return DOC_CATEGORIES.filter(c => conAlgo.has(c.key))
}

/**
 * Las notas en el orden en que se leen: las fijadas primero y, dentro de cada
 * grupo, lo tocado hace menos.
 *
 * Ordenar solo por fecha no vale y por eso existe `pinned`: la clave del wifi se
 * consulta todo el año y no se edita nunca, así que cualquier nota escrita ayer
 * la hundiría. Es el mismo orden que ya tiene el índice de la tabla, para que la
 * pantalla y la base no discrepen.
 */
export function selectSortedNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updated_at.localeCompare(a.updated_at)
  })
}

/**
 * Busca texto libre en las notas: título y cuerpo. Aquí la búsqueda pesa más que
 * en ningún otro sitio —una nota no tiene fecha ni persona por la que filtrar, y
 * es lo único que la encuentra cuando pasan seis meses.
 */
export function selectNoteMatches(notes: Note[], query: string): Note[] {
  const consulta = normalizaParaBuscar(query.trim())
  if (!consulta) return notes
  return notes.filter(n =>
    normalizaParaBuscar(`${n.title} ${n.body ?? ''}`).includes(consulta)
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

/**
 * Qué hay dentro de una familia, dicho en palabras: "3 personas, 12 eventos y 2
 * documentos". Se usa al cerrarla, que es lo único irreversible de Ajustes: el
 * aviso dice lo que se lleva por delante en vez de un genérico "se borrará todo".
 *
 * Devuelve `null` si no hay nada, para que quien lo pinta pueda decir otra cosa
 * —una familia recién creada y vacía no necesita que le enumeren el vacío—.
 */
export function selectFamilySummary(counts: {
  personas: number
  eventos: number
  tareas: number
  listas: number
  comidas: number
  documentos: number
}): string | null {
  const partes: [number, string, string][] = [
    [counts.personas,   'persona',   'personas'],
    [counts.eventos,    'evento',    'eventos'],
    [counts.tareas,     'tarea',     'tareas'],
    [counts.listas,     'lista',     'listas'],
    [counts.comidas,    'comida',    'comidas'],
    [counts.documentos, 'documento', 'documentos'],
  ]

  const textos = partes
    .filter(([n]) => n > 0)
    .map(([n, uno, varios]) => `${n} ${n === 1 ? uno : varios}`)

  if (textos.length === 0) return null
  if (textos.length === 1) return textos[0]
  return `${textos.slice(0, -1).join(', ')} y ${textos[textos.length - 1]}`
}
