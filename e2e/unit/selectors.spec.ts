import { test, expect } from '@playwright/test'
import {
  selectItemMatches,
  selectListItemGroups,
  selectMealsByCell,
  selectOccupiedMealSlots,
  selectPendingItems,
  selectPendingItemsByList,
  selectPendingTasks,
  selectPendingTextsByList,
  selectSortedLists,
  selectTodayTasks,
  selectVisibleAbsences,
  selectVisibleBirthdays,
  selectSortedMeals,
  selectSuggestions,
  selectTaskGroups,
  selectTaskMatches,
  selectEventMatches,
  selectFamilySummary,
  selectExpiryState,
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

test.describe('selectTodayTasks', () => {
  const HOY = '2026-08-03'

  test('lo de hoy va a hoy y el futuro al resto', () => {
    const { hoy, resto } = selectTodayTasks(
      [task({ title: 'hoy', due_date: HOY }), task({ title: 'mañana', due_date: '2026-08-04' })],
      HOY,
    )
    expect(hoy.map(t => t.title)).toEqual(['hoy'])
    expect(resto.map(t => t.title)).toEqual(['mañana'])
  })

  test('lo vencido cuenta como de hoy, no como pasado', () => {
    const { hoy } = selectTodayTasks([task({ title: 'ayer', due_date: '2026-08-02' })], HOY)
    expect(hoy.map(t => t.title)).toEqual(['ayer'])
  })

  test('sin fecha va al resto: nadie ha dicho que toque hoy', () => {
    const { hoy, resto } = selectTodayTasks([task({ title: 'algún día', due_date: null })], HOY)
    expect(hoy).toHaveLength(0)
    expect(resto.map(t => t.title)).toEqual(['algún día'])
  })

  test('ninguna tarea se pierde por el camino', () => {
    const tareas = [
      task({ due_date: '2026-08-01' }), task({ due_date: HOY }),
      task({ due_date: '2026-09-01' }), task({ due_date: null }),
    ]
    const { hoy, resto } = selectTodayTasks(tareas, HOY)
    expect(hoy.length + resto.length).toBe(tareas.length)
  })
})

test.describe('selectPendingItemsByList', () => {
  const pendiente = (list_id: string, list_name: string, text: string, list_emoji: string | null = '🛒') =>
    ({ ...listItem({ list_id, text }), list_name, list_emoji })

  test('una cesta por lista con pendientes, con su icono y sin cuenta', () => {
    const r = selectPendingItemsByList([
      pendiente('l1', 'Compra', 'leche'), pendiente('l1', 'Compra', 'pan'),
      pendiente('l2', 'Farmacia', 'gasas', '💊'),
    ])
    expect(r).toEqual([
      { id: 'l1', name: 'Compra', emoji: '🛒' },
      { id: 'l2', name: 'Farmacia', emoji: '💊' },
    ])
  })

  test('orden alfabético: marcar algo no reordena las cestas', () => {
    const r = selectPendingItemsByList([
      pendiente('l1', 'Ferretería', 'tornillos'), pendiente('l1', 'Ferretería', 'tacos'),
      pendiente('l2', 'Compra', 'leche'),
    ])
    expect(r.map(c => c.name)).toEqual(['Compra', 'Ferretería'])
  })

  test('dos listas distintas con el mismo nombre no se funden', () => {
    const r = selectPendingItemsByList([
      pendiente('l1', 'Compra', 'leche'), pendiente('l2', 'Compra', 'tornillos'),
    ])
    expect(r).toHaveLength(2)
  })

  test('sin pendientes no hay cestas', () => {
    expect(selectPendingItemsByList([])).toEqual([])
  })
})

test.describe('selectSortedLists', () => {
  test('las que tienen pendientes van arriba, y cada grupo por orden alfabético', () => {
    const listas = [
      list({ id: 'l1', name: 'Viaje' }),
      list({ id: 'l2', name: 'Compra' }),
      list({ id: 'l3', name: 'Bricolaje' }),
    ]
    const items = [
      listItem({ list_id: 'l1', completed: false }),
      listItem({ list_id: 'l3', completed: true }),
    ]
    // Viaje tiene pendientes; Bricolaje solo cosas hechas, así que baja.
    expect(selectSortedLists(listas, items).map(l => l.name)).toEqual(['Viaje', 'Bricolaje', 'Compra'])
  })

  test('sin pendientes en ninguna, todo alfabético', () => {
    const listas = [list({ id: 'l1', name: 'Zapatos' }), list({ id: 'l2', name: 'Álbum' })]
    expect(selectSortedLists(listas, []).map(l => l.name)).toEqual(['Álbum', 'Zapatos'])
  })

  test('no muta el array que recibe', () => {
    const listas = [list({ id: 'l1', name: 'Zeta' }), list({ id: 'l2', name: 'Alfa' })]
    selectSortedLists(listas, [])
    expect(listas.map(l => l.name)).toEqual(['Zeta', 'Alfa'])
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

  test('selectTodayEvents deja fuera lo que ocupa un rango: duran días y no son un plan del día', () => {
    const hoy = getLocalDateString()
    const rango = { all_day: true, start_at: `${hoy}T00:00:00`, end_at: `${hoy}T00:00:00` }
    const r = selectTodayEvents([
      event({ title: 'cita', start_at: `${hoy}T10:00:00` }),
      event({ title: 'playa', kind: 'vacaciones', ...rango }),
      // Estos dos se colaban hasta el 26-08-2026: el filtro solo apartaba las
      // vacaciones y este test solo comprobaba las vacaciones.
      event({ title: 'libra la abuela', kind: 'descanso', ...rango }),
      event({ title: 'Hispanidad', kind: 'festivo', ...rango }),
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

  test('selectUpcomingEvents no pasa de la próxima semana', () => {
    const dentroDe6 = getLocalDateString(new Date(Date.now() + 6 * 86400000))
    const dentroDe20 = getLocalDateString(new Date(Date.now() + 20 * 86400000))
    const r = selectUpcomingEvents([
      event({ title: 'esta-semana', start_at: `${dentroDe6}T10:00:00` }),
      event({ title: 'dentro-de-20-dias', start_at: `${dentroDe20}T10:00:00` }),
    ])
    expect(r.map(e => e.title)).toEqual(['esta-semana'])
  })

  test('selectUpcomingEvents deja fuera vacaciones, descansos y festivos', () => {
    const manana = getLocalDateString(new Date(Date.now() + 86400000))
    const rango = { all_day: true, start_at: `${manana}T00:00:00`, end_at: `${manana}T00:00:00` }
    const r = selectUpcomingEvents([
      event({ title: 'cita', start_at: `${manana}T10:00:00` }),
      event({ title: 'playa', kind: 'vacaciones', ...rango }),
      event({ title: 'libra la abuela', kind: 'descanso', ...rango }),
      event({ title: 'Hispanidad', kind: 'festivo', ...rango }),
    ])
    expect(r.map(e => e.title)).toEqual(['cita'])
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

test.describe('selectListItemGroups', () => {
  test('separa pendientes de hechos y ordena cada grupo alfabéticamente', () => {
    const { pending, completed } = selectListItemGroups([
      listItem({ text: 'Pan', sort_order: 0 }),
      listItem({ text: 'Aceite', sort_order: 5 }),
      listItem({ text: 'Zumo', sort_order: 1, completed: true }),
      listItem({ text: 'Café', sort_order: 9, completed: true }),
    ])
    expect(pending.map(i => i.text)).toEqual(['Aceite', 'Pan'])
    expect(completed.map(i => i.text)).toEqual(['Café', 'Zumo'])
  })

  test('el orden no depende de tildes ni de mayúsculas', () => {
    const { pending } = selectListItemGroups([
      listItem({ text: 'plátano' }),
      listItem({ text: 'Ajo' }),
      listItem({ text: 'Ñoquis' }),
      listItem({ text: 'naranja' }),
    ])
    expect(pending.map(i => i.text)).toEqual(['Ajo', 'naranja', 'Ñoquis', 'plátano'])
  })

  test('una lista vacía devuelve los dos grupos vacíos', () => {
    expect(selectListItemGroups([])).toEqual({ pending: [], completed: [] })
  })
})

test.describe('selectVisibleAbsences', () => {
  const vac = (title: string, desde: string, hasta: string) =>
    event({ title, kind: 'vacaciones', all_day: true, start_at: `${desde}T00:00:00`, end_at: `${hasta}T00:00:00` })
  const descanso = (title: string, desde: string, hasta: string) =>
    event({ title, kind: 'descanso', all_day: true, start_at: `${desde}T00:00:00`, end_at: `${hasta}T00:00:00` })

  test('solo las ausencias, no los eventos normales', () => {
    const r = selectVisibleAbsences(
      [vac('playa', '2026-08-01', '2026-08-15'), event({ title: 'dentista', start_at: '2026-08-05T10:00:00' })],
      '2026-08-03', '2026-08-09',
    )
    expect(r.map(v => v.title)).toEqual(['playa'])
  })

  test('cuenta las que atraviesan el tramo sin empezar ni acabar en él', () => {
    // Agosto entero, mirando la semana del 10: ni empieza ni acaba ahí.
    const r = selectVisibleAbsences([vac('agosto', '2026-08-01', '2026-08-31')], '2026-08-10', '2026-08-16')
    expect(r).toHaveLength(1)
  })

  test('fuera del tramo no salen', () => {
    const r = selectVisibleAbsences([vac('julio', '2026-07-01', '2026-07-20')], '2026-08-03', '2026-08-09')
    expect(r).toHaveLength(0)
  })

  test('los extremos cuentan: acabar el primer día del tramo ya solapa', () => {
    const r = selectVisibleAbsences([vac('justo', '2026-07-25', '2026-08-03')], '2026-08-03', '2026-08-09')
    expect(r).toHaveLength(1)
  })

  test('ordenadas por fecha de inicio', () => {
    const r = selectVisibleAbsences(
      [vac('segunda', '2026-08-05', '2026-08-08'), vac('primera', '2026-08-01', '2026-08-04')],
      '2026-08-01', '2026-08-09',
    )
    expect(r.map(v => v.title)).toEqual(['primera', 'segunda'])
  })

  // Los descansos entraron aquí con el bloque de disponibilidad: antes solo
  // devolvía vacaciones y un descanso acababa como una fila más de la agenda,
  // repetida en cada día de su rango.
  test('los descansos cuentan como ausencia, y se ordenan con las vacaciones', () => {
    const r = selectVisibleAbsences(
      [vac('playa', '2026-08-05', '2026-08-08'), descanso('libra Omar', '2026-08-03', '2026-08-03')],
      '2026-08-01', '2026-08-09',
    )
    expect(r.map(v => v.title)).toEqual(['libra Omar', 'playa'])
  })

  test('un descanso de un solo día también solapa el tramo', () => {
    const r = selectVisibleAbsences([descanso('libra', '2026-08-05', '2026-08-05')], '2026-08-03', '2026-08-09')
    expect(r).toHaveLength(1)
  })
})

test.describe('selectPendingTextsByList', () => {
  test('solo lo pendiente, agrupado por lista y en orden alfabético', () => {
    const r = selectPendingTextsByList([
      listItem({ list_id: 'l1', text: 'pan' }),
      listItem({ list_id: 'l1', text: 'aceite' }),
      listItem({ list_id: 'l1', text: 'leche', completed: true }),
      listItem({ list_id: 'l2', text: 'gasas' }),
    ])
    expect(r.get('l1')).toEqual(['aceite', 'pan'])
    expect(r.get('l2')).toEqual(['gasas'])
  })

  test('una lista con todo hecho no aparece', () => {
    const r = selectPendingTextsByList([listItem({ list_id: 'l1', text: 'pan', completed: true })])
    expect(r.has('l1')).toBe(false)
  })

  test('el orden ignora tildes y mayúsculas', () => {
    const r = selectPendingTextsByList([
      listItem({ list_id: 'l1', text: 'zumo' }),
      listItem({ list_id: 'l1', text: 'Ávila' }),
    ])
    expect(r.get('l1')).toEqual(['Ávila', 'zumo'])
  })
})

test.describe('selectExpiryState', () => {
  const hoy = '2026-08-05'

  test('sin fecha, no caduca', () => {
    expect(selectExpiryState(null, hoy)).toBeNull()
  })

  test('lo de ayer está caducado y lo de hoy todavía no', () => {
    expect(selectExpiryState('2026-08-04', hoy)).toBe('caducado')
    expect(selectExpiryState(hoy, hoy)).toBe('pronto')
  })

  test('avisa con un mes de margen, ni un día menos', () => {
    expect(selectExpiryState('2026-09-04', hoy)).toBe('pronto')   // 30 días
    expect(selectExpiryState('2026-09-05', hoy)).toBe('vigente')  // 31
  })

  test('lo que caduca en años no molesta', () => {
    expect(selectExpiryState('2030-01-01', hoy)).toBe('vigente')
  })
})

test.describe('buscadores', () => {
  test('la tarea se encuentra por título y por notas, con tildes o sin ellas', () => {
    const tareas = [
      task({ title: 'Pedir cita ITV' }),
      task({ title: 'Comprar pañales', notes: 'Talla 1' }),
    ]
    expect(selectTaskMatches(tareas, 'itv').map(t => t.title)).toEqual(['Pedir cita ITV'])
    expect(selectTaskMatches(tareas, 'PANALES').map(t => t.title)).toEqual(['Comprar pañales'])
    expect(selectTaskMatches(tareas, 'talla').map(t => t.title)).toEqual(['Comprar pañales'])
  })

  test('sin consulta no se filtra nada', () => {
    const tareas = [task(), task()]
    expect(selectTaskMatches(tareas, '   ')).toHaveLength(2)
  })

  test('los eventos se buscan en todo el calendario y salen por fecha', () => {
    const eventos = [
      event({ title: 'Revisión pediatra', start_at: '2026-09-01T10:00:00' }),
      event({ title: 'Revisión del coche', start_at: '2025-02-10T10:00:00' }),
      event({ title: 'Cena', start_at: '2026-08-06T21:00:00' }),
    ]
    // El de 2025 es pasado y aun así aparece: buscar es preguntar por lo que fue.
    expect(selectEventMatches(eventos, 'revision').map(e => e.title))
      .toEqual(['Revisión del coche', 'Revisión pediatra'])
  })

  test('sin consulta el calendario no devuelve resultados, que no es lo mismo que devolverlo todo', () => {
    expect(selectEventMatches([event(), event()], '')).toHaveLength(0)
  })
})

test.describe('selectFamilySummary', () => {
  const VACIA = { personas: 0, eventos: 0, tareas: 0, listas: 0, comidas: 0, documentos: 0 }

  test('devuelve null cuando la familia está vacía', () => {
    expect(selectFamilySummary(VACIA)).toBeNull()
  })

  test('una sola cosa va sin conjunción', () => {
    expect(selectFamilySummary({ ...VACIA, personas: 3 })).toBe('3 personas')
  })

  test('singular y plural según el número', () => {
    expect(selectFamilySummary({ ...VACIA, personas: 1, documentos: 1 })).toBe('1 persona y 1 documento')
  })

  test('enumera con comas y una "y" al final, saltándose lo que está a cero', () => {
    expect(selectFamilySummary({ personas: 2, eventos: 12, tareas: 0, listas: 3, comidas: 0, documentos: 4 }))
      .toBe('2 personas, 12 eventos, 3 listas y 4 documentos')
  })
})

test.describe('selectVisibleBirthdays', () => {
  const cumple = (title: string, fecha: string) =>
    event({ title, kind: 'cumple', all_day: true, start_at: `${fecha}T00:00:00`, end_at: `${fecha}T00:00:00` })

  test('solo los cumpleaños, no los demás eventos', () => {
    const r = selectVisibleBirthdays(
      [cumple('abuela', '2026-08-12'), event({ title: 'dentista', start_at: '2026-08-05T10:00:00' })],
      '2026-08-01', '2026-08-31',
    )
    expect(r.map(c => c.title)).toEqual(['abuela'])
  })

  test('fuera del mes no salen', () => {
    const r = selectVisibleBirthdays([cumple('abuela', '2026-09-12')], '2026-08-01', '2026-08-31')
    expect(r).toHaveLength(0)
  })

  // Un cumpleaños dura un día: los extremos del tramo son suyos igual.
  test('los extremos del tramo cuentan', () => {
    const r = selectVisibleBirthdays(
      [cumple('primero', '2026-08-01'), cumple('ultimo', '2026-08-31')],
      '2026-08-01', '2026-08-31',
    )
    expect(r).toHaveLength(2)
  })

  test('ordenados por fecha', () => {
    const r = selectVisibleBirthdays(
      [cumple('luego', '2026-08-20'), cumple('antes', '2026-08-02')],
      '2026-08-01', '2026-08-31',
    )
    expect(r.map(c => c.title)).toEqual(['antes', 'luego'])
  })
})
