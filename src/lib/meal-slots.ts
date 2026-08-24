import { MEAL_SLOTS } from './constants'
import type { MealPlan, MealSlot } from '@/types'

/**
 * Qué franjas de comida se ven.
 *
 * La familia elige en Ajustes cuáles quiere ver (migración 019). Ocultar una no
 * borra nada: lo apuntado en ella sigue en la base y vuelve a salir si se
 * reactiva. Aquí vive todo lo que hay que saber de esa lista para que las
 * pantallas no lo repitan cada una a su manera.
 */

/** Las cuatro, en el orden del día, que es el de `MEAL_SLOTS`. */
export const ALL_MEAL_SLOTS: MealSlot[] = MEAL_SLOTS.map(slot => slot.key)

const ORDEN = new Map(MEAL_SLOTS.map((slot, i) => [slot.key, i]))

function esFranja(value: unknown): value is MealSlot {
  return typeof value === 'string' && ORDEN.has(value as MealSlot)
}

/**
 * Deja la lista en su forma canónica: solo franjas válidas, sin repetidos y en
 * el orden del día. Si no queda ninguna, devuelve las cuatro.
 *
 * Lo de «si no queda ninguna» no es defensa por defender, son tres casos reales:
 * una familia creada antes de la 019 (la columna no existe y llega `undefined`),
 * un `localStorage` del modo demo guardado con el esquema anterior, y el propio
 * intento de dejarlo todo apagado. Con cero franjas la pantalla de comidas se
 * queda sin filas y sin manera de volver, así que el caso vacío significa
 * «todas», nunca «ninguna».
 */
export function normalizeMealSlots(value: unknown): MealSlot[] {
  if (!Array.isArray(value)) return [...ALL_MEAL_SLOTS]
  const limpias = [...new Set(value.filter(esFranja))]
  if (limpias.length === 0) return [...ALL_MEAL_SLOTS]
  return limpias.sort((a, b) => ORDEN.get(a)! - ORDEN.get(b)!)
}

/**
 * Enciende o apaga una franja. Devuelve la lista tal cual si el cambio dejaría
 * la familia sin ninguna: la regla es la misma que la del último admin —siempre
 * queda al menos una— y se comprueba aquí, en la UI y en el `check` de la 019.
 */
export function toggleMealSlot(slots: MealSlot[], slot: MealSlot): MealSlot[] {
  const actuales = normalizeMealSlots(slots)
  if (!actuales.includes(slot)) return normalizeMealSlots([...actuales, slot])
  if (actuales.length === 1) return actuales
  return actuales.filter(s => s !== slot)
}

/** Si se puede apagar esa franja, o es la única que queda encendida. */
export function canHideMealSlot(slots: MealSlot[], slot: MealSlot): boolean {
  const actuales = normalizeMealSlots(slots)
  return actuales.includes(slot) && actuales.length > 1
}

/**
 * Las franjas visibles con su etiqueta y su emoji, listas para pintar filas.
 * Las pantallas de comidas recorren esto en vez de `MEAL_SLOTS`.
 */
export function visibleMealSlots(slots: MealSlot[]): typeof MEAL_SLOTS {
  const visibles = new Set(normalizeMealSlots(slots))
  return MEAL_SLOTS.filter(slot => visibles.has(slot.key))
}

/**
 * Las franjas que enseña el formulario. Son las visibles, más la de la comida
 * que se está editando: una comida guardada en una franja que luego se ocultó
 * tiene que poder abrirse y guardarse, o queda inaccesible.
 */
export function editableMealSlots(slots: MealSlot[], editing?: MealSlot): typeof MEAL_SLOTS {
  const visibles = new Set(normalizeMealSlots(slots))
  if (editing) visibles.add(editing)
  return MEAL_SLOTS.filter(slot => visibles.has(slot.key))
}

/** Quita las comidas de las franjas ocultas. No borra nada: solo no las pinta. */
export function filterMealsBySlots(meals: MealPlan[], slots: MealSlot[]): MealPlan[] {
  const visibles = new Set(normalizeMealSlots(slots))
  return meals.filter(meal => visibles.has(meal.slot))
}
