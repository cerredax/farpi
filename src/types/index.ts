export type DocCategory = 'salud' | 'colegio' | 'personal' | 'otros'
export type DocMimeType = 'application/pdf' | 'image/jpeg' | 'image/png'

export interface Family {
  id: string
  name: string
  /**
   * Franjas de comida que la familia quiere ver, ya normalizadas: sin repetidos,
   * sin valores raros y en el orden del día. Ocultar una franja no borra sus
   * `MealPlan`; solo deja de pintarla. Migración 019.
   */
  meal_slots: MealSlot[]
  created_at: string
  updated_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  /** Color elegido. `null` = el que le toca por su posición en la familia. */
  color: string | null
  role: 'admin' | 'member'
  created_at: string
}

export type InviteStatus = 'pending' | 'accepted' | 'cancelled'

export interface FamilyInvite {
  id: string
  family_id: string
  email: string
  role: 'admin' | 'member'
  status: InviteStatus
  invited_by: string | null
  accepted_at: string | null
  created_at: string
}

/**
 * De quién lleva registro la familia sin que tenga cuenta: un hijo o un adulto
 * (una abuela, un tío). Los dos se asignan por `child_id`; solo cambia dónde
 * salen en Ajustes y cómo se les llama. Quien sí tiene cuenta es `FamilyMember`.
 */
export type PersonKind = 'hijo' | 'adulto'

export interface Child {
  id: string
  family_id: string
  name: string
  birth_date: string | null
  color: string
  kind: PersonKind
  created_at: string
}

/** Un plan puntual, unas vacaciones de varios días o un descanso marcado como no disponible. */
export type EventKind = 'evento' | 'vacaciones' | 'descanso' | 'festivo' | 'cumple'

export interface Event {
  id: string
  family_id: string
  /** Asignado a un hijo. Excluyente con `member_id`; ambos null = toda la familia. */
  child_id: string | null
  /** Asignado a un miembro adulto de la familia. */
  member_id: string | null
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  all_day: boolean
  kind: EventKind
  /**
   * El año en que nació quien cumple, solo en `kind = 'cumple'` y solo si se
   * sabe. De ahí sale la edad. Va en la fila y no calculado de `start_at`
   * porque la serie anual se genera desde el año en curso: la fecha dice el día
   * que se celebra, no el día que nació.
   */
  birth_year: number | null
  color: string | null
  recurrence_group_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface List {
  id: string
  family_id: string
  name: string
  emoji: string | null
  color: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ListItem {
  id: string
  list_id: string
  family_id: string
  text: string
  /** Cuántas unidades hacen falta. Siempre ≥ 1: uno es "hace falta", no "ninguno". */
  quantity: number
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  sort_order: number
  created_by: string | null
  created_at: string
}

export type PendingItem = ListItem & { list_name: string; list_emoji: string | null }

/** Ítem encontrado buscando en todas las listas: lleva de dónde sale. */
export type ItemMatch = ListItem & { list_name: string; list_emoji: string | null }

/**
 * Algo que hay que tener apuntado y no es una fecha, una tarea ni un papel: el
 * teléfono del pediatra, la clave del wifi, la talla de las botas del colegio.
 *
 * A propósito no tiene categorías, ni campos, ni tipo. Una casa tiene veinte
 * notas y para veinte manda el buscador; en cuanto una nota tuviera que elegir
 * entre ser "teléfono" o "contraseña", habría que mantener tres formularios y
 * decidir en cuál cae "el código de la alarma", que es las dos cosas.
 */
export interface Note {
  id: string
  family_id: string
  title: string
  body: string | null
  emoji: string | null
  /** Fijada arriba del todo. Lo que se consulta siempre y no se toca nunca. */
  pinned: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Gasto o ingreso. Lo que parte en dos tanto los fijos como los movimientos.
 *
 * Es un campo y no un signo en el importe: los importes son **siempre
 * positivos**, aquí y en la base. Un ingreso guardado como gasto negativo haría
 * que cada suma dependiera del signo de cada fila, y «llevas 180 de 300» dejaría
 * de poder leerse de un vistazo.
 */
export type MovementKind = 'gasto' | 'ingreso'

/**
 * El mes tipo: lo que entra y lo que sale todos los meses sin apuntar nada. Las
 * dos nóminas, el alquiler, la luz, la suscripción.
 *
 * **No genera movimientos.** Es una cifra que vale hasta que se cambie, igual
 * que el tope de un `Budget`. Con la contrapartida que hay que saber: cambiar el
 * alquiler cambia también lo que dicen los meses pasados, porque no hay
 * vigencias por fila y mes.
 *
 * `child_id` y `member_id` son de quién es —quién cobra la nómina, quién paga el
 * recibo—, con la misma forma excluyente de siempre. Los dos a null es «de la
 * casa», que en un recibo domiciliado es lo normal.
 */
export interface FixedEntry {
  id: string
  family_id: string
  kind: MovementKind
  name: string
  emoji: string | null
  /** En céntimos, siempre positivo. El signo lo pone `kind`. */
  amount_cents: number
  child_id: string | null
  member_id: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Un tope de gasto al mes para algo: la compra, el colegio, el ocio.
 *
 * El tope **no es por mes**: es una cifra que vale hasta que se cambie. Una fila
 * por categoría y mes obligaría a "abrir septiembre" cada treinta días, que es
 * el trabajo administrativo que esta app existe para no pedir.
 *
 * Sin color a propósito: en Farpi el color dice de quién es algo, y un
 * presupuesto no es de nadie. Lo que lo distingue es su emoji, como en las
 * listas.
 */
export interface Budget {
  id: string
  family_id: string
  name: string
  emoji: string | null
  /** En céntimos, siempre. Ni euros con decimales ni cadenas. */
  monthly_limit_cents: number
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Un movimiento de la casa: un gasto o un ingreso, con su fecha. Lo que hace que
 * el tope de un `Budget` signifique algo.
 *
 * Se sigue llamando `Expense` porque así se llama la tabla, que no se renombró:
 * hacerlo obligaba a migrar la base real a cambio de una palabra. En pantalla
 * son «movimientos».
 *
 * `budget_id` puede ser null: o no se le puso tope, o se borró el que tenía. El
 * gasto pasó igual, así que no se va con su categoría; la pantalla lo junta bajo
 * "Sin tope". **Un ingreso lo tiene siempre a null**, y eso lo garantiza un
 * `check` de la base: si un ingreso descontara de un tope, una devolución de 40 €
 * liberaría 40 € de la compra sin que nadie haya dejado de comprar.
 *
 * `child_id` y `member_id` son **quién lo pagó o quién lo trajo**, con la misma
 * forma excluyente que en eventos, tareas y documentos. Los dos a null significa
 * "de la casa", no "no se sabe": es el caso normal de la cuenta común.
 */
export interface Expense {
  id: string
  family_id: string
  budget_id: string | null
  /** Lo pagó una persona sin cuenta. Excluyente con `member_id`. */
  child_id: string | null
  /** Lo pagó un adulto con cuenta. */
  member_id: string | null
  kind: MovementKind
  /** En céntimos, siempre positivo. El signo lo pone `kind`. */
  amount_cents: number
  date: string
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * En qué anda un presupuesto que te han pasado. Tres y no más: se pide, se
 * acepta o se descarta. "Caducado" no es un estado que nadie marque a mano, lo
 * dice `valid_until` comparado con hoy.
 */
export type QuoteStatus = 'pedido' | 'aceptado' | 'descartado'

/**
 * Lo que te pasa el fontanero, el dentista o la academia. La otra mitad de la
 * palabra "presupuesto", y nada que ver con el gasto del mes: aquí todavía no se
 * ha pagado nada.
 *
 * `title` es **para qué es** ("Cambiar la caldera") y `provider` **quién lo da**
 * ("Fontanería López"). Están separados porque comparar dos o tres para lo mismo
 * es casi todo para lo que sirve esto: la pantalla agrupa por título y marca el
 * más barato.
 */
export interface Quote {
  id: string
  family_id: string
  title: string
  provider: string
  amount_cents: number
  status: QuoteStatus
  /** Hasta cuándo vale el precio. La mayoría lo dicen; algunos no. */
  valid_until: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * `school` es el comedor: lo que le ponen a los niños fuera de casa. Es una
 * franja aparte de `lunch` y no un adorno de ella, porque a la misma hora se
 * come una cosa en el colegio y otra en casa, y las dos hay que saberlas.
 */
export type MealSlot = 'breakfast' | 'lunch' | 'school' | 'dinner' | 'snack'

export interface MealPlan {
  id: string
  family_id: string
  date: string
  slot: MealSlot
  /** Plato único, o el primero cuando hay más de uno. Nunca vacío. */
  name: string
  /**
   * El menú del comedor viene en tres líneas —primero, segundo y postre—, y
   * apuntarlo todo en `name` lo deja como una frase sin forma. Los dos van
   * nulos en casi todas las comidas: una tostada no tiene segundo.
   */
  second_course: string | null
  dessert: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Quién guarda de verdad los archivos. Hoy solo Google Drive, pero la columna
 * existe desde el primer día porque es la que elige implementación en
 * `src/lib/document-storage`: sin ella, añadir Dropbox u OneDrive obligaría a
 * mirar la fila y adivinar.
 */
export type StorageProviderId = 'google_drive'

/**
 * Lo que la interfaz sabe de la conexión de quien está mirando. **Nunca lleva
 * tokens**: los tokens no salen del servidor ni por asomo, y por eso esto no es
 * una fila de la tabla sino lo que devuelve `/api/documents/providers`.
 */
export interface StorageConnection {
  provider: StorageProviderId
  conectada: boolean
  /** Estaba conectada y dejó de valer: hay que volver a autorizar. */
  revocada: boolean
  /** La cuenta de Google en la que caen los archivos, si se pudo averiguar. */
  email: string | null
  /** En modo demo no hay nada que conectar y la interfaz lo dice en vez de ofrecerlo. */
  demo: boolean
}

export interface Document {
  id: string
  family_id: string
  /** Asignado a un hijo. Excluyente con `member_id`; ambos null = toda la familia. */
  child_id: string | null
  /** Asignado a un miembro adulto de la familia. */
  member_id: string | null
  name: string
  description: string | null
  category: DocCategory | null
  /**
   * Dónde está el archivo **para su proveedor**: el `fileId` de Google Drive.
   * Se llama `storage_path` por herencia del bucket de Supabase, que es lo que
   * había antes; el nombre se queda para no renombrar una columna en producción.
   */
  storage_path: string
  storage_provider: StorageProviderId
  /**
   * En el Drive de quién vive el archivo. Es a esta persona a la que se le pide
   * el token prestado para servirlo al resto de la familia, así que si se
   * desconecta, el documento deja de poder abrirse (la ficha se queda).
   */
  storage_owner: string | null
  mime_type: DocMimeType
  size_bytes: number
  /** Cuándo caduca, si caduca. La mayoría de documentos no lo hacen. */
  expires_on: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type TaskPriority  = 'high' | 'medium' | 'low'
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'

// ─── Draft types ──────────────────────────────────────────────────────────────

export interface ChildDraft {
  name: string
  birth_date: string
  color: string
  kind: PersonKind
}

export interface EventDraft {
  title: string
  description: string
  date: string
  all_day: boolean
  start_time: string
  end_time: string
  child_id: string | null
  member_id: string | null
  kind: EventKind
  /** Último día, solo en vacaciones. En un evento normal manda `end_time`. */
  end_date: string
  /** Año de nacimiento, solo en cumpleaños y opcional. Cadena vacía = no se sabe. */
  birth_year: string
}

export interface TaskDraft {
  title: string
  notes: string
  priority: TaskPriority
  due_date: string
  recurrence: TaskRecurrence
  recurrence_end: string
  child_id: string | null
  member_id: string | null
}

export interface MealDraft {
  date: string
  slot: MealSlot
  name: string
  second_course: string
  dessert: string
  notes: string
}

export interface ListDraft {
  name: string
  emoji: string
}

export interface NoteDraft {
  title: string
  body: string
  emoji: string
  pinned: boolean
}

export interface BudgetDraft {
  name: string
  emoji: string
  /**
   * Lo que se teclea, tal cual: "300", "300,50", "1.200". A céntimos lo pasa
   * `parseAmountToCents` al guardar, en un solo sitio, para que el mock y
   * Supabase no puedan interpretarlo distinto.
   */
  monthly_limit: string
}

export interface ExpenseDraft {
  kind: MovementKind
  amount: string
  date: string
  description: string
  /**
   * Vacío = sin tope. En un ingreso es **siempre** null: el formulario ni
   * pregunta, y la base lo rechazaría si llegara con valor.
   */
  budget_id: string | null
  child_id: string | null
  member_id: string | null
}

export interface FixedEntryDraft {
  kind: MovementKind
  name: string
  emoji: string
  /** Lo que se teclea. A céntimos lo pasa `parseAmountToCents` al guardar. */
  amount: string
  child_id: string | null
  member_id: string | null
}

export interface QuoteDraft {
  title: string
  provider: string
  amount: string
  status: QuoteStatus
  /** Vacío = no dice hasta cuándo vale. */
  valid_until: string
  notes: string
}

export interface ListItemDraft {
  text: string
  /**
   * Mover el ítem a otra lista. Solo al editar y solo dentro de la familia: la
   * base lo exige con un trigger (`check_list_item_family`, migración 007).
   * Sin valor, el ítem se queda donde está.
   */
  list_id?: string
}

export interface DocumentDraft {
  name: string
  description: string
  category: DocCategory | ''
  child_id: string | null
  member_id: string | null
  mime_type: DocMimeType
  size_bytes: number
  /** Vacío = no caduca. */
  expires_on: string
  file?: File
}

// ─── Entity types ─────────────────────────────────────────────────────────────

export interface Task {
  id: string
  family_id: string
  /** Asignada a un hijo. Excluyente con `member_id`; ambos null = toda la familia. */
  child_id: string | null
  /** Asignada a un miembro adulto de la familia. */
  member_id: string | null
  title: string
  notes: string | null
  priority: TaskPriority
  due_date: string | null
  recurrence: TaskRecurrence
  recurrence_end: string | null
  completed: boolean
  completed_at: string | null
  /** Quién la dio por hecha. `completed_at` decía cuándo, pero no quién. */
  completed_by: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
