import { test, expect } from '@playwright/test'
import { cumplesDeLaCasa, edadEnPalabras, fraseDeCumplesDeLaCasa, proximoCumple, proximosCumples } from '@/lib/birthdays'
import { event } from './fixtures'
import type { Child } from '@/types'

// Un cumpleaños es una fecha que se repite todos los años menos uno: el 29 de
// febrero. Y se calcula con cuentas de calendario, que es justo donde la app se
// ha equivocado antes por un día. Por eso se prueba aquí y no en el navegador.

function persona(name: string, birth_date: string | null): Child {
  return { id: name, family_id: 'f1', name, birth_date, color: '#123456', kind: 'hijo', created_at: '' }
}

const HOY = '2026-08-27'

test.describe('proximoCumple', () => {
  test('el del mismo día es hoy, con la edad que cumple', () => {
    const cumple = proximoCumple(persona('Ana', '2018-08-27'), HOY)
    expect(cumple?.fecha).toBe('2026-08-27')
    expect(cumple?.dias).toBe(0)
    expect(cumple?.edad).toBe(8)
  })

  test('el que aún no ha llegado es de este año', () => {
    const cumple = proximoCumple(persona('Luis', '2020-09-03'), HOY)
    expect(cumple?.fecha).toBe('2026-09-03')
    expect(cumple?.dias).toBe(7)
    expect(cumple?.edad).toBe(6)
  })

  // El que ya pasó no desaparece: pasa a ser el del año que viene. Si no, media
  // familia dejaría de tener cumpleaños según avanza el año.
  test('el que ya pasó salta al año siguiente', () => {
    const cumple = proximoCumple(persona('Marta', '1985-03-10'), HOY)
    expect(cumple?.fecha).toBe('2027-03-10')
    expect(cumple?.edad).toBe(42)
    expect(cumple?.dias).toBe(195)
  })

  // Un 29 de febrero se celebra igual los años que no lo tienen: el 1 de marzo.
  // Saltárselo tres de cada cuatro años no es una respuesta.
  test('el 29 de febrero se celebra el 1 de marzo cuando el año no lo tiene', () => {
    expect(proximoCumple(persona('Leo', '2024-02-29'), '2027-01-01')?.fecha).toBe('2027-03-01')
    // En un año bisiesto sí cae en su día.
    expect(proximoCumple(persona('Leo', '2024-02-29'), '2028-01-01')?.fecha).toBe('2028-02-29')
  })

  test('sin fecha de nacimiento no hay cumpleaños', () => {
    expect(proximoCumple(persona('Sin fecha', null), HOY)).toBeNull()
  })

  // Una fecha de nacimiento posterior a hoy solo puede ser un error al teclear
  // el año. Antes de esta guarda salía "cumple 0 años".
  test('una fecha en el futuro se ignora', () => {
    expect(proximoCumple(persona('Futuro', '2027-01-05'), HOY)).toBeNull()
  })
})

test.describe('proximosCumples', () => {
  const casa = [
    persona('Ana', '2018-08-27'),   // hoy
    persona('Luis', '2020-09-03'),  // dentro de una semana
    persona('Marta', '1985-03-10'), // el año que viene
    persona('Abuela', null),
  ]

  test('solo los que caen dentro de la ventana, del más cercano al más lejano', () => {
    const cumples = proximosCumples(casa, HOY, 14)
    expect(cumples.map(c => c.persona.name)).toEqual(['Ana', 'Luis'])
  })

  test('con ventana de cero días son los de hoy, que es lo que usa el aviso', () => {
    expect(proximosCumples(casa, HOY, 0).map(c => c.persona.name)).toEqual(['Ana'])
  })

  test('dos el mismo día se ordenan por nombre', () => {
    const cumples = proximosCumples([persona('Zoe', '2010-08-27'), persona('Ana', '2018-08-27')], HOY, 0)
    expect(cumples.map(c => c.persona.name)).toEqual(['Ana', 'Zoe'])
  })
})

test.describe('cómo se dice', () => {
  test('la edad lleva singular cuando toca', () => {
    expect(edadEnPalabras(1)).toBe('1 año')
    expect(edadEnPalabras(8)).toBe('8 años')
  })

  test('con una persona se felicita con su edad', () => {
    expect(fraseDeCumplesDeLaCasa(cumplesDeLaCasa([persona('Ana', '2018-08-27')], [], HOY, 0)))
      .toBe('Hoy Ana cumple 8 años.')
  })

  // Con varias, las edades sobran: la frase se hace ilegible y lo que hay que
  // saber es de quién acordarse hoy.
  test('con varias se enumeran los nombres', () => {
    const cumples = cumplesDeLaCasa(
      [persona('Ana', '2018-08-27'), persona('Zoe', '2010-08-27'), persona('Leo', '2015-08-27')],
      [],
      HOY,
      0,
    )
    expect(fraseDeCumplesDeLaCasa(cumples)).toBe('Hoy cumplen años Ana, Leo y Zoe.')
  })

  test('sin cumpleaños no dice nada', () => {
    expect(fraseDeCumplesDeLaCasa([])).toBe('')
  })
})

// Los cumpleaños de quien no es de la casa se apuntan en el calendario como
// eventos (`kind = 'cumple'`), y en Inicio tienen que leerse igual que los de
// dentro. Aquí se prueba justo la costura entre los dos orígenes.
test.describe('cumplesDeLaCasa', () => {
  const cumpleApuntado = (title: string, start_at: string, birth_year: number | null = null) =>
    event({ kind: 'cumple', title, start_at, all_day: true, birth_year })

  test('junta los de casa y los apuntados, y los ordena por cercanía', () => {
    const cumples = cumplesDeLaCasa(
      [persona('Ana', '2018-08-30')],
      [cumpleApuntado('Abuela Carmen', '2026-08-28T00:00:00')],
      HOY,
    )
    expect(cumples.map(c => c.nombre)).toEqual(['Abuela Carmen', 'Ana'])
    expect(cumples.map(c => c.dias)).toEqual([1, 3])
  })

  test('sin año de nacimiento no hay edad que enseñar', () => {
    const [cumple] = cumplesDeLaCasa([], [cumpleApuntado('Abuela Carmen', '2026-08-27T00:00:00')], HOY)
    expect(cumple.edad).toBeNull()
    expect(cumple.color).toBeNull()
    // De aquí sale a dónde manda el pie del bloque de Inicio.
    expect(cumple.apuntado).toBe(true)
  })

  test('el de casa no está apuntado: sale de su ficha', () => {
    const [cumple] = cumplesDeLaCasa([persona('Ana', '2018-08-27')], [], HOY)
    expect(cumple.apuntado).toBe(false)
    expect(cumple.color).toBe('#123456')
  })

  test('con año de nacimiento sale la edad que cumple ese día', () => {
    const [cumple] = cumplesDeLaCasa([], [cumpleApuntado('Abuela Carmen', '2026-08-27T00:00:00', 1949)], HOY)
    expect(cumple.edad).toBe(77)
  })

  // La serie anual deja una fila por año: si salieran todas, el bloque de
  // Inicio enseñaría el mismo cumpleaños veinte veces.
  test('las filas de otros años se quedan fuera de la ventana', () => {
    const cumples = cumplesDeLaCasa([], [
      cumpleApuntado('Abuela Carmen', '2025-08-27T00:00:00'),
      cumpleApuntado('Abuela Carmen', '2026-08-27T00:00:00'),
      cumpleApuntado('Abuela Carmen', '2027-08-27T00:00:00'),
    ], HOY)
    expect(cumples).toHaveLength(1)
    expect(cumples[0].fecha).toBe('2026-08-27')
  })

  test('los eventos que no son cumpleaños no entran', () => {
    expect(cumplesDeLaCasa([], [event({ start_at: '2026-08-27T10:00:00' })], HOY)).toEqual([])
  })

  test('a quien no se le sabe la edad se le felicita igual', () => {
    const cumples = cumplesDeLaCasa([], [cumpleApuntado('la abuela Carmen', '2026-08-27T00:00:00')], HOY, 0)
    expect(fraseDeCumplesDeLaCasa(cumples)).toBe('Hoy es el cumpleaños de la abuela Carmen.')
  })
})
