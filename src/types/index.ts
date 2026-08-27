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
export type EventKind = 'evento' | 'vacaciones' | 'descanso' | 'festivo'

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

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealPlan {
  id: string
  family_id: string
  date: string
  slot: MealSlot
  name: string
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
  notes: string
}

export interface ListDraft {
  name: string
  emoji: string
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
