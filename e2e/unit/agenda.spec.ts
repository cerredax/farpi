import { test, expect } from '@playwright/test'
import { agruparPorPersona, tramoDeAgenda } from '@/lib/agenda'

// Los rótulos de la agenda son fechas dichas en palabras, y por eso se prueban
// aquí: "Mañana" o "La semana que viene" salen mal por un día de diferencia y
// eso no se ve en una captura.

// Un lunes, para tener la semana entera por delante en los casos normales.
const LUNES = new Date(2026, 7, 24)

test.describe('tramoDeAgenda', () => {
  test('el día siguiente a hoy es "Mañana", no "Esta semana"', () => {
    expect(tramoDeAgenda(new Date(2026, 7, 25), LUNES, LUNES)).toBe('Mañana')
  })

  test('el resto de la semana del día elegido va en "Esta semana"', () => {
    expect(tramoDeAgenda(new Date(2026, 7, 26), LUNES, LUNES)).toBe('Esta semana')
    // Domingo, último día de la semana que empieza en lunes.
    expect(tramoDeAgenda(new Date(2026, 7, 30), LUNES, LUNES)).toBe('Esta semana')
  })

  test('la semana siguiente tiene su propio rótulo', () => {
    expect(tramoDeAgenda(new Date(2026, 7, 31), LUNES, LUNES)).toBe('La semana que viene')
    expect(tramoDeAgenda(new Date(2026, 8, 6), LUNES, LUNES)).toBe('La semana que viene')
  })

  test('más allá de dos semanas se agrupa por mes', () => {
    expect(tramoDeAgenda(new Date(2026, 8, 7), LUNES, LUNES)).toBe('Septiembre')
    expect(tramoDeAgenda(new Date(2026, 9, 2), LUNES, LUNES)).toBe('Octubre')
  })

  test('el mes lleva año cuando no es el del día elegido', () => {
    const diciembre = new Date(2026, 11, 20)
    expect(tramoDeAgenda(new Date(2027, 0, 15), diciembre, diciembre)).toBe('Enero 2027')
  })

  // "Mañana" es mañana de verdad. Si el tramo se mide desde un día futuro, el
  // día siguiente a ese no es mañana para nadie: es parte de su semana.
  test('mirando un día futuro, el siguiente no se llama "Mañana"', () => {
    const futuro = new Date(2026, 8, 14)
    expect(tramoDeAgenda(new Date(2026, 8, 15), futuro, LUNES)).toBe('Esta semana')
  })

  // Un domingo, mañana ya es de la semana que viene: gana "Mañana" igual, que
  // es lo que se pregunta, y detrás siguen los tramos en orden.
  test('en domingo, mañana sigue siendo "Mañana"', () => {
    const domingo = new Date(2026, 7, 30)
    expect(tramoDeAgenda(new Date(2026, 7, 31), domingo, domingo)).toBe('Mañana')
    expect(tramoDeAgenda(new Date(2026, 8, 1), domingo, domingo)).toBe('La semana que viene')
  })
})

// El día en el que arranca la lista es su propio tramo desde que la agenda es
// continua: sin eso caía dentro de "Esta semana" junto al resto de la semana, y
// lo que estás mirando se leía igual que el sábado.
test.describe('tramoDeAgenda: el día en el que arranca', () => {
  test('si la lista arranca hoy, su tramo es "Hoy"', () => {
    expect(tramoDeAgenda(LUNES, LUNES, LUNES)).toBe('Hoy')
  })

  test('si arranca en otro día, su tramo es su fecha escrita', () => {
    const futuro = new Date(2026, 8, 14)
    expect(tramoDeAgenda(futuro, futuro, LUNES)).toBe('Lunes 14 de septiembre')
  })

  test('el día de arranque gana a "Mañana": mirando mañana, mañana es el titular', () => {
    const manana = new Date(2026, 7, 25)
    expect(tramoDeAgenda(manana, manana, LUNES)).toBe('Martes 25 de agosto')
  })
})

// Agrupar por persona es reparto puro: quién se queda con qué y quién no sale.
// Se prueba aquí porque los fallos son de los que no se ven —una persona sin
// nada que ocupa un rótulo, o una tarea que se cuela en la columna de al lado.

const FAMILIA = { key: 'familia' }
const MARTA = { key: 'm:1' }
const LEO = { key: 'c:9' }

function ev(id: string, de: { member_id?: string; child_id?: string }) {
  return { id, member_id: de.member_id ?? null, child_id: de.child_id ?? null }
}

test.describe('agruparPorPersona', () => {
  const dias = [
    { day: LUNES, events: [ev('a', { member_id: '1' }), ev('b', {})], tasks: [ev('t1', { child_id: '9' })] },
    { day: new Date(2026, 7, 25), events: [ev('c', { child_id: '9' })], tasks: [] },
  ]

  test('cada cosa cae bajo quien la lleva', () => {
    const grupos = agruparPorPersona(dias, [FAMILIA, MARTA, LEO])
    expect(grupos.map(g => g.persona.key)).toEqual(['familia', 'm:1', 'c:9'])
    expect(grupos[0].dias[0].events.map(e => e.id)).toEqual(['b'])
    expect(grupos[1].dias[0].events.map(e => e.id)).toEqual(['a'])
    // Leo tiene una tarea el lunes y un evento el martes: dos días, no uno.
    expect(grupos[2].dias.map(d => d.tasks.length + d.events.length)).toEqual([1, 1])
  })

  test('quien no tiene nada no ocupa un rótulo', () => {
    const grupos = agruparPorPersona(dias, [FAMILIA, MARTA, LEO, { key: 'm:2' }])
    expect(grupos.map(g => g.persona.key)).not.toContain('m:2')
  })

  test('un día sin nada de esa persona no se pinta', () => {
    const [marta] = agruparPorPersona(dias, [MARTA])
    // El martes no es suyo, así que su lista tiene un solo día.
    expect(marta.dias).toHaveLength(1)
    expect(marta.dias[0].day).toBe(LUNES)
  })
})
