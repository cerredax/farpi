import { test, expect } from '@playwright/test'
import {
  selectItemMatches,
  selectMealsByCell,
  selectOccupiedMealSlots,
  selectPendingItems,
  selectPendingTasks,
  selectSortedMeals,
  selectSuggestions,
  selectTaskGroups,
  selectTodayEvents,
  selectTodayMeals,
  selectUpcomingEvents,
} from '@/lib/selectors'
import { getLocalDateString } from '@/lib/date-utils'
import { event, list, listItem, meal, task } from './fixtures'

test.describe('selectTaskGroups', () => {
  const HOY = '2026-08-03'

  test('separa pendientes de completadas', () => {
    const { pending, completed } = selectTaskGroups(
      [task({ title: 'a' }), task({ title: 'b', completed: true })], HOY,
    )
    expect(pending.map(t => t.title)).toEqual(['a'])
    expect(completed.map(t => t.title)).toEqual(['b'])
  })

  test('las vencidas van primero, aunque tengan prioridad baja', () => {
    const { pending } = selectTaskGroups([
      task({ title: 'urgente-futura', priority: 'high', due_date: '2026-08-10' }),
      task({ title: 'vencida', priority: 'low', due_date: '2026-08-01' }),
    ], HOY)
    expect(pending.map(t => t.title)).toEqual(['vencida', 'urgente-futura'])
  })

  test('entre no vencidas ordena por fecha ascendente', () => {
    const { pending } = selectTaskGroups([
      task({ title: 'tarde', due_date: '2026-08-20' }),
      task({ title: 'pronto', due_date: '2026-08-05' }),
    ], HOY)
    expect(pending.map(t => t.title)).toEqual(['pronto', 'tarde'])
  })

  test('a igual fecha, ordena por prioridad alta → media → baja', () => {
    const { pending } = selectTaskGroups([
      task({ title: 'baja', priority: 'low', due_date: '2026-08-05' }),
      task({ title: 'alta', priority: 'high', due_date: '2026-08-05' }),
      task({ title: 'media', priority: 'medium', due_date: '2026-08-05' }),
    ], HOY)
    expect(pending.map(t => t.title)).toEqual(['alta', 'media', 'baja'])
  })

  test('las tareas sin fecha van al final', () => {
    const { pending } = selectTaskGroups([
      task({ title: 'sin-fecha', priority: 'high' }),
      task({ title: 'con-fecha', priority: 'low', due_date: '2026-08-20' }),
    ], HOY)
    expect(pending.map(t => t.title)).toEqual(['con-fecha', 'sin-fecha'])
  })

  test('entre las de sin fecha, manda la prioridad', () => {
    const { pending } = selectTaskGroups([
      task({ title: 'baja', priority: 'low' }),
      task({ title: 'alta', priority: 'high' }),
    ], HOY)
    expect(pending.map(t => t.title)).toEqual(['alta', 'baja'])
  })

  test('las completadas se ordenan por fecha de completado descendente', () => {
    const { completed } = selectTaskGroups([
      task({ title: 'antigua', completed: true, completed_at: '2026-08-01T10:00:00Z' }),
      task({ title: 'reciente', completed: true, completed_at: '2026-08-03T10:00:00Z' }),
    ], HOY)
    expect(completed.map(t => t.title)).toEqual(['reciente', 'antigua'])
  })

  test('no altera el array recibido', () => {
    const original = [task({ title: 'b', due_date: '2026-08-20' }), task({ title: 'a', due_date: '2026-08-05' })]
    const copia = [...original]
    selectTaskGroups(original, HOY)
    expect(original).toEqual(copia)
  })
})

test.describe('selectPendingTasks', () => {
  test('deja fuera las completadas', () => {
    const r = selectPendingTasks([task({ title: 'a' }), task({ title: 'b', completed: true })])
    expect(r.map(t => t.title)).toEqual(['a'])
  })
})

test.describe('selectPendingItems', () => {
  test('añade el nombre de la lista y descarta los marcados', () => {
    const l = list({ id: 'l1', name: 'Compra' })
    const r = selectPendingItems(
      [listItem({ list_id: 'l1', text: 'leche' }), listItem({ list_id: 'l1', text: 'pan', completed: true })],
      [l],
    )
    expect(r).toHaveLength(1)
    expect(r[0].text).toBe('leche')
    expect(r[0].list_name).toBe('Compra')
  })

  test('si la lista no existe, el nombre queda vacío en vez de romper', () => {
    const r = selectPendingItems([listItem({ list_id: 'fantasma' })], [])
    expect(r[0].list_name).toBe('')
  })
})

test.describe('comidas', () => {
  test('selectTodayMeals filtra por la fecha dada', () => {
    const r = selectTodayMeals([meal({ date: '2026-08-03' }), meal({ date: '2026-08-04' })], '2026-08-03')
    expect(r).toHaveLength(1)
  })

  test('selectSortedMeals ordena desayuno, comida, merienda y cena', () => {
    const r = selectSortedMeals([
      meal({ slot: 'dinner' }), meal({ slot: 'breakfast' }), meal({ slot: 'snack' }), meal({ slot: 'lunch' }),
    ])
    expect(r.map(m => m.slot)).toEqual(['breakfast', 'lunch', 'snack', 'dinner'])
  })

  test('selectSortedMeals no altera el array recibido', () => {
    const original = [meal({ slot: 'dinner' }), meal({ slot: 'breakfast' })]
    const copia = [...original]
    selectSortedMeals(original)
    expect(original).toEqual(copia)
  })

  test('selectMealsByCell indexa por fecha y franja', () => {
    const m = meal({ date: '2026-08-03', slot: 'lunch' })
    expect(selectMealsByCell([m]).get('2026-08-03:lunch')).toBe(m)
  })

  test('selectOccupiedMealSlots devuelve las franjas ocupadas de un día', () => {
    const comidas = [meal({ date: '2026-08-03', slot: 'lunch' }), meal({ date: '2026-08-04', slot: 'dinner' })]
    expect(selectOccupiedMealSlots(comidas, '2026-08-03')).toEqual(['lunch'])
  })

  test('selectOccupiedMealSlots sin fecha devuelve vacío', () => {
    expect(selectOccupiedMealSlots([meal()], undefined)).toEqual([])
  })
})

test.describe('eventos', () => {
  test('selectTodayEvents devuelve solo los de hoy', () => {
    const hoy = getLocalDateString()
    const r = selectTodayEvents([
      event({ title: 'hoy', start_at: `${hoy}T10:00:00` }),
      event({ title: 'otro', start_at: '2020-01-01T10:00:00' }),
    ])
    expect(r.map(e => e.title)).toEqual(['hoy'])
  })

  test('selectTodayEvents deja fuera las vacaciones: durarían días y no son un plan del día', () => {
    const hoy = getLocalDateString()
    const r = selectTodayEvents([
      event({ title: 'cita', start_at: `${hoy}T10:00:00` }),
      event({ title: 'playa', kind: 'vacaciones', all_day: true, start_at: `${hoy}T00:00:00`, end_at: `${hoy}T00:00:00` }),
    ])
    expect(r.map(e => e.title)).toEqual(['cita'])
  })

  test('selectUpcomingEvents excluye hoy y el pasado, y ordena por fecha', () => {
    const manana = getLocalDateString(new Date(Date.now() + 86400000))
    const pasado = getLocalDateString(new Date(Date.now() + 3 * 86400000))
    const hoy = getLocalDateString()
    const r = selectUpcomingEvents([
      event({ title: 'dentro-de-3', start_at: `${pasado}T10:00:00` }),
      event({ title: 'manana', start_at: `${manana}T10:00:00` }),
      event({ title: 'hoy', start_at: `${hoy}T10:00:00` }),
      event({ title: 'ayer', start_at: '2020-01-01T10:00:00' }),
    ])
    expect(r.map(e => e.title)).toEqual(['manana', 'dentro-de-3'])
  })

  test('selectUpcomingEvents respeta el límite', () => {
    const eventos = Array.from({ length: 8 }, (_, i) =>
      event({ start_at: `${getLocalDateString(new Date(Date.now() + (i + 1) * 86400000))}T10:00:00` }))
    expect(selectUpcomingEvents(eventos)).toHaveLength(5)
    expect(selectUpcomingEvents(eventos, 2)).toHaveLength(2)
  })
})

test.describe('selectItemMatches', () => {
  const compra = list({ id: 'l-compra', name: 'Compra', emoji: '🛒' })
  const ferre  = list({ id: 'l-ferre',  name: 'Ferretería', emoji: '🔧' })
  const listas = [compra, ferre]

  const items = [
    listItem({ list_id: 'l-compra', text: 'Pilas AA', sort_order: 1 }),
    listItem({ list_id: 'l-ferre',  text: 'Pilas de botón', sort_order: 0, completed: true }),
    listItem({ list_id: 'l-compra', text: 'Plátanos', sort_order: 2 }),
  ]

  test('sin consulta no devuelve nada (no es un listado, es una búsqueda)', () => {
    expect(selectItemMatches(items, listas, '')).toEqual([])
    expect(selectItemMatches(items, listas, '   ')).toEqual([])
  })

  test('encuentra en todas las listas y dice de cuál sale', () => {
    const r = selectItemMatches(items, listas, 'pilas')
    expect(r.map(m => m.text)).toEqual(['Pilas AA', 'Pilas de botón'])
    expect(r[0].list_name).toBe('Compra')
    expect(r[0].list_emoji).toBe('🛒')
  })

  test('los pendientes van antes que los hechos', () => {
    const r = selectItemMatches(items, listas, 'pilas')
    expect(r.map(m => m.completed)).toEqual([false, true])
  })

  test('ignora tildes y mayúsculas en ambos sentidos', () => {
    expect(selectItemMatches(items, listas, 'platano').map(m => m.text)).toEqual(['Plátanos'])
    expect(selectItemMatches(items, listas, 'PLÁTANO').map(m => m.text)).toEqual(['Plátanos'])
  })

  test('busca por trozo suelto, no solo por el principio', () => {
    expect(selectItemMatches(items, listas, 'boton').map(m => m.text)).toEqual(['Pilas de botón'])
  })

  test('un ítem de una lista que ya no existe no revienta', () => {
    const huerfano = [listItem({ list_id: 'no-existe', text: 'Pilas sueltas' })]
    const r = selectItemMatches(huerfano, listas, 'pilas')
    expect(r[0].list_name).toBe('')
    expect(r[0].list_emoji).toBeNull()
  })
})

test.describe('selectSuggestions', () => {
  const historial = [
    'Lentejas', 'lentejas', 'Lentejas',
    'Pasta boloñesa', 'Pasta boloñesa',
    'Merluza al horno',
    '  ', '',
  ]

  test('sin consulta devuelve lo más repetido primero', () => {
    expect(selectSuggestions(historial, '')).toEqual(['Lentejas', 'Pasta boloñesa', 'Merluza al horno'])
  })

  test('agrupa ignorando mayúsculas y se queda con la grafía más usada', () => {
    expect(selectSuggestions(['lentejas', 'Lentejas', 'Lentejas'], '')).toEqual(['Lentejas'])
  })

  test('descarta las cadenas vacías o de solo espacios', () => {
    expect(selectSuggestions(['', '   '], '')).toEqual([])
  })

  test('con consulta filtra, sin exigir tildes', () => {
    expect(selectSuggestions(historial, 'bolo')).toEqual(['Pasta boloñesa'])
    expect(selectSuggestions(historial, 'BOLOÑ')).toEqual(['Pasta boloñesa'])
  })

  test('no se sugiere a sí mismo lo ya escrito entero', () => {
    expect(selectSuggestions(historial, 'Lentejas')).toEqual([])
    expect(selectSuggestions(historial, 'lentejas ')).toEqual([])
  })

  test('respeta el límite', () => {
    const muchos = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    expect(selectSuggestions(muchos, '')).toHaveLength(5)
    expect(selectSuggestions(muchos, '', 2)).toHaveLength(2)
  })

  test('a igual frecuencia ordena alfabéticamente, para que no baile', () => {
    expect(selectSuggestions(['Pera', 'Manzana', 'Naranja'], '')).toEqual(['Manzana', 'Naranja', 'Pera'])
  })
})
