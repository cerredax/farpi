'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as store from './store'
import { mockRepos } from './mock-repos'
import { supabaseRepos } from './supabase-repos'
import { IS_DEMO_MODE } from './supabase/client'
import { mesDe, mesVecino } from './budgets'
import { getLocalDateString } from './date-utils'
import { selectPendingItems, selectPendingTasks, selectTodayMeals } from './selectors'
import { filterMealsBySlots, normalizeMealSlots } from './meal-slots'
import type { Repos } from './repos/types'
import type {
  Budget,
  BudgetDraft,
  Child,
  ChildDraft,
  Document,
  DocumentDraft,
  Event,
  EventDraft,
  Expense,
  ExpenseDraft,
  FixedEntry,
  FixedEntryDraft,
  Family,
  FamilyInvite,
  FamilyMember,
  List,
  ListDraft,
  ListItem,
  ListItemDraft,
  MonthPlan,
  MealDraft,
  MealPlan,
  MealSlot,
  Note,
  NoteDraft,
  PendingItem,
  Quote,
  QuoteDraft,
  QuoteStatus,
  StorageConnection,
  Task,
  TaskDraft,
} from '@/types'

if (typeof window !== 'undefined' && IS_DEMO_MODE) {
  store.loadFromStorage()
}

interface StoreValue {
  isLoading: boolean
  /** Hay una operación de escritura en curso. La UI lo usa para avisar. */
  isSaving: boolean
  error: string | null
  /** Descarta el error mostrado, al cerrarlo el usuario o al reintentar. */
  clearError: () => void
  /**
   * Qué acaba de pasar, si se puede deshacer. `null` si no hay nada que
   * deshacer. La UI lo enseña un momento junto al botón de deshacer.
   */
  undoLabel: string | null
  undo: () => Promise<void>
  clearUndo: () => void
  reload: () => Promise<void>
  activeFamilyId: string
  families: Family[]
  switchFamily: (id: string) => void
  createFamily: (name: string) => Promise<void>
  /** Cierra la familia activa y salta a otra. Falla si es la única. */
  deleteFamily: () => Promise<void>
  family: Family
  members: FamilyMember[]
  /**
   * Tu propia fila entre los miembros, para el menú de cuenta: es lo que le da
   * nombre y color. `null` mientras carga, si no hay sesión o si quien mira
   * todavía no figura en esta familia.
   */
  currentMember: FamilyMember | null
  invites: FamilyInvite[]
  kids: Child[]
  allEvents: Event[]
  tasks: Task[]
  lists: List[]
  allListItems: ListItem[]
  meals: MealPlan[]
  notes: Note[]
  fixedEntries: FixedEntry[]
  budgets: Budget[]
  expenses: Expense[]
  quotes: Quote[]
  /**
   * Los meses ya cerrados, con la plantilla que tenían. Solo lectura: quien los
   * escribe es el cierre automático, no ninguna pantalla.
   */
  monthPlans: MonthPlan[]
  /**
   * Cerrar el mes a mano antes de tiempo, y deshacerlo. Lo segundo **solo vale
   * para el mes en curso**: un mes terminado no se reabre nunca. Lo que sí se
   * puede con un mes pasado es dejarlo a cero, que vacía su plan sin borrarlo.
   */
  closeMonthNow: (month: string) => Promise<void>
  reopenMonth: (month: string) => Promise<void>
  emptyMonth: (month: string) => Promise<void>
  documents: Document[]
  /** Franjas de comida que la familia ve, normalizadas. Nunca está vacío. */
  mealSlots: MealSlot[]
  /** Las de hoy, ya sin las franjas ocultas. */
  todayMeals: MealPlan[]
  pendingTasks: Task[]
  pendingItems: PendingItem[]
  updateFamilyName: (name: string) => Promise<void>
  updateMealSlots: (slots: MealSlot[]) => Promise<void>
  inviteMember: (email: string) => Promise<void>
  updateMember: (id: string, name: string, color: string | null) => Promise<void>
  updateMemberRole: (id: string, role: 'admin' | 'member') => Promise<void>
  removeMember: (id: string) => Promise<void>
  cancelInvite: (id: string) => Promise<void>
  createKid: (draft: ChildDraft) => Promise<void>
  updateKid: (id: string, draft: ChildDraft) => Promise<void>
  deleteKid: (id: string) => Promise<void>
  createEvent: (draft: EventDraft) => Promise<Event | null>
  createEventSeries: (draft: EventDraft, weekdays: number[], endDate: string) => Promise<Event[]>
  createYearlySeries: (draft: EventDraft, endYear: number) => Promise<Event[]>
  updateEvent: (id: string, draft: EventDraft) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  deleteEventSeries: (groupId: string) => Promise<void>
  createTask: (draft: TaskDraft) => Promise<void>
  updateTask: (id: string, draft: TaskDraft) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  createList: (draft: ListDraft) => Promise<void>
  updateList: (id: string, draft: ListDraft) => Promise<void>
  deleteList: (id: string) => Promise<void>
  createListItem: (listId: string, draft: ListItemDraft) => Promise<void>
  updateListItem: (id: string, draft: ListItemDraft) => Promise<void>
  deleteListItem: (id: string) => Promise<void>
  toggleListItem: (id: string) => Promise<void>
  setListItemQuantity: (id: string, quantity: number) => Promise<void>
  createMeal: (draft: MealDraft) => Promise<void>
  copyMealDay: (sourceDate: string, targetDate: string, repeatUntil?: string) => Promise<void>
  updateMeal: (id: string, draft: MealDraft) => Promise<void>
  deleteMeal: (id: string) => Promise<void>
  createNote: (draft: NoteDraft) => Promise<void>
  updateNote: (id: string, draft: NoteDraft) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  createFixedEntry: (draft: FixedEntryDraft) => Promise<void>
  updateFixedEntry: (id: string, draft: FixedEntryDraft) => Promise<void>
  deleteFixedEntry: (id: string) => Promise<void>
  createBudget: (draft: BudgetDraft) => Promise<void>
  updateBudget: (id: string, draft: BudgetDraft) => Promise<void>
  /** Borra la partida. Sus gastos se quedan, sin partida. */
  deleteBudget: (id: string) => Promise<void>
  createExpense: (draft: ExpenseDraft) => Promise<void>
  updateExpense: (id: string, draft: ExpenseDraft) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  createQuote: (draft: QuoteDraft) => Promise<void>
  updateQuote: (id: string, draft: QuoteDraft) => Promise<void>
  deleteQuote: (id: string) => Promise<void>
  setQuoteStatus: (id: string, status: QuoteStatus) => Promise<void>
  createDocument: (draft: DocumentDraft) => Promise<void>
  updateDocument: (id: string, draft: DocumentDraft) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  getDocumentUrl: (document: Document) => Promise<string>
  /**
   * Si quien mira tiene su almacenamiento conectado. `null` mientras no se ha
   * preguntado, que es casi siempre: **no entra en `reload()` a propósito**. La
   * mayoría de la familia nunca sube un documento y no hay por qué gastarle una
   * petición en cada carga de Inicio; lo pide quien lo necesita —el sheet de
   * documentos y Ajustes— cuando lo necesita.
   */
  storageConnection: StorageConnection | null
  reloadStorageConnection: () => Promise<void>
  /** A dónde lleva "Conectar Google Drive". `null` en modo demo: no se ofrece. */
  connectStorageUrl: string | null
  disconnectStorage: () => Promise<void>
}

const StoreCtx = createContext<StoreValue>(null!)

interface StoreProviderProps {
  children: React.ReactNode
  familyId: string
  switchFamily: (id: string) => void
}

/**
 * Las porciones de datos que el provider sabe recargar por separado.
 *
 * Es la lista de la que sale todo lo demás: `cargadores` es un `Record` con
 * exactamente estas claves —así que añadir una porción sin su cargador no
 * compila— y las escrituras declaran cuáles tocan.
 *
 * `currentUserId` está aquí por completitud, aunque no la declare ninguna
 * escritura: quién eres no cambia por escribir nada. Se recarga solo en la carga
 * completa, que es donde importa.
 *
 * **Cómo se decide qué porciones declara una escritura nueva.** No es «la tabla
 * en la que escribo»: es esa **y todas a las que llegue el esquema por su
 * cuenta**. `supabase/schema.sql` está lleno de `on delete set null` y de
 * `on delete cascade`, y una fila que cambia sola no avisa. Se mira ahí, no aquí:
 *
 *   - borrar una cesta se lleva sus ítems (`list_items.list_id`, cascade);
 *   - borrar una partida deja a `null` el `budget_id` de los gastos **y** el de
 *     las líneas de los meses ya cerrados —dos tablas, no una—;
 *   - borrar un hijo o echar a un miembro pone su asignación a `null` en las
 *     **seis** tablas que la tienen, y por eso esas dos no declaran nada.
 *
 * Y la regla de oro: **si hay duda, no se declara.** Sin porciones se recarga
 * todo, que es exactamente lo que hacía la app antes de que esto existiera.
 * Equivocarse por declarar de menos deja un dato viejo en la pantalla de alguien;
 * equivocarse por no declarar cuesta unas consultas. No son el mismo error.
 */
export type Porcion =
  | 'family' | 'families' | 'members' | 'invites' | 'kids' | 'events' | 'tasks'
  | 'lists' | 'listItems' | 'meals' | 'notes' | 'fixedEntries' | 'budgets'
  | 'expenses' | 'quotes' | 'monthPlans' | 'documents' | 'currentUserId'

const EMPTY_SLICES = {
  families: [] as Family[],
  members: [] as FamilyMember[],
  invites: [] as FamilyInvite[],
  kids: [] as Child[],
  allEvents: [] as Event[],
  tasks: [] as Task[],
  lists: [] as List[],
  allListItems: [] as ListItem[],
  meals: [] as MealPlan[],
  notes: [] as Note[],
  fixedEntries: [] as FixedEntry[],
  budgets: [] as Budget[],
  expenses: [] as Expense[],
  quotes: [] as Quote[],
  monthPlans: [] as MonthPlan[],
  documents: [] as Document[],
}

/**
 * Cierra el mes pasado si todavía no lo estaba, y devuelve los planes buenos.
 *
 * Tres cosas que no son evidentes:
 *
 * 1. **Solo se llama cuando falta el mes pasado.** El resto de los días del mes
 *    esto no hace ni un viaje, que es lo que permite tenerlo en la carga.
 * 2. **No se cierra el mes anterior a que existiera la familia.** Una familia
 *    creada hoy no tuvo agosto, y guardarle un agosto vacío sería inventarle un
 *    pasado que además luego se lee como «ese mes no pusisteis nada».
 * 3. **Si falla, no pasa nada.** Se devuelven los planes que ya había. No poder
 *    cerrar agosto no puede dejar Finanzas en blanco, y sobre todo no puede
 *    escribir en consola: `e2e/runtime.spec.ts` tumba la suite ante cualquier
 *    `console.error`.
 */
async function cerrarMesPasadoSiFalta(
  repos: Repos,
  familyId: string,
  family: Family,
  planes: MonthPlan[],
): Promise<MonthPlan[]> {
  const mesPasado = mesVecino(mesDe(getLocalDateString(new Date())), -1)
  if (planes.some(p => p.month === mesPasado)) return planes
  if (mesDe(family.created_at) > mesPasado) return planes

  try {
    const cerrado = await repos.monthPlans.closePreviousMonth(familyId)
    return cerrado ? await repos.monthPlans.getMonthPlans(familyId) : planes
  } catch {
    return planes
  }
}

export function StoreProvider({ children, familyId, switchFamily }: StoreProviderProps) {
  const repos: Repos = IS_DEMO_MODE ? mockRepos : supabaseRepos

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [undoAction, setUndoAction] = useState<{ label: string; run: () => Promise<void> } | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [families, setFamilies] = useState<Family[]>(EMPTY_SLICES.families)
  const [members, setMembers] = useState<FamilyMember[]>(EMPTY_SLICES.members)
  const [invites, setInvites] = useState<FamilyInvite[]>(EMPTY_SLICES.invites)
  const [kids, setKids] = useState<Child[]>(EMPTY_SLICES.kids)
  const [allEvents, setEvents] = useState<Event[]>(EMPTY_SLICES.allEvents)
  const [tasks, setTasks] = useState<Task[]>(EMPTY_SLICES.tasks)
  const [lists, setLists] = useState<List[]>(EMPTY_SLICES.lists)
  const [allListItems, setListItems] = useState<ListItem[]>(EMPTY_SLICES.allListItems)
  const [meals, setMeals] = useState<MealPlan[]>(EMPTY_SLICES.meals)
  const [notes, setNotes] = useState<Note[]>(EMPTY_SLICES.notes)
  const [fixedEntries, setFixedEntries] = useState<FixedEntry[]>(EMPTY_SLICES.fixedEntries)
  const [budgets, setBudgets] = useState<Budget[]>(EMPTY_SLICES.budgets)
  const [expenses, setExpenses] = useState<Expense[]>(EMPTY_SLICES.expenses)
  const [quotes, setQuotes] = useState<Quote[]>(EMPTY_SLICES.quotes)
  const [monthPlans, setMonthPlans] = useState<MonthPlan[]>(EMPTY_SLICES.monthPlans)
  const [documents, setDocuments] = useState<Document[]>(EMPTY_SLICES.documents)
  const [storageConnection, setStorageConnection] = useState<StorageConnection | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  /**
   * Cómo se trae cada porción de datos. Una función por porción, cada una se
   * pide sola y cada una devuelve lo que ha traído además de guardarlo.
   *
   * Existe para que una escritura no tenga que recargar la casa entera. Antes
   * había un solo `Promise.all` de dieciocho consultas y **toda** escritura
   * pasaba por él: marcar la leche en la lista de la compra volvía a descargar
   * los eventos, las comidas, los gastos y los documentos. Con una familia y un
   * año de datos eso son cientos de filas por cada tic de un círculo.
   *
   * Devuelven el valor y no solo lo guardan porque el cierre del mes pasado
   * necesita leer dos de ellas —la familia y los planes— y los `setState` de
   * React no se pueden leer justo después de llamarlos.
   */
  const cargadores: Record<Porcion, () => Promise<unknown>> = useMemo(() => ({
    family: async () => {
      const f = await repos.family.getFamily(familyId)
      if (!f) throw new Error('No se ha encontrado la familia activa')
      setFamily(f)
      return f
    },
    families:      async () => { const v = await repos.family.getFamilies();               setFamilies(v);     return v },
    members:       async () => { const v = await repos.members.getMembers(familyId);       setMembers(v);      return v },
    invites:       async () => { const v = await repos.invites.getInvites(familyId);       setInvites(v);      return v },
    kids:          async () => { const v = await repos.children.getKids(familyId);         setKids(v);         return v },
    events:        async () => { const v = await repos.events.getEvents(familyId);         setEvents(v);       return v },
    tasks:         async () => { const v = await repos.tasks.getTasks(familyId);           setTasks(v);        return v },
    lists:         async () => { const v = await repos.lists.getLists(familyId);           setLists(v);        return v },
    listItems:     async () => { const v = await repos.listItems.getListItems(familyId);   setListItems(v);    return v },
    meals:         async () => { const v = await repos.meals.getMeals(familyId);           setMeals(v);        return v },
    notes:         async () => { const v = await repos.notes.getNotes(familyId);           setNotes(v);        return v },
    fixedEntries:  async () => { const v = await repos.fixedEntries.getFixedEntries(familyId); setFixedEntries(v); return v },
    budgets:       async () => { const v = await repos.budgets.getBudgets(familyId);       setBudgets(v);      return v },
    expenses:      async () => { const v = await repos.expenses.getExpenses(familyId);     setExpenses(v);     return v },
    quotes:        async () => { const v = await repos.quotes.getQuotes(familyId);         setQuotes(v);       return v },
    monthPlans:    async () => { const v = await repos.monthPlans.getMonthPlans(familyId); setMonthPlans(v);   return v },
    documents:     async () => { const v = await repos.documents.getDocuments(familyId);   setDocuments(v);    return v },
    currentUserId: async () => { const v = await repos.members.getCurrentUserId();          setCurrentUserId(v); return v },
  }), [repos, familyId])

  /**
   * Recargar solo unas porciones, después de una escritura que se sabe qué toca.
   *
   * **No toca `isLoading`** a propósito: eso es "estamos cargando la familia" y
   * lo mira la pantalla de arranque. Lo que hay aquí es una escritura ya
   * terminada, y para eso está `isSaving`, que `runMutationWith` ya lleva. Y
   * **no cierra el mes pasado**: eso es cosa de la carga inicial, que es cuando
   * se abre la app.
   */
  const recargarPorciones = useCallback(async (porciones: Porcion[]) => {
    await Promise.all(porciones.map(p => cargadores[p]()))
    // Igual que en la carga completa: el mock vive en memoria y sin esto
    // recargar la página tira lo que acabas de escribir.
    if (IS_DEMO_MODE) store.persistAll()
  }, [cargadores])

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const traido = Object.fromEntries(
        await Promise.all(
          (Object.keys(cargadores) as Porcion[]).map(async p => [p, await cargadores[p]()]),
        ),
      ) as { family: Family; monthPlans: MonthPlan[] }

      // El cierre del mes pasado, que es lo que le da historia a Finanzas.
      //
      // Va aquí y no en un botón porque un «cerrar el mes» sería exactamente la
      // tarea administrativa que esta app existe para no pedir. Y va aquí además
      // del cron: el cron puede fallar o llegar tarde, y abrir la app el día 1 es
      // lo que hace de verdad todo el mundo. Las dos llamadas son idempotentes.
      //
      // Solo se intenta cuando **falta**, así que en el uso normal no cuesta ni un
      // viaje: los otros 30 días del mes el plan ya está.
      //
      // No cuenta como error de la app si falla, igual que la conexión de Drive:
      // no poder cerrar agosto no puede dejar la pantalla en blanco. Y **sin
      // registrar nada en consola**, que `e2e/runtime.spec.ts` tumba la suite ante
      // cualquier `console.error`.
      const planes = await cerrarMesPasadoSiFalta(repos, familyId, traido.family, traido.monthPlans)
      // Solo si el cierre ha cambiado algo: `cerrarMesPasadoSiFalta` devuelve los
      // mismos planes que le entran cuando no había nada que cerrar, que es lo que
      // pasa 30 días de cada 31.
      if (planes !== traido.monthPlans) setMonthPlans(planes)

      // El mock vive en memoria, así que sin esto recargar la página tira lo
      // que acabas de escribir. Es el simétrico del `loadFromStorage()` de más
      // arriba, y lo hace también `recargarPorciones`.
      if (IS_DEMO_MODE) store.persistAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando los datos')
    } finally {
      setIsLoading(false)
    }
  }, [familyId, repos, cargadores])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  /**
   * Preguntar por la conexión de almacenamiento. Si falla no se cuenta como
   * error de la app: no poder saber si hay Drive conectado no rompe ninguna
   * pantalla, solo hace que se ofrezca conectarlo. Y sobre todo, **no se
   * registra en consola**: `e2e/runtime.spec.ts` tumba la suite ante cualquier
   * `console.error`.
   */
  const reloadStorageConnection = useCallback(async () => {
    try {
      setStorageConnection(await repos.storageProviders.getConnection())
    } catch {
      setStorageConnection({ provider: 'google_drive', conectada: false, revocada: false, email: null, demo: false })
    }
  }, [repos])

  // Las franjas ocultas dejan de verse en todas las pantallas a la vez, y por eso
  // se filtra aquí y no en cada vista: Inicio y la pestaña "Hoy" de Comidas leen
  // las dos de `todayMeals`, y una tercera pantalla que llegue lo hereda gratis.
  // Lo apuntado en una franja oculta sigue en `meals`, sin borrar.
  const mealSlots = useMemo(() => normalizeMealSlots(family?.meal_slots), [family])
  const todayMeals = useMemo(
    () => filterMealsBySlots(selectTodayMeals(meals), mealSlots),
    [meals, mealSlots],
  )
  const currentMember = useMemo(
    () => (currentUserId ? members.find(m => m.user_id === currentUserId) ?? null : null),
    [members, currentUserId],
  )
  const pendingTasks = useMemo(() => selectPendingTasks(tasks), [tasks])
  const pendingItems = useMemo(() => selectPendingItems(allListItems, lists), [allListItems, lists])

  /**
   * Toda escritura pasa por aquí: marca que hay algo en curso, recarga al
   * terminar y deja el fallo en `error` para que la UI pueda contarlo. Antes se
   * relanzaba y nadie lo recogía, así que un fallo de red se quedaba en
   * silencio.
   *
   * Devuelve lo que devolviera la acción, o `fallback` si falló, porque hay
   * escrituras cuyo resultado necesita la vista: crear un evento la lleva a su
   * fecha. Las que no devuelven nada usan `runMutation`, aquí debajo.
   */
  const runMutationWith = useCallback(async <T,>(
    action: () => Promise<T>,
    fallback: T,
    mensaje: string,
    porciones?: Porcion[],
  ): Promise<T> => {
    setError(null)
    setUndoAction(null)
    setIsSaving(true)
    try {
      const resultado = await action()
      // Sin `porciones` se recarga todo, que es lo que hacían todas antes. No es
      // un descuido dejarlas así: es lo que hay que hacer cuando una escritura
      // toca de verdad media base —borrar un hijo o echar a alguien deja su
      // asignación a `null` en eventos, tareas, documentos, fijos y gastos— y es
      // además la red de seguridad de la escritura nueva que se escriba mañana:
      // olvidarse de declarar cuesta una recarga de más, no un dato viejo en
      // pantalla. Lo caro se declara; lo raro se recarga entero.
      if (porciones) await recargarPorciones(porciones)
      else await reload()
      return resultado
    } catch (err) {
      setError(err instanceof Error ? err.message : mensaje)
      return fallback
    } finally {
      setIsSaving(false)
    }
  }, [reload, recargarPorciones])

  /** El caso corriente: se escribe y no hay nada que devolver. */
  const runMutation = useCallback(
    (action: () => Promise<unknown>, porciones?: Porcion[]): Promise<void> =>
      runMutationWith<void>(async () => { await action() }, undefined, 'No se pudo guardar el cambio', porciones),
    [runMutationWith],
  )

  /**
   * Devolver una tarea a como estaba antes de marcarla. No basta con
   * desmarcarla: si se repite, marcarla no la completa sino que le empuja la
   * fecha a la siguiente vez. En vez de repetir aquí esa bifurcación, se mira
   * qué cambió de verdad y se revierte solo eso.
   */
  const restaurarTarea = useCallback(async (previo: Task): Promise<void> => {
    await runMutation(async () => {
      const actual = (await repos.tasks.getTasks(familyId)).find(t => t.id === previo.id)
      if (!actual) return
      if (actual.completed !== previo.completed) {
        await repos.tasks.toggleTask(previo.id)
      }
      if (actual.due_date !== previo.due_date) {
        await repos.tasks.updateTask(previo.id, {
          title: previo.title,
          notes: previo.notes ?? '',
          priority: previo.priority,
          due_date: previo.due_date ?? '',
          recurrence: previo.recurrence,
          recurrence_end: previo.recurrence_end ?? '',
          child_id: previo.child_id,
          member_id: previo.member_id,
        })
      }
    })
  }, [repos, familyId, runMutation])

  const value = useMemo<StoreValue | null>(() => {
    if (!family) return null

    return {
      isLoading,
      isSaving,
      error,
      clearError: () => setError(null),
      undoLabel: undoAction?.label ?? null,
      undo: async () => {
        const accion = undoAction
        setUndoAction(null)
        if (accion) await accion.run()
      },
      clearUndo: () => setUndoAction(null),
      reload,
      activeFamilyId: familyId,
      families,
      switchFamily,
      family,
      members,
      currentMember,
      invites,
      kids,
      allEvents,
      tasks,
      lists,
      allListItems,
      meals,
      notes,
      fixedEntries,
      budgets,
      expenses,
      quotes,
      monthPlans,
      documents,
      mealSlots,
      todayMeals,
      pendingTasks,
      pendingItems,
      // La única escritura que se queda fuera de `runMutationWith`: no puede
      // recargar al terminar. `switchFamily` cambia la familia activa y con ella
      // el `reload` del provider, que ya se dispara solo; recargar aquí sería
      // hacerlo con el `familyId` viejo, el de la familia que acabas de dejar.
      createFamily: async (name: string) => {
        setError(null)
        setIsSaving(true)
        try {
          const created = await repos.family.createFamily(name)
          switchFamily(created.id)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'No se pudo crear la familia')
        } finally {
          setIsSaving(false)
        }
      },
      // Fuera de `runMutationWith` por lo mismo que `createFamily`: al terminar no
      // hay nada que recargar con este `familyId`, porque la familia ya no está.
      // Se salta a otra y el remonte del provider hace la carga buena.
      deleteFamily: async () => {
        setError(null)
        setIsSaving(true)
        try {
          const otra = families.find(f => f.id !== familyId)
          // La interfaz ya esconde el botón, y en Supabase manda la RPC. Esto es
          // el tercer cerrojo, el que sostiene el modo demo.
          if (!otra) throw new Error('No puedes eliminar tu única familia.')
          await repos.family.deleteFamily(familyId)
          switchFamily(otra.id)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'No se pudo eliminar la familia')
        } finally {
          setIsSaving(false)
        }
      },
      // El nombre de la familia se ve en dos sitios: la pantalla de Ajustes y el
      // selector de familias de la cabecera, que se pinta con `families`. Con una
      // sola porción, el selector seguiría diciendo el nombre viejo.
      updateFamilyName: (name: string) =>
        runMutation(() => repos.family.setFamilyName(familyId, name), ['family', 'families']),
      // Las franjas viven en la fila de la familia. Lo apuntado en una franja que se
      // apaga no se borra, solo deja de pintarse —`todayMeals` lo filtra en
      // memoria—, así que `meals` no hace falta.
      updateMealSlots: (slots: MealSlot[]) =>
        runMutation(() => repos.family.setFamilyMealSlots(familyId, slots), ['family']),
      inviteMember: (email: string) => runMutation(() => repos.invites.createInvite(familyId, email), ['invites']),
      updateMember: (id: string, name: string, color: string | null) =>
        runMutation(() => repos.members.updateMemberProfile(id, name, color), ['members']),
      updateMemberRole: (id: string, role: 'admin' | 'member') =>
        runMutation(() => repos.members.updateMemberRole(id, role), ['members']),
      // **Sin porciones, recarga completa, y es a propósito.** Echar a alguien deja su
      // `member_id` a `null` en eventos, tareas, documentos, fijos, gastos y
      // presupuestos: media base cambia de golpe. Declarar la lista aquí sería
      // copiar a mano los `on delete set null` del esquema, y el día que crezca una
      // tabla más no vendría nadie a actualizarla.
      removeMember: (id: string) => runMutation(() => repos.members.removeMember(id)),
      cancelInvite: (id: string) => runMutation(() => repos.invites.cancelInvite(id), ['invites']),
      createKid: (draft: ChildDraft) => runMutation(() => repos.children.createKid(familyId, draft), ['kids']),
      updateKid: (id: string, draft: ChildDraft) => runMutation(() => repos.children.updateKid(id, draft), ['kids']),
      // Recarga completa por lo mismo que `removeMember`: borrar un hijo pone su
      // `child_id` a `null` en todo lo que se le hubiera asignado.
      deleteKid: (id: string) => runMutation(() => repos.children.deleteKid(id)),
      // Los eventos devuelven lo creado —la vista salta a esa fecha—, y por eso
      // pasan por `runMutationWith` y no por `runMutation`. El tipo va escrito a
      // mano porque la inferencia no puede sacarlo del valor de respaldo: `null`
      // y `[]` no dicen de qué son.
      createEvent: (draft: EventDraft) =>
        runMutationWith<Event | null>(
          () => repos.events.createEvent(familyId, draft),
          null,
          'No se pudo crear el evento',
          ['events'],
        ),
      createEventSeries: (draft: EventDraft, weekdays: number[], endDate: string) =>
        runMutationWith<Event[]>(
          () => repos.events.createEventSeries(familyId, draft, weekdays, endDate),
          [],
          'No se pudo crear la serie de eventos',
          ['events'],
        ),
      createYearlySeries: (draft: EventDraft, endYear: number) =>
        runMutationWith<Event[]>(
          () => repos.events.createYearlySeries(familyId, draft, endYear),
          [],
          'No se pudo crear la serie de eventos',
          ['events'],
        ),
      updateEvent: (id: string, draft: EventDraft) => runMutation(() => repos.events.updateEvent(id, draft), ['events']),
      deleteEvent: (id: string) => runMutation(() => repos.events.deleteEvent(id), ['events']),
      deleteEventSeries: (groupId: string) => runMutation(() => repos.events.deleteEventSeries(groupId), ['events']),
      createTask: (draft: TaskDraft) => runMutation(() => repos.tasks.createTask(familyId, draft), ['tasks']),
      updateTask: (id: string, draft: TaskDraft) => runMutation(() => repos.tasks.updateTask(id, draft), ['tasks']),
      deleteTask: (id: string) => runMutation(() => repos.tasks.deleteTask(id), ['tasks']),
      // Marcar una tarea es lo más fácil de hacer sin querer: es un círculo que
      // se toca al pasar el dedo por la lista. Se guarda cómo estaba antes para
      // poder devolverla, que hasta ahora no había manera si se repetía.
      toggleTask: async (id: string) => {
        const previo = tasks.find(t => t.id === id)
        await runMutation(() => repos.tasks.toggleTask(id), ['tasks'])
        if (previo) setUndoAction({ label: 'Hecho', run: () => restaurarTarea(previo) })
      },
      createList: (draft: ListDraft) => runMutation(() => repos.lists.createList(familyId, draft), ['lists']),
      updateList: (id: string, draft: ListDraft) => runMutation(() => repos.lists.updateList(id, draft), ['lists']),
      // Borrar una cesta se lleva sus ítems por cascada. Aquí sí se declaran las dos
      // en vez de caer a la recarga completa, porque son dos tablas contadas y
      // conocidas: la cascada de un hijo o de un miembro son seis y abiertas.
      deleteList: (id: string) => runMutation(() => repos.lists.deleteList(id), ['lists', 'listItems']),
      createListItem: (listId: string, draft: ListItemDraft) =>
        runMutation(() => repos.listItems.createListItem(listId, familyId, draft), ['listItems']),
      updateListItem: (id: string, draft: ListItemDraft) =>
        runMutation(() => repos.listItems.updateListItem(id, draft), ['listItems']),
      deleteListItem: (id: string) => runMutation(() => repos.listItems.deleteListItem(id), ['listItems']),
      // El gesto más repetido de la app entera: un círculo que se toca en el súper,
      // con el móvil en una mano y el carro en la otra. Es el que más gana con esto.
      toggleListItem: (id: string) => runMutation(() => repos.listItems.toggleListItem(id), ['listItems']),
      setListItemQuantity: (id: string, quantity: number) =>
        runMutation(() => repos.listItems.setListItemQuantity(id, quantity), ['listItems']),
      createMeal: (draft: MealDraft) => runMutation(() => repos.meals.createMeal(familyId, draft), ['meals']),
      copyMealDay: (sourceDate: string, targetDate: string, repeatUntil?: string) =>
        runMutation(() => repos.meals.copyMealDay(familyId, sourceDate, targetDate, repeatUntil), ['meals']),
      updateMeal: (id: string, draft: MealDraft) => runMutation(() => repos.meals.updateMeal(id, draft), ['meals']),
      deleteMeal: (id: string) => runMutation(() => repos.meals.deleteMeal(id), ['meals']),
      createNote: (draft: NoteDraft) => runMutation(() => repos.notes.createNote(familyId, draft), ['notes']),
      updateNote: (id: string, draft: NoteDraft) => runMutation(() => repos.notes.updateNote(id, draft), ['notes']),
      deleteNote: (id: string) => runMutation(() => repos.notes.deleteNote(id), ['notes']),
      // Los fijos y las partidas no tocan lo apuntado, y por eso no recargan ni
      // `expenses` ni `monthPlans`: la plantilla de un mes en curso se calcula en
      // memoria (`plantillaDelMes`) y la de un mes cerrado está congelada.
      createFixedEntry: (draft: FixedEntryDraft) =>
        runMutation(() => repos.fixedEntries.createFixedEntry(familyId, draft), ['fixedEntries']),
      updateFixedEntry: (id: string, draft: FixedEntryDraft) =>
        runMutation(() => repos.fixedEntries.updateFixedEntry(id, draft), ['fixedEntries']),
      deleteFixedEntry: (id: string) =>
        runMutation(() => repos.fixedEntries.deleteFixedEntry(id), ['fixedEntries']),
      createBudget: (draft: BudgetDraft) => runMutation(() => repos.budgets.createBudget(familyId, draft), ['budgets']),
      updateBudget: (id: string, draft: BudgetDraft) => runMutation(() => repos.budgets.updateBudget(id, draft), ['budgets']),
      // Borrar una partida deja sus gastos **sin partida**, no los borra: la fila de
      // cada gasto cambia. Y cambia una tercera cosa que no se ve venir: las líneas
      // de los meses ya cerrados llevan `budget_id` con `on delete set null`, así
      // que también se les queda a `null`. Sin recargar `monthPlans`, una línea
      // congelada seguiría diciendo que es de la partida X mientras sus gastos ya
      // no lo dicen, y las dos sumas de un mes cerrado dejarían de cuadrar
      // (`resumenPartidas` cruza `partida.budgetId` con `expense.budget_id`).
      deleteBudget: (id: string) =>
        runMutation(() => repos.budgets.deleteBudget(id), ['budgets', 'expenses', 'monthPlans']),
      createExpense: (draft: ExpenseDraft) => runMutation(() => repos.expenses.createExpense(familyId, draft), ['expenses']),
      updateExpense: (id: string, draft: ExpenseDraft) => runMutation(() => repos.expenses.updateExpense(id, draft), ['expenses']),
      deleteExpense: (id: string) => runMutation(() => repos.expenses.deleteExpense(id), ['expenses']),
      createQuote: (draft: QuoteDraft) => runMutation(() => repos.quotes.createQuote(familyId, draft), ['quotes']),
      updateQuote: (id: string, draft: QuoteDraft) => runMutation(() => repos.quotes.updateQuote(id, draft), ['quotes']),
      deleteQuote: (id: string) => runMutation(() => repos.quotes.deleteQuote(id), ['quotes']),
      setQuoteStatus: (id: string, status: QuoteStatus) =>
        runMutation(() => repos.quotes.setQuoteStatus(id, status), ['quotes']),
      closeMonthNow: (month: string) => runMutation(() => repos.monthPlans.closeMonthNow(familyId, month), ['monthPlans']),
      reopenMonth: (month: string) => runMutation(() => repos.monthPlans.reopenMonth(familyId, month), ['monthPlans']),
      emptyMonth: (month: string) => runMutation(() => repos.monthPlans.emptyMonth(familyId, month), ['monthPlans']),
      createDocument: (draft: DocumentDraft) =>
        runMutation(() => repos.documents.createDocument(familyId, draft), ['documents']),
      updateDocument: (id: string, draft: DocumentDraft) =>
        runMutation(() => repos.documents.updateDocument(id, draft), ['documents']),
      deleteDocument: (id: string) => runMutation(() => repos.documents.deleteDocument(id), ['documents']),
      getDocumentUrl: (document: Document) => repos.documents.getDownloadUrl(document),
      storageConnection,
      reloadStorageConnection,
      connectStorageUrl: repos.storageProviders.connectUrl(),
      disconnectStorage: async () => {
        await repos.storageProviders.disconnect()
        await reloadStorageConnection()
      },
    }
  }, [
    isLoading,
    isSaving,
    error,
    reload,
    familyId,
    families,
    switchFamily,
    family,
    members,
    currentMember,
    invites,
    kids,
    allEvents,
    tasks,
    lists,
    allListItems,
    meals,
    notes,
    fixedEntries,
    budgets,
    expenses,
    quotes,
    monthPlans,
    documents,
    mealSlots,
    todayMeals,
    pendingTasks,
    pendingItems,
    repos,
    runMutation,
    runMutationWith,
    undoAction,
    restaurarTarea,
    storageConnection,
    reloadStorageConnection,
  ])

  if (isLoading && !value) {
    return <ShellState title="Cargando Farpi" description="Preparando los datos de la familia..." />
  }

  if (!value) {
    return (
      <ShellState
        title="No se pudo cargar la familia"
        description={error ?? 'Revisa la sesión o la configuración de Supabase.'}
      />
    )
  }

  return (
    <StoreCtx.Provider value={value}>
      {children}
    </StoreCtx.Provider>
  )
}

function ShellState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <p className="text-lg font-extrabold text-ink">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  )
}

export function useStore(): StoreValue {
  return useContext(StoreCtx)
}
