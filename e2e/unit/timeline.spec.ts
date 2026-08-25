import { test, expect } from '@playwright/test'
import { partirEventosDelDia, rangoHorario, repartirSolapados, tramoDelEvento, MINUTOS_DIA } from '@/lib/timeline'
import { HORAS_MINIMAS_AGENDA } from '@/lib/constants'
import { event } from './fixtures'

// La agenda por horas coloca cada evento por su minuto. Toda la aritmética vive
// en `src/lib/timeline.ts` para poder comprobarla sin navegador.

const DIA = '2026-08-10'

test.describe('partirEventosDelDia', () => {
  test('separa lo que tiene hora de lo que dura todo el día', () => {
    const conHora = event({ start_at: `${DIA}T10:00:00` })
    const todoElDia = event({ start_at: `${DIA}T00:00:00`, all_day: true })

    const partido = partirEventosDelDia([conHora, todoElDia], DIA)
    expect(partido.conHora).toHaveLength(1)
    expect(partido.todoElDia).toHaveLength(1)
  })

  test('las vacaciones no entran en ninguna de las dos', () => {
    const vacaciones = event({
      kind: 'vacaciones',
      all_day: true,
      start_at: `${DIA}T00:00:00`,
      end_at: '2026-08-16T23:59:00',
    })

    const partido = partirEventosDelDia([vacaciones], DIA)
    expect(partido.conHora).toHaveLength(0)
    expect(partido.todoElDia).toHaveLength(0)
  })

  test('deja fuera los eventos de otro día', () => {
    const otro = event({ start_at: '2026-08-11T10:00:00' })
    expect(partirEventosDelDia([otro], DIA).conHora).toHaveLength(0)
  })
})

test.describe('tramoDelEvento', () => {
  test('sitúa el evento en su minuto', () => {
    const e = event({ start_at: `${DIA}T09:30:00`, end_at: `${DIA}T11:00:00` })
    expect(tramoDelEvento(e, DIA)).toEqual({ inicio: 570, fin: 660 })
  })

  test('sin hora de fin le da una duración de dibujo', () => {
    const e = event({ start_at: `${DIA}T09:00:00`, end_at: null })
    const { inicio, fin } = tramoDelEvento(e, DIA)
    expect(inicio).toBe(540)
    expect(fin).toBeGreaterThan(inicio)
  })

  test('lo que empieza el día anterior se recorta al principio del día', () => {
    const e = event({ start_at: '2026-08-09T22:00:00', end_at: `${DIA}T06:00:00` })
    expect(tramoDelEvento(e, DIA)).toEqual({ inicio: 0, fin: 360 })
  })

  test('lo que acaba al día siguiente se recorta al final del día', () => {
    const e = event({ start_at: `${DIA}T22:00:00`, end_at: '2026-08-11T06:00:00' })
    expect(tramoDelEvento(e, DIA)).toEqual({ inicio: 1320, fin: MINUTOS_DIA })
  })

  // El validador rechaza este caso, pero un dato viejo sí puede traerlo, y un
  // bloque de alto cero no se ve.
  test('una hora de fin anterior a la de inicio no da un bloque vacío', () => {
    const e = event({ start_at: `${DIA}T12:00:00`, end_at: `${DIA}T10:00:00` })
    const { inicio, fin } = tramoDelEvento(e, DIA)
    expect(fin).toBeGreaterThan(inicio)
  })
})

test.describe('repartirSolapados', () => {
  test('un evento solo ocupa todo el ancho', () => {
    const e = event({ start_at: `${DIA}T10:00:00`, end_at: `${DIA}T11:00:00` })
    const [bloque] = repartirSolapados([e], DIA)
    expect(bloque).toMatchObject({ columna: 0, columnas: 1 })
  })

  test('dos que se pisan se reparten media caja cada uno', () => {
    const a = event({ start_at: `${DIA}T10:00:00`, end_at: `${DIA}T11:30:00` })
    const b = event({ start_at: `${DIA}T11:00:00`, end_at: `${DIA}T12:00:00` })

    const bloques = repartirSolapados([a, b], DIA)
    expect(bloques.map(x => x.columna)).toEqual([0, 1])
    expect(bloques.every(x => x.columnas === 2)).toBe(true)
  })

  test('dos seguidos que no llegan a tocarse van a ancho completo los dos', () => {
    const a = event({ start_at: `${DIA}T10:00:00`, end_at: `${DIA}T11:00:00` })
    const b = event({ start_at: `${DIA}T11:00:00`, end_at: `${DIA}T12:00:00` })

    const bloques = repartirSolapados([a, b], DIA)
    expect(bloques.every(x => x.columnas === 1)).toBe(true)
  })

  // Lo que se estrecha es el racimo, no el día entero: si no, una mañana con
  // dos citas a la vez dejaba la de la tarde a media caja sin motivo.
  test('un solape por la mañana no estrecha la cita de la tarde', () => {
    const a = event({ start_at: `${DIA}T09:00:00`, end_at: `${DIA}T10:30:00` })
    const b = event({ start_at: `${DIA}T10:00:00`, end_at: `${DIA}T11:00:00` })
    const tarde = event({ start_at: `${DIA}T17:00:00`, end_at: `${DIA}T18:00:00` })

    const bloques = repartirSolapados([a, b, tarde], DIA)
    const dibujado = bloques.find(x => x.event.id === tarde.id)!
    expect(dibujado.columnas).toBe(1)
  })

  test('tres a la vez dan tres columnas', () => {
    const uno = event({ start_at: `${DIA}T10:00:00`, end_at: `${DIA}T12:00:00` })
    const dos = event({ start_at: `${DIA}T10:15:00`, end_at: `${DIA}T11:00:00` })
    const tres = event({ start_at: `${DIA}T10:30:00`, end_at: `${DIA}T11:30:00` })

    const bloques = repartirSolapados([uno, dos, tres], DIA)
    expect(bloques.every(x => x.columnas === 3)).toBe(true)
    expect(bloques.map(x => x.columna).sort()).toEqual([0, 1, 2])
  })

  // Una columna se reutiliza en cuanto queda libre dentro del mismo racimo.
  test('reaprovecha la columna que ha quedado libre', () => {
    const largo = event({ start_at: `${DIA}T10:00:00`, end_at: `${DIA}T14:00:00` })
    const corto = event({ start_at: `${DIA}T10:30:00`, end_at: `${DIA}T11:00:00` })
    const despues = event({ start_at: `${DIA}T11:30:00`, end_at: `${DIA}T12:00:00` })

    const bloques = repartirSolapados([largo, corto, despues], DIA)
    const dibujado = bloques.find(x => x.event.id === despues.id)!
    expect(dibujado.columna).toBe(1)
    expect(bloques.every(x => x.columnas === 2)).toBe(true)
  })
})

test.describe('rangoHorario', () => {
  test('se ciñe a lo que hay, con una hora de margen', () => {
    const { desde, hasta } = rangoHorario([{ inicio: 10 * 60, fin: 18 * 60 }])
    expect(desde).toBe(9)
    expect(hasta).toBe(19)
  })

  test('nunca enseña menos del mínimo de horas', () => {
    const { desde, hasta } = rangoHorario([{ inicio: 12 * 60, fin: 12 * 60 + 30 }])
    expect(hasta - desde).toBeGreaterThanOrEqual(HORAS_MINIMAS_AGENDA)
  })

  test('no se sale del día por ninguno de los dos lados', () => {
    const { desde, hasta } = rangoHorario([{ inicio: 0, fin: MINUTOS_DIA }])
    expect(desde).toBe(0)
    expect(hasta).toBe(24)
  })

  // Sin esto, mirando hoy a las 8 de la mañana un día con una cena a las 21:00,
  // la línea de "ahora" caía fuera del tramo dibujado.
  test('la hora actual entra en el tramo cuando se pasa', () => {
    const { desde } = rangoHorario([{ inicio: 21 * 60, fin: 22 * 60 }], 8 * 60)
    expect(desde).toBeLessThanOrEqual(8)
  })

  test('sin eventos devuelve una jornada razonable', () => {
    const { desde, hasta } = rangoHorario([])
    expect(hasta - desde).toBeGreaterThanOrEqual(HORAS_MINIMAS_AGENDA)
    expect(desde).toBeGreaterThanOrEqual(0)
    expect(hasta).toBeLessThanOrEqual(24)
  })
})
