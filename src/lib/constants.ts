import type { DocCategory, DocMimeType, MealSlot, TaskPriority, TaskRecurrence } from '@/types'

// ─── Documentos ───────────────────────────────────────────────────────────────

export const DOC_CATEGORIES: { key: DocCategory; label: string; emoji: string }[] = [
  { key: 'salud',    label: 'Salud',    emoji: '🏥' },
  { key: 'colegio',  label: 'Colegio',  emoji: '🎒' },
  { key: 'personal', label: 'Personal', emoji: '👤' },
  { key: 'otros',    label: 'Otros',    emoji: '📄' },
]

export const VALID_MIME_TYPES: DocMimeType[] = ['application/pdf', 'image/jpeg', 'image/png']

export const MAX_DOC_SIZE = 20 * 1024 * 1024 // 20 MB

/**
 * Color que representa "toda la familia" (eventos y documentos sin hijo
 * asignado). Es un valor de datos, como los colores de los hijos: viaja en
 * atributos `style`, no en clases. Coincide a propósito con el token `sand`.
 */
export const FAMILY_COLOR = '#E9C46A'

// ─── Comidas ──────────────────────────────────────────────────────────────────

export const MEAL_SLOTS: { key: MealSlot; label: string; emoji: string; order: number }[] = [
  { key: 'breakfast', label: 'Desayuno', emoji: '☀️',  order: 0 },
  { key: 'lunch',     label: 'Comida',   emoji: '🍽️', order: 1 },
  { key: 'snack',     label: 'Merienda', emoji: '🍎',  order: 2 },
  { key: 'dinner',    label: 'Cena',     emoji: '🌙',  order: 3 },
]

/** Acceso por clave a la franja horaria, para no recorrer `MEAL_SLOTS` en cada render. */
export const MEAL_SLOT_META = Object.fromEntries(
  MEAL_SLOTS.map(s => [s.key, { label: s.label, emoji: s.emoji, order: s.order }])
) as Record<MealSlot, { label: string; emoji: string; order: number }>

// ─── Tareas ───────────────────────────────────────────────────────────────────

export const TASK_RECURRENCES: { value: TaskRecurrence; label: string; shortLabel: string }[] = [
  { value: 'none',    label: 'No se repite', shortLabel: '' },
  { value: 'daily',   label: 'Diaria',       shortLabel: 'Diaria' },
  { value: 'weekly',  label: 'Semanal',      shortLabel: 'Semanal' },
  { value: 'monthly', label: 'Mensual',      shortLabel: 'Mensual' },
]

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'high',   label: 'Alta',  color: '#D96C6C' },
  { value: 'medium', label: 'Media', color: '#E9C46A' },
  { value: 'low',    label: 'Baja',  color: '#8BA888' },
]

/**
 * A partir de esta cantidad de ítems, buscar compensa más que ir mirando.
 * Lo comparten el buscador de una lista y el que cruza todas.
 */
export const MINIMO_PARA_BUSCAR = 6

// ─── Rutas ────────────────────────────────────────────────────────────────────

export const ROUTES = {
  home:     '/home',
  calendar: '/calendar',
  tasks:    '/tasks',
  lists:    '/lists',
  meals:    '/meals',
  docs:     '/docs',
  settings: '/settings',
} as const
