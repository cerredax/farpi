import { test, expect } from '@playwright/test'
import { avisoDelDia, esLaHoraDelAviso, fraseDeLoDeHoy, fraseDeLoQueCaduca, horaDelPlan, tituloDelAviso } from '@/lib/reminders'
import type { PlanDelAviso } from '@/lib/reminders'

// El aviso de las siete de la mañana es lo único de Farpi que se lee sin abrir
// Farpi, y lo escribe una función de Vercel que va en UTC. Las dos cosas que
// pueden salir mal —la hora de otro huso y el plural de una frase— se prueban
// aquí, que es donde se pueden probar sin levantar nada.

const MADRID = 'Europe/Madrid'

/** Un plan a la hora que se diga, en hora de Madrid. */
function plan(titulo: string, hora: string | null, dia = '2026-09-15'): PlanDelAviso {
  if (hora === null) return { titulo, empiezaEn: null }
  // El ISO se escribe en UTC a propósito: es como llega de la base.
  const [h, m] = hora.split(':').map(Number)
  const utc = new Date(Date.UTC(
    Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8, 10)), h - 2, m,
  ))
  return { titulo, empiezaEn: utc.toISOString() }
}

test.describe('tituloDelAviso', () => {
  test('es el día de la semana y el número, en mayúscula', () => {
    expect(tituloDelAviso(new Date('2026-09-15T07:00:00Z'), MADRID)).toBe('Martes 15')
  })

  test('lo decide el calendario de la familia y no el del servidor', () => {
    // Las 23:30 UTC del 30 de septiembre ya son el 1 de octubre en Madrid.
    expect(tituloDelAviso(new Date('2026-09-30T23:30:00Z'), MADRID)).toBe('Jueves 1')
  })
})

test.describe('horaDelPlan', () => {
  test('traduce a la hora de la familia, no a la del servidor', () => {
    expect(horaDelPlan('2026-09-15T14:30:00Z', MADRID)).toBe('16:30')
  })

  test('en invierno la diferencia es de una hora, no de dos', () => {
    expect(horaDelPlan('2026-01-15T14:30:00Z', MADRID)).toBe('15:30')
  })

  test('una fecha que no se entiende no inventa una hora', () => {
    expect(horaDelPlan('mañana por la tarde', MADRID)).toBe('')
  })
})

test.describe('fraseDeLoDeHoy', () => {
  test('sin nada que contar no dice nada', () => {
    expect(fraseDeLoDeHoy([], 0, MADRID)).toBe('')
  })

  test('un solo plan se dice como se diría en voz alta', () => {
    expect(fraseDeLoDeHoy([plan('Dentista', '16:30')], 0, MADRID)).toBe('Dentista, a las 16:30.')
  })

  test('un plan de todo el día no se inventa una hora', () => {
    expect(fraseDeLoDeHoy([plan('Excursión', null)], 0, MADRID)).toBe('Excursión, todo el día.')
  })

  test('en cuanto hay más de una cosa, van en lista con la hora entre paréntesis', () => {
    const frase = fraseDeLoDeHoy([plan('Dentista', '16:30'), plan('Inglés', '18:00')], 0, MADRID)
    expect(frase).toBe('Dentista (16:30) y Inglés (18:00).')
  })

  test('las tareas se cuentan y cierran la lista', () => {
    const frase = fraseDeLoDeHoy([plan('Dentista', '16:30'), plan('Inglés', '18:00')], 2, MADRID)
    expect(frase).toBe('Dentista (16:30), Inglés (18:00) y 2 tareas pendientes.')
  })

  test('una sola tarea va en singular', () => {
    expect(fraseDeLoDeHoy([plan('Dentista', '16:30')], 1, MADRID))
      .toBe('Dentista (16:30) y 1 tarea pendiente.')
  })

  test('sin planes, las tareas necesitan el verbo delante', () => {
    expect(fraseDeLoDeHoy([], 2, MADRID)).toBe('Tenéis 2 tareas pendientes.')
  })

  test('del cuarto plan en adelante se cuentan, no se nombran', () => {
    const frase = fraseDeLoDeHoy(
      [plan('Dentista', '16:30'), plan('Inglés', '18:00'), plan('Cena', '21:00'), plan('Ensayo', '22:00'), plan('Otro', '23:00')],
      0, MADRID,
    )
    expect(frase).toBe('Dentista (16:30), Inglés (18:00), Cena (21:00) y 2 más.')
  })

  test('se ordenan por la hora a la que empiezan, y el día entero va primero', () => {
    const frase = fraseDeLoDeHoy(
      [plan('Cena', '21:00'), plan('Dentista', '16:30'), plan('Huelga', null)],
      0, MADRID,
    )
    expect(frase).toBe('Huelga (todo el día), Dentista (16:30) y Cena (21:00).')
  })

  test('un plan sin título no deja un hueco en la frase', () => {
    expect(fraseDeLoDeHoy([plan('   ', '16:30')], 0, MADRID)).toBe('Un plan, a las 16:30.')
  })
})

test.describe('fraseDeLoQueCaduca', () => {
  test('sin nada que caducar no dice nada', () => {
    expect(fraseDeLoQueCaduca(0, 0)).toBe('')
  })

  test('lo vencido y lo que va a vencer son dos frases distintas', () => {
    expect(fraseDeLoQueCaduca(1, 2)).toBe('1 documento está caducado. 2 documentos caducan este mes.')
  })

  test('el plural se ajusta a cada mitad', () => {
    expect(fraseDeLoQueCaduca(2, 1)).toBe('2 documentos están caducados. 1 documento caduca este mes.')
  })
})

test.describe('avisoDelDia', () => {
  const AHORA = new Date('2026-09-15T07:00:00Z')

  test('el título es el día y el cuerpo empieza por lo de hoy', () => {
    const aviso = avisoDelDia(
      { felicitacion: '', planes: [plan('Dentista', '16:30')], tareas: 0, documentosVencidos: 0, documentosPorVencer: 0 },
      AHORA, MADRID,
    )
    expect(aviso.title).toBe('Martes 15')
    expect(aviso.body).toBe('Dentista, a las 16:30.')
  })

  test('el cumpleaños abre el cuerpo, delante de todo lo demás', () => {
    const aviso = avisoDelDia(
      {
        felicitacion: 'Hoy Sofía cumple ocho años.',
        planes: [plan('Dentista', '16:30')],
        tareas: 2,
        documentosVencidos: 0,
        documentosPorVencer: 1,
      },
      AHORA, MADRID,
    )
    expect(aviso.body).toBe(
      'Hoy Sofía cumple ocho años. Dentista (16:30) y 2 tareas pendientes. 1 documento caduca este mes.',
    )
  })

  // Un cumpleaños avisado a las siete del mismo día llega tarde para el regalo.
  test('el cumpleaños de mañana va justo detrás del de hoy', () => {
    const aviso = avisoDelDia(
      {
        felicitacion: 'Hoy Sofía cumple 8 años.',
        cumplesDeManana: 'Mañana es el cumpleaños de la abuela Carmen.',
        planes: [plan('Dentista', '16:30')],
        tareas: 0,
        documentosVencidos: 0,
        documentosPorVencer: 0,
      },
      AHORA, MADRID,
    )
    expect(aviso.body).toBe('Hoy Sofía cumple 8 años. Mañana es el cumpleaños de la abuela Carmen. Dentista, a las 16:30.')
  })

  test('un día sin nada más que el cumpleaños de mañana avisa igual', () => {
    const aviso = avisoDelDia(
      { felicitacion: '', cumplesDeManana: 'Mañana Leo cumple 5 años.', planes: [], tareas: 0, documentosVencidos: 0, documentosPorVencer: 0 },
      AHORA, MADRID,
    )
    expect(aviso.body).toBe('Mañana Leo cumple 5 años.')
  })

  test('un día en que solo caduca un papel no habla de planes', () => {
    const aviso = avisoDelDia(
      { felicitacion: '', planes: [], tareas: 0, documentosVencidos: 1, documentosPorVencer: 0 },
      AHORA, MADRID,
    )
    expect(aviso.body).toBe('1 documento está caducado.')
  })
})

// Vercel programa en UTC y Madrid cambia de hora: el cron salta a las 05:00 y a
// las 06:00 UTC, y solo avisa la que en Madrid cae a las siete.
test.describe('esLaHoraDelAviso', () => {
  test('en verano avisa la de las 05:00 UTC y no la de las 06:00', () => {
    expect(esLaHoraDelAviso(new Date('2026-09-28T05:00:00Z'), MADRID)).toBe(true)
    expect(esLaHoraDelAviso(new Date('2026-09-28T06:00:00Z'), MADRID)).toBe(false)
  })

  test('en invierno avisa la de las 06:00 UTC y no la de las 05:00', () => {
    expect(esLaHoraDelAviso(new Date('2026-12-15T05:00:00Z'), MADRID)).toBe(false)
    expect(esLaHoraDelAviso(new Date('2026-12-15T06:00:00Z'), MADRID)).toBe(true)
  })

  // En Hobby el cron salta en cualquier minuto de su hora: las 05:59 UTC de
  // verano siguen siendo las siete y las 05:59 de invierno todavía no.
  test('vale cualquier minuto de la hora, y ninguno de la de al lado', () => {
    expect(esLaHoraDelAviso(new Date('2026-09-28T05:59:00Z'), MADRID)).toBe(true)
    expect(esLaHoraDelAviso(new Date('2026-12-15T05:59:00Z'), MADRID)).toBe(false)
  })

  test('el día del cambio de hora solo avisa una de las dos', () => {
    // 25-10-2026: a las 01:00 UTC Madrid pasa de UTC+2 a UTC+1.
    const avisos = ['2026-10-25T05:30:00Z', '2026-10-25T06:30:00Z'].filter(h => esLaHoraDelAviso(new Date(h), MADRID))
    expect(avisos).toEqual(['2026-10-25T06:30:00Z'])
  })
})
