import { VALID_MIME_TYPES, MAX_DOC_SIZE } from './constants'
import type { ChildDraft, EventDraft, TaskDraft, MealDraft, ListItemDraft } from '@/types'

// ─── Email ────────────────────────────────────────────────────────────────────

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

// ─── Documentos ───────────────────────────────────────────────────────────────

export function validateDocumentFile(file: File): { ok: true } | { ok: false; message: string } {
  if (!VALID_MIME_TYPES.includes(file.type as typeof VALID_MIME_TYPES[number])) {
    return { ok: false, message: 'Solo se admiten PDF, JPG o PNG.' }
  }
  if (file.size > MAX_DOC_SIZE) {
    return { ok: false, message: 'El archivo supera el límite de 20 MB.' }
  }
  return { ok: true }
}

export function normalizeDocumentName(name: string): string {
  return name.trim()
}

// ─── Familia ──────────────────────────────────────────────────────────────────

/** Devuelve el mensaje de error o null si el nombre es válido. */
export function validateFamilyName(name: string): string | null {
  if (!name.trim()) return 'El nombre de la familia no puede estar vacío.'
  return null
}

// ─── Hijos ────────────────────────────────────────────────────────────────────

/** Devuelve el mensaje de error o null si el draft es válido. */
export function validateChildDraft(draft: ChildDraft): string | null {
  if (!draft.name.trim()) return 'El nombre del hijo no puede estar vacío.'
  return null
}

// ─── Comidas ──────────────────────────────────────────────────────────────────

/** Devuelve el mensaje de error o null si el draft es válido. */
export function validateMealDraft(draft: MealDraft): string | null {
  if (!draft.date) return 'La fecha es obligatoria.'
  if (!draft.name.trim()) return 'El nombre del plato no puede estar vacío.'
  return null
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

export function validateEventDraft(draft: EventDraft): string | null {
  if (!draft.title.trim()) return 'El título es obligatorio.'
  if (!draft.date) return 'La fecha es obligatoria.'
  if (!draft.all_day && draft.end_time && draft.end_time <= draft.start_time)
    return 'La hora de fin debe ser posterior a la de inicio.'
  return null
}

// ─── Tareas ───────────────────────────────────────────────────────────────────

export function validateTaskDraft(draft: TaskDraft): string | null {
  if (!draft.title.trim()) return 'El título es obligatorio.'
  if (draft.recurrence !== 'none' && draft.recurrence_end && draft.due_date && draft.recurrence_end < draft.due_date)
    return 'La fecha de fin de recurrencia debe ser posterior a la fecha de inicio.'
  return null
}

// ─── Ítems de lista ───────────────────────────────────────────────────────────

export function validateListItemDraft(draft: ListItemDraft): string | null {
  if (!draft.text.trim()) return 'El texto es obligatorio.'
  return null
}
