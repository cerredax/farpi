import { test, expect } from '@playwright/test'
import {
  ALL_MEAL_SLOTS,
  DEFAULT_MEAL_SLOTS,
  canHideMealSlot,
  editableMealSlots,
  filterMealsBySlots,
  mealCourses,
  mealSlotHasCourses,
  normalizeMealSlots,
  toggleMealSlot,
  visibleMealSlots,
} from '@/lib/meal-slots'
import type { MealPlan, MealSlot } from '@/types'

// El orden canónico es el del día, no el alfabético ni el de la base: es el que
// se ve en la rejilla de la semana.
test('las franjas van en el orden del día', () => {
  expect(ALL_MEAL_SLOTS).toEqual(['breakfast', 'lunch', 'school', 'snack', 'dinner'])
})

// El comedor existe pero no viene puesto: en una casa donde nadie come fuera
// sería una fila vacía que la app pide llenar siete veces por semana.
test('una familia arranca con las cuatro de siempre, sin comedor', () => {
  expect(DEFAULT_MEAL_SLOTS).toEqual(['breakfast', 'lunch', 'snack', 'dinner'])
})

test('normalizar ordena por el día, sin importar cómo llegue', () => {
  expect(normalizeMealSlots(['dinner', 'breakfast', 'snack'])).toEqual(['breakfast', 'snack', 'dinner'])
})

test('normalizar quita repetidos y valores que no son franjas', () => {
  expect(normalizeMealSlots(['lunch', 'lunch', 'brunch', 42, null])).toEqual(['lunch'])
})

// Los tres casos reales de lista vacía: una familia de antes de la 019 (la
// columna no existe y llega undefined), un localStorage viejo del modo demo, y
// el intento de apagarlas todas. En los tres se ven las de siempre, nunca
// ninguna: sin franjas la pantalla de comidas se queda sin filas y sin manera de
// volver. Y tampoco se cuela el comedor por la puerta de atrás.
for (const [nombre, valor] of [
  ['undefined', undefined],
  ['null', null],
  ['lista vacía', []],
  ['solo basura', ['brunch', 'tapas']],
  ['ni siquiera un array', 'lunch'],
] as const) {
  test(`con ${nombre} se ven las de siempre`, () => {
    expect(normalizeMealSlots(valor)).toEqual(DEFAULT_MEAL_SLOTS)
  })
}

test('normalizar devuelve una copia: nadie puede tocar la lista de siempre', () => {
  const copia = normalizeMealSlots(undefined)
  copia.push('lunch')
  expect(DEFAULT_MEAL_SLOTS).toEqual(['breakfast', 'lunch', 'snack', 'dinner'])
})

test('apagar una franja la quita y deja el resto en orden', () => {
  expect(toggleMealSlot(DEFAULT_MEAL_SLOTS, 'snack')).toEqual(['breakfast', 'lunch', 'dinner'])
})

// El comedor va donde va en el día: a la hora de comer, no al final de la lista.
test('encender el comedor lo pone justo detrás de la comida', () => {
  expect(toggleMealSlot(DEFAULT_MEAL_SLOTS, 'school'))
    .toEqual(['breakfast', 'lunch', 'school', 'snack', 'dinner'])
})

test('encender una franja la mete en su sitio, no al final', () => {
  expect(toggleMealSlot(['breakfast', 'dinner'], 'snack')).toEqual(['breakfast', 'snack', 'dinner'])
})

// La misma regla que la del último admin: siempre queda una.
test('la última franja encendida no se puede apagar', () => {
  expect(toggleMealSlot(['lunch'], 'lunch')).toEqual(['lunch'])
  expect(canHideMealSlot(['lunch'], 'lunch')).toBe(false)
  expect(canHideMealSlot(['lunch', 'dinner'], 'lunch')).toBe(true)
})

test('una franja apagada no se puede "ocultar": ya lo está', () => {
  expect(canHideMealSlot(['lunch'], 'dinner')).toBe(false)
})

test('las visibles llegan con etiqueta y emoji, en orden', () => {
  const visibles = visibleMealSlots(['dinner', 'breakfast'])
  expect(visibles.map(s => s.key)).toEqual(['breakfast', 'dinner'])
  expect(visibles.map(s => s.label)).toEqual(['Desayuno', 'Cena'])
})

// Una merienda apuntada antes de ocultar la merienda tiene que poder abrirse y
// guardarse; si el formulario solo ofreciera las visibles, quedaría inaccesible.
test('el formulario añade la franja de lo que se está editando', () => {
  const franjas = editableMealSlots(['breakfast', 'lunch'], 'snack')
  expect(franjas.map(s => s.key)).toEqual(['breakfast', 'lunch', 'snack'])
})

test('sin nada en edición, el formulario ofrece solo las visibles', () => {
  expect(editableMealSlots(['lunch'], undefined).map(s => s.key)).toEqual(['lunch'])
})

test('editar algo de una franja visible no la duplica', () => {
  expect(editableMealSlots(['breakfast', 'lunch'], 'lunch').map(s => s.key)).toEqual(['breakfast', 'lunch'])
})

const comida = (id: string, slot: MealSlot): MealPlan => ({
  id,
  family_id: 'f1',
  date: '2026-08-24',
  slot,
  name: `Plato ${id}`,
  second_course: null,
  dessert: null,
  notes: null,
  created_by: 'u1',
  created_at: '',
  updated_at: '',
})

test('las comidas de una franja oculta no se pintan', () => {
  const comidas = [comida('1', 'breakfast'), comida('2', 'snack'), comida('3', 'dinner')]
  expect(filterMealsBySlots(comidas, ['breakfast', 'dinner']).map(m => m.id)).toEqual(['1', '3'])
})

// Filtrar es dejar de pintar, no borrar: la lista de origen se queda entera.
test('filtrar no toca la lista que recibe', () => {
  const comidas = [comida('1', 'snack')]
  filterMealsBySlots(comidas, ['lunch'])
  expect(comidas).toHaveLength(1)
})

// ─── Platos ───────────────────────────────────────────────────────────────────

test('solo la comida y el comedor se apuntan por platos', () => {
  expect(mealSlotHasCourses('school')).toBe(true)
  expect(mealSlotHasCourses('lunch')).toBe(true)
  expect(mealSlotHasCourses('breakfast')).toBe(false)
  expect(mealSlotHasCourses('snack')).toBe(false)
  expect(mealSlotHasCourses('dinner')).toBe(false)
})

test('los platos salen en orden: primero, segundo y postre', () => {
  const menu = { name: 'Sopa', second_course: 'Pollo', dessert: 'Fruta' }
  expect(mealCourses(menu)).toEqual(['Sopa', 'Pollo', 'Fruta'])
})

// Una tostada no tiene segundo, y ahí no hay que pintar una línea vacía.
test('los platos que no hay no dejan hueco', () => {
  expect(mealCourses({ name: 'Tostadas', second_course: null, dessert: null })).toEqual(['Tostadas'])
  expect(mealCourses({ name: 'Sopa', second_course: '   ', dessert: 'Fruta' })).toEqual(['Sopa', 'Fruta'])
})
