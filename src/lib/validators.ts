import { VALID_MIME_TYPES, MAX_DOC_SIZE } from './constants'
import { isRangeKind } from './events'
import type { ChildDraft, EventDraft, TaskDraft, MealDraft, ListDraft, ListItemDraft } from '@/types'

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

// ─── Familia ──────────────────────────────────────────────────────────────────

/** Devuelve el mensaje de error o null si el nombre es válido. */
export function validateFamilyName(name: string): string | null {
  if (!name.trim()) return 'El nombre de la familia no puede estar vacío.'
  return null
}

// ─── Hijos ────────────────────────────────────────────────────────────────────

/** Devuelve el mensaje de error o null si el draft es válido. */
export function validateChildDraft(draft: ChildDraft): string | null {
  if (!draft.name.trim())
    return draft.kind === 'adulto'
      ? 'El nombre del adulto no puede estar vacío.'
      : 'El nombre del hijo no puede estar vacío.'
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
  // Solo un plan necesita nombre. Unas vacaciones o un descanso ya dicen lo que
  // son por el tipo, y `eventTitleOr` les pone el nombre al guardar.
  if (draft.kind === 'evento' && !draft.title.trim()) return 'El título es obligatorio.'
  if (!draft.date) return 'La fecha es obligatoria.'
  if (isRangeKind(draft.kind) && (!draft.end_date || draft.end_date < draft.date))
    return 'La fecha final debe ser posterior o igual a la inicial.'
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

// ─── Listas ───────────────────────────────────────────────────────────────────

export function validateListDraft(draft: ListDraft): string | null {
  if (!draft.name.trim()) return 'El nombre de la lista no puede estar vacío.'
  return null
}

// ─── Ítems de lista ───────────────────────────────────────────────────────────

export function validateListItemDraft(draft: ListItemDraft): string | null {
  if (!draft.text.trim()) return 'El texto es obligatorio.'
  return null
}

// ─── Vuelta al sitio después de entrar ────────────────────────────────────────

/**
 * A dónde se puede mandar a alguien después de validar un enlace de correo.
 *
 * El `?next=` de la URL lo escribe quien manda el enlace, no la app, así que un
 * `next=https://otra-cosa.example` convertiría un correo legítimo de Nido en un
 * salto a una web ajena justo después de iniciar sesión — que es el momento en
 * el que uno se cree lo que ve. Solo se aceptan rutas de la propia app: una
 * barra y nada de `//`, que es la forma corta de decir "otro dominio".
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return '/home'
  if (!next.startsWith('/')) return '/home'
  if (next.startsWith('//') || next.startsWith('/\\')) return '/home'
  return next
}
