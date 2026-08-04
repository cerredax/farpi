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

/**
 * Colores de las personas de la familia, adultos e hijos. El nombre no es
 * decorativo: es la etiqueta accesible de cada botón del selector, que antes
 * leía el hexadecimal.
 */
export const PERSON_COLORS: { value: string; label: string }[] = [
  { value: '#D8A48F', label: 'Terracota' },
  { value: '#8BA888', label: 'Verde salvia' },
  { value: '#E9C46A', label: 'Mostaza' },
  { value: '#7EB8D4', label: 'Azul cielo' },
  { value: '#B39DDB', label: 'Lavanda' },
  { value: '#F4A261', label: 'Naranja' },
  { value: '#A8D5A2', label: 'Verde menta' },
  { value: '#F08080', label: 'Coral' },
  { value: '#EC7FA9', label: 'Rosa' },
  { value: '#F2A9C4', label: 'Rosa palo' },
  { value: '#D45D8E', label: 'Frambuesa' },
  { value: '#C9A0DC', label: 'Lila' },
]

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
 * A partir de esta cantidad de ítems aparece el buscador. Lo comparten el de
 * una lista y el que cruza todas. Empezó en 6 y bajó a 3: con seis costaba
 * encontrarlo, y esconder una herramienta hasta que hace falta solo funciona si
 * el usuario sabe que existe.
 */
export const MINIMO_PARA_BUSCAR = 3

/**
 * Cuántos platos ya cocinados se ofrecen al planificar una comida. Muy por
 * encima de las 5 sugerencias sueltas del resto de formularios: aquí el bloque
 * hace de catálogo buscable —se teclea y se filtra— y el menú de una familia
 * gira sobre bastantes más de cinco platos.
 */
export const PLATOS_SUGERIDOS = 30

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
