import type {
  Family, FamilyMember, FamilyInvite, Child, Event, Task,
  MealPlan, MealSlot, List, ListItem, Document, Note,
  Budget, Expense, FixedEntry, Quote, MonthPlan,
  ChildDraft, EventDraft, TaskDraft, MealDraft,
  ListDraft, ListItemDraft, DocumentDraft, NoteDraft, StorageConnection,
  BudgetDraft, ExpenseDraft, FixedEntryDraft, QuoteDraft,
} from '@/types'

// ─── Contratos de repositorios ─────────────────────────────────────────────────
// Cada repo expone operaciones async. La implementación actual es mock;
// se sustituirá por llamadas Supabase sin cambiar los contratos.

export interface FamilyRepo {
  getFamily(familyId: string): Promise<Family | undefined>
  getFamilies(): Promise<Family[]>
  setFamilyName(familyId: string, name: string): Promise<Family>
  /** Qué franjas de comida se ven. Nunca deja la familia sin ninguna. */
  setFamilyMealSlots(familyId: string, slots: MealSlot[]): Promise<Family>
  createFamily(name: string): Promise<Family>
  /**
   * Cierra la familia y se lleva todo lo suyo. Solo un admin, y nunca la última
   * que le queda a quien la borra: la app siempre trabaja dentro de una familia.
   */
  deleteFamily(familyId: string): Promise<void>
}

export interface MembersRepo {
  getMembers(familyId: string): Promise<FamilyMember[]>
  /**
   * Quién está mirando la app. Se usa para reconocer su propia fila entre los
   * miembros de la familia (la del menú de cuenta), no para decidir permisos:
   * eso lo hace la RLS. Devuelve `null` si no se puede saber, y entonces la UI
   * se queda sin nombre pero no se rompe.
   */
  getCurrentUserId(): Promise<string | null>
  updateMemberProfile(id: string, name: string, color: string | null): Promise<void>
  updateMemberRole(id: string, role: 'admin' | 'member'): Promise<void>
  removeMember(id: string): Promise<void>
}

export interface InvitesRepo {
  getInvites(familyId: string): Promise<FamilyInvite[]>
  createInvite(familyId: string, email: string): Promise<FamilyInvite>
  cancelInvite(id: string): Promise<void>
}

export interface ChildrenRepo {
  getKids(familyId: string): Promise<Child[]>
  createKid(familyId: string, draft: ChildDraft): Promise<Child>
  updateKid(id: string, draft: ChildDraft): Promise<void>
  deleteKid(id: string): Promise<void>
}

export interface EventsRepo {
  getEvents(familyId: string): Promise<Event[]>
  createEvent(familyId: string, draft: EventDraft): Promise<Event>
  createEventSeries(familyId: string, draft: EventDraft, weekdays: number[], endDate: string): Promise<Event[]>
  createYearlySeries(familyId: string, draft: EventDraft, endYear: number): Promise<Event[]>
  updateEvent(id: string, draft: EventDraft): Promise<void>
  deleteEvent(id: string): Promise<void>
  deleteEventSeries(groupId: string): Promise<void>
}

export interface TasksRepo {
  getTasks(familyId: string): Promise<Task[]>
  createTask(familyId: string, draft: TaskDraft): Promise<Task>
  updateTask(id: string, draft: TaskDraft): Promise<void>
  deleteTask(id: string): Promise<void>
  toggleTask(id: string): Promise<void>
}

export interface ListsRepo {
  getLists(familyId: string): Promise<List[]>
  createList(familyId: string, draft: ListDraft): Promise<List>
  updateList(id: string, draft: ListDraft): Promise<void>
  deleteList(id: string): Promise<void>
}

export interface ListItemsRepo {
  getListItems(familyId: string): Promise<ListItem[]>
  createListItem(listId: string, familyId: string, draft: ListItemDraft): Promise<ListItem>
  updateListItem(id: string, draft: ListItemDraft): Promise<void>
  deleteListItem(id: string): Promise<void>
  toggleListItem(id: string): Promise<void>
  /**
   * Cambiar solo las unidades, sin pasar por el draft entero.
   *
   * Los botones de más y de menos viven en la propia fila y no abren nada, así
   * que no tienen a mano el texto ni la lista destino: pedir un `ListItemDraft`
   * completo obligaría a la vista a rearmarlo en cada toque. Es el mismo caso
   * que `toggleListItem`.
   */
  setListItemQuantity(id: string, quantity: number): Promise<void>
}

export interface NotesRepo {
  getNotes(familyId: string): Promise<Note[]>
  createNote(familyId: string, draft: NoteDraft): Promise<Note>
  updateNote(id: string, draft: NoteDraft): Promise<void>
  deleteNote(id: string): Promise<void>
}

/**
 * El mes tipo: ingresos y gastos que se repiten sin apuntarlos. No hay nada que
 * generar ni ninguna fecha que pasar: se leen enteros y la pantalla los suma.
 */
export interface FixedEntriesRepo {
  getFixedEntries(familyId: string): Promise<FixedEntry[]>
  createFixedEntry(familyId: string, draft: FixedEntryDraft): Promise<FixedEntry>
  updateFixedEntry(id: string, draft: FixedEntryDraft): Promise<void>
  deleteFixedEntry(id: string): Promise<void>
}

/**
 * Las partidas de gasto al mes. Borrar una **no borra sus apuntes**: se quedan
 * sin partida (`budget_id` a null, que es lo que hace la clave ajena en la base),
 * porque el dinero se gastó igual. El mock tiene que hacer lo mismo.
 */
export interface BudgetsRepo {
  getBudgets(familyId: string): Promise<Budget[]>
  createBudget(familyId: string, draft: BudgetDraft): Promise<Budget>
  updateBudget(id: string, draft: BudgetDraft): Promise<void>
  deleteBudget(id: string): Promise<void>
}

/**
 * Los apuntes: gastos e ingresos con fecha. Un ingreso llega **siempre** con
 * `budget_id` a null —una partida mide gasto—, y las dos implementaciones tienen
 * que forzarlo, no confiar en que el formulario lo haya hecho.
 */
export interface ExpensesRepo {
  getExpenses(familyId: string): Promise<Expense[]>
  createExpense(familyId: string, draft: ExpenseDraft): Promise<Expense>
  updateExpense(id: string, draft: ExpenseDraft): Promise<void>
  deleteExpense(id: string): Promise<void>
}

export interface QuotesRepo {
  getQuotes(familyId: string): Promise<Quote[]>
  createQuote(familyId: string, draft: QuoteDraft): Promise<Quote>
  updateQuote(id: string, draft: QuoteDraft): Promise<void>
  deleteQuote(id: string): Promise<void>
  /**
   * Aceptar o descartar sin abrir el formulario entero. Es el gesto que se hace
   * desde la propia fila —el mismo caso que `toggleTask`—: decidir entre tres
   * presupuestos no debería obligar a pasar por un sheet con seis campos.
   */
  setQuoteStatus(id: string, status: Quote['status']): Promise<void>
}

export interface MealsRepo {
  getMeals(familyId: string): Promise<MealPlan[]>
  createMeal(familyId: string, draft: MealDraft): Promise<MealPlan>
  updateMeal(id: string, draft: MealDraft): Promise<void>
  deleteMeal(id: string): Promise<void>
  copyMealDay(familyId: string, sourceDate: string, targetDate: string, repeatUntil?: string): Promise<void>
}

/**
 * Los meses cerrados. **No se editan: se cierran y se reabren, nada más.**
 *
 * No hay `create` ni `update` de una línea suelta, y no es una omisión que
 * rellenar más adelante: lo que hace que un mes cerrado signifique algo es que la
 * app no pueda reescribirlo. Lo único que se puede hacer es congelar la plantilla
 * entera de un mes, o —solo en el mes en curso— deshacerlo.
 *
 * Las tres devuelven **si han hecho algo**, no el plan: con eso quien llama sabe
 * si tiene que recargar. Las tres son idempotentes.
 */
export interface MonthPlansRepo {
  getMonthPlans(familyId: string): Promise<MonthPlan[]>
  /** El cierre automático del mes que acaba de terminar. Lo llama la app al cargar. */
  closePreviousMonth(familyId: string): Promise<boolean>
  /**
   * Cerrar un mes **a mano y antes de tiempo**, para poder tocar la plantilla sin
   * que el cambio caiga en el mes en curso. Acepta el mes actual; rechaza los que
   * aún no han llegado.
   */
  closeMonthNow(familyId: string, month: string): Promise<boolean>
  /**
   * Deshacer un cierre anticipado. **Solo vale para el mes en curso**: un mes
   * terminado no se reabre nunca, que es lo que sostiene todo lo demás.
   */
  reopenMonth(familyId: string, month: string): Promise<boolean>
}

export interface DocumentsRepo {
  getDocuments(familyId: string): Promise<Document[]>
  createDocument(familyId: string, draft: DocumentDraft): Promise<Document>
  updateDocument(id: string, draft: DocumentDraft): Promise<void>
  deleteDocument(id: string): Promise<void>
  /**
   * A dónde ir para ver el archivo. Ya no es una URL firmada del proveedor sino
   * una ruta de la propia app (`/api/documents/{id}/file`): los archivos viven en
   * el Drive de quien los sube y los sirve Farpi, no Google. Comprueba antes que
   * el archivo siga estando, para poder fallar con un mensaje y no con una
   * pestaña en blanco.
   */
  getDownloadUrl(document: Document): Promise<string>
}

/**
 * La conexión de **quien está usando la app** con su almacenamiento.
 *
 * Es lo único de todo esto que la interfaz necesita saber, y por eso es tan
 * pequeño: si hay que enseñar el botón de conectar, a dónde lleva ese botón y
 * cómo se deshace. Ni un token asoma por aquí. Casi nadie de la familia verá
 * nunca esta parte — solo hace falta para subir, no para mirar.
 */
export interface StorageProvidersRepo {
  getConnection(): Promise<StorageConnection>
  /**
   * A dónde navegar para conectar. `null` cuando no hay nada que conectar (modo
   * demo), que es lo que la interfaz usa para no ofrecerlo.
   */
  connectUrl(): string | null
  disconnect(): Promise<void>
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

export interface Repos {
  family: FamilyRepo
  members: MembersRepo
  invites: InvitesRepo
  children: ChildrenRepo
  events: EventsRepo
  tasks: TasksRepo
  lists: ListsRepo
  listItems: ListItemsRepo
  meals: MealsRepo
  notes: NotesRepo
  fixedEntries: FixedEntriesRepo
  budgets: BudgetsRepo
  expenses: ExpensesRepo
  quotes: QuotesRepo
  monthPlans: MonthPlansRepo
  documents: DocumentsRepo
  storageProviders: StorageProvidersRepo
}
