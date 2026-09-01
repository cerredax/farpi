'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as store from './store'
import { mockRepos } from './mock-repos'
import { supabaseRepos } from './supabase-repos'
import { IS_DEMO_MODE } from './supabase/client'
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
  Family,
  FamilyInvite,
  FamilyMember,
  List,
  ListDraft,
  ListItem,
  ListItemDraft,
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
  budgets: Budget[]
  expenses: Expense[]
  quotes: Quote[]
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
  createBudget: (draft: BudgetDraft) => Promise<void>
  updateBudget: (id: string, draft: BudgetDraft) => Promise<void>
  /** Borra el tope. Sus gastos se quedan, sin presupuesto. */
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
  budgets: [] as Budget[],
  expenses: [] as Expense[],
  quotes: [] as Quote[],
  documents: [] as Document[],
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
  const [budgets, setBudgets] = useState<Budget[]>(EMPTY_SLICES.budgets)
  const [expenses, setExpenses] = useState<Expense[]>(EMPTY_SLICES.expenses)
  const [quotes, setQuotes] = useState<Quote[]>(EMPTY_SLICES.quotes)
  const [documents, setDocuments] = useState<Document[]>(EMPTY_SLICES.documents)
  const [storageConnection, setStorageConnection] = useState<StorageConnection | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [
        nextFamily,
        nextFamilies,
        nextMembers,
        nextInvites,
        nextKids,
        nextEvents,
        nextTasks,
        nextLists,
        nextListItems,
        nextMeals,
        nextNotes,
        nextBudgets,
        nextExpenses,
        nextQuotes,
        nextDocuments,
        nextUserId,
      ] = await Promise.all([
        repos.family.getFamily(familyId),
        repos.family.getFamilies(),
        repos.members.getMembers(familyId),
        repos.invites.getInvites(familyId),
        repos.children.getKids(familyId),
        repos.events.getEvents(familyId),
        repos.tasks.getTasks(familyId),
        repos.lists.getLists(familyId),
        repos.listItems.getListItems(familyId),
        repos.meals.getMeals(familyId),
        repos.notes.getNotes(familyId),
        repos.budgets.getBudgets(familyId),
        repos.expenses.getExpenses(familyId),
        repos.quotes.getQuotes(familyId),
        repos.documents.getDocuments(familyId),
        repos.members.getCurrentUserId(),
      ])

      if (!nextFamily) throw new Error('No se ha encontrado la familia activa')

      // El mock vive en memoria, así que sin esto recargar la página tira lo
      // que acabas de escribir. Va aquí porque toda escritura termina en un
      // `reload()`, y es el simétrico del `loadFromStorage()` de más arriba.
      if (IS_DEMO_MODE) store.persistAll()

      setFamily(nextFamily)
      setFamilies(nextFamilies)
      setMembers(nextMembers)
      setInvites(nextInvites)
      setKids(nextKids)
      setEvents(nextEvents)
      setTasks(nextTasks)
      setLists(nextLists)
      setListItems(nextListItems)
      setMeals(nextMeals)
      setNotes(nextNotes)
      setBudgets(nextBudgets)
      setExpenses(nextExpenses)
      setQuotes(nextQuotes)
      setDocuments(nextDocuments)
      setCurrentUserId(nextUserId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando los datos')
    } finally {
      setIsLoading(false)
    }
  }, [familyId, repos])

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
  ): Promise<T> => {
    setError(null)
    setUndoAction(null)
    setIsSaving(true)
    try {
      const resultado = await action()
      await reload()
      return resultado
    } catch (err) {
      setError(err instanceof Error ? err.message : mensaje)
      return fallback
    } finally {
      setIsSaving(false)
    }
  }, [reload])

  /** El caso corriente: se escribe y no hay nada que devolver. */
  const runMutation = useCallback(
    (action: () => Promise<unknown>): Promise<void> =>
      runMutationWith<void>(async () => { await action() }, undefined, 'No se pudo guardar el cambio'),
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
      budgets,
      expenses,
      quotes,
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
      updateFamilyName: (name: string) => runMutation(() => repos.family.setFamilyName(familyId, name)),
      updateMealSlots: (slots: MealSlot[]) => runMutation(() => repos.family.setFamilyMealSlots(familyId, slots)),
      inviteMember: (email: string) => runMutation(() => repos.invites.createInvite(familyId, email)),
      updateMember: (id: string, name: string, color: string | null) =>
        runMutation(() => repos.members.updateMemberProfile(id, name, color)),
      updateMemberRole: (id: string, role: 'admin' | 'member') => runMutation(() => repos.members.updateMemberRole(id, role)),
      removeMember: (id: string) => runMutation(() => repos.members.removeMember(id)),
      cancelInvite: (id: string) => runMutation(() => repos.invites.cancelInvite(id)),
      createKid: (draft: ChildDraft) => runMutation(() => repos.children.createKid(familyId, draft)),
      updateKid: (id: string, draft: ChildDraft) => runMutation(() => repos.children.updateKid(id, draft)),
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
        ),
      createEventSeries: (draft: EventDraft, weekdays: number[], endDate: string) =>
        runMutationWith<Event[]>(
          () => repos.events.createEventSeries(familyId, draft, weekdays, endDate),
          [],
          'No se pudo crear la serie de eventos',
        ),
      createYearlySeries: (draft: EventDraft, endYear: number) =>
        runMutationWith<Event[]>(
          () => repos.events.createYearlySeries(familyId, draft, endYear),
          [],
          'No se pudo crear la serie de eventos',
        ),
      updateEvent: (id: string, draft: EventDraft) => runMutation(() => repos.events.updateEvent(id, draft)),
      deleteEvent: (id: string) => runMutation(() => repos.events.deleteEvent(id)),
      deleteEventSeries: (groupId: string) => runMutation(() => repos.events.deleteEventSeries(groupId)),
      createTask: (draft: TaskDraft) => runMutation(() => repos.tasks.createTask(familyId, draft)),
      updateTask: (id: string, draft: TaskDraft) => runMutation(() => repos.tasks.updateTask(id, draft)),
      deleteTask: (id: string) => runMutation(() => repos.tasks.deleteTask(id)),
      // Marcar una tarea es lo más fácil de hacer sin querer: es un círculo que
      // se toca al pasar el dedo por la lista. Se guarda cómo estaba antes para
      // poder devolverla, que hasta ahora no había manera si se repetía.
      toggleTask: async (id: string) => {
        const previo = tasks.find(t => t.id === id)
        await runMutation(() => repos.tasks.toggleTask(id))
        if (previo) setUndoAction({ label: 'Hecho', run: () => restaurarTarea(previo) })
      },
      createList: (draft: ListDraft) => runMutation(() => repos.lists.createList(familyId, draft)),
      updateList: (id: string, draft: ListDraft) => runMutation(() => repos.lists.updateList(id, draft)),
      deleteList: (id: string) => runMutation(() => repos.lists.deleteList(id)),
      createListItem: (listId: string, draft: ListItemDraft) =>
        runMutation(() => repos.listItems.createListItem(listId, familyId, draft)),
      updateListItem: (id: string, draft: ListItemDraft) => runMutation(() => repos.listItems.updateListItem(id, draft)),
      deleteListItem: (id: string) => runMutation(() => repos.listItems.deleteListItem(id)),
      toggleListItem: (id: string) => runMutation(() => repos.listItems.toggleListItem(id)),
      setListItemQuantity: (id: string, quantity: number) =>
        runMutation(() => repos.listItems.setListItemQuantity(id, quantity)),
      createMeal: (draft: MealDraft) => runMutation(() => repos.meals.createMeal(familyId, draft)),
      copyMealDay: (sourceDate: string, targetDate: string, repeatUntil?: string) =>
        runMutation(() => repos.meals.copyMealDay(familyId, sourceDate, targetDate, repeatUntil)),
      updateMeal: (id: string, draft: MealDraft) => runMutation(() => repos.meals.updateMeal(id, draft)),
      deleteMeal: (id: string) => runMutation(() => repos.meals.deleteMeal(id)),
      createNote: (draft: NoteDraft) => runMutation(() => repos.notes.createNote(familyId, draft)),
      updateNote: (id: string, draft: NoteDraft) => runMutation(() => repos.notes.updateNote(id, draft)),
      deleteNote: (id: string) => runMutation(() => repos.notes.deleteNote(id)),
      createBudget: (draft: BudgetDraft) => runMutation(() => repos.budgets.createBudget(familyId, draft)),
      updateBudget: (id: string, draft: BudgetDraft) => runMutation(() => repos.budgets.updateBudget(id, draft)),
      deleteBudget: (id: string) => runMutation(() => repos.budgets.deleteBudget(id)),
      createExpense: (draft: ExpenseDraft) => runMutation(() => repos.expenses.createExpense(familyId, draft)),
      updateExpense: (id: string, draft: ExpenseDraft) => runMutation(() => repos.expenses.updateExpense(id, draft)),
      deleteExpense: (id: string) => runMutation(() => repos.expenses.deleteExpense(id)),
      createQuote: (draft: QuoteDraft) => runMutation(() => repos.quotes.createQuote(familyId, draft)),
      updateQuote: (id: string, draft: QuoteDraft) => runMutation(() => repos.quotes.updateQuote(id, draft)),
      deleteQuote: (id: string) => runMutation(() => repos.quotes.deleteQuote(id)),
      setQuoteStatus: (id: string, status: QuoteStatus) => runMutation(() => repos.quotes.setQuoteStatus(id, status)),
      createDocument: (draft: DocumentDraft) => runMutation(() => repos.documents.createDocument(familyId, draft)),
      updateDocument: (id: string, draft: DocumentDraft) => runMutation(() => repos.documents.updateDocument(id, draft)),
      deleteDocument: (id: string) => runMutation(() => repos.documents.deleteDocument(id)),
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
    budgets,
    expenses,
    quotes,
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
