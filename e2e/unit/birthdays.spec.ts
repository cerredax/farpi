import { test, expect } from '@playwright/test'
import { edadEnPalabras, fraseDeCumples, proximoCumple, proximosCumples } from '@/lib/birthdays'
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
    expect(fraseDeCumples(proximosCumples([persona('Ana', '2018-08-27')], HOY, 0)))
      .toBe('Hoy Ana cumple 8 años.')
  })

  // Con varias, las edades sobran: la frase se hace ilegible y lo que hay que
  // saber es de quién acordarse hoy.
  test('con varias se enumeran los nombres', () => {
    const cumples = proximosCumples(
      [persona('Ana', '2018-08-27'), persona('Zoe', '2010-08-27'), persona('Leo', '2015-08-27')],
      HOY,
      0,
    )
    expect(fraseDeCumples(cumples)).toBe('Hoy cumplen años Ana, Leo y Zoe.')
  })

  test('sin cumpleaños no dice nada', () => {
    expect(fraseDeCumples([])).toBe('')
  })
})
