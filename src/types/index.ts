export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type DocCategory = 'salud' | 'colegio' | 'personal' | 'otros'
export type DocMimeType = 'application/pdf' | 'image/jpeg' | 'image/png'

export interface Family {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  display_name: string
  avatar_url: string | null
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

export interface Child {
  id: string
  family_id: string
  name: string
  birth_date: string | null
  color: string
  created_at: string
}

export interface Event {
  id: string
  family_id: string
  child_id: string | null
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  all_day: boolean
  color: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface List {
  id: string
  family_id: string
  name: string
  emoji: string | null
  color: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ListItem {
  id: string
  list_id: string
  family_id: string
  text: string
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  sort_order: number
  created_by: string
  created_at: string
}

export type PendingItem = ListItem & { list_name: string }

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealPlan {
  id: string
  family_id: string
  date: string
  slot: MealSlot
  name: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  family_id: string
  child_id: string | null
  name: string
  description: string | null
  category: DocCategory | null
  storage_path: string
  mime_type: DocMimeType
  size_bytes: number
  created_by: string
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
}

export interface EventDraft {
  title: string
  description: string
  date: string
  all_day: boolean
  start_time: string
  end_time: string
  child_id: string | null
}

export interface TaskDraft {
  title: string
  notes: string
  priority: TaskPriority
  due_date: string
  recurrence: TaskRecurrence
  recurrence_end: string
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
}

export interface DocumentDraft {
  name: string
  description: string
  category: DocCategory | ''
  child_id: string | null
  mime_type: DocMimeType
  size_bytes: number
}

// ─── Entity types ─────────────────────────────────────────────────────────────

export interface Task {
  id: string
  family_id: string
  title: string
  notes: string | null
  priority: TaskPriority
  due_date: string | null
  recurrence: TaskRecurrence
  recurrence_end: string | null
  completed: boolean
  completed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}
