import { test, expect } from '@playwright/test'
import {
  avisoDeEvento, avisoDelDia, avisosDeEventoPendientes, esLaHoraDelAviso, fraseDeLoDeHoy, fraseDeLoQueCaduca,
  horaDelPlan, MARGEN_DEL_AVISO_MS, momentoDelAvisoDeEvento, tituloDelAviso,
} from '@/lib/reminders'
import type { EventoConAviso, PlanDelAviso } from '@/lib/reminders'

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

// ─── El aviso de un evento ────────────────────────────────────────────────────
//
// Lo manda un cron cada cinco minutos que nadie mira. Las dos maneras de fallar
// sin que se note son avisar dos veces (o de algo que ya empezó) y no avisar
// nunca: `avisosDeEventoPendientes` decide cuál de las dos, y se prueba aquí.

/** Un evento a las 10:30 de Madrid (08:30 UTC en septiembre) con la antelación dicha. */
function eventoA(antelacion: number, over: Partial<EventoConAviso> = {}): EventoConAviso {
  return { id: 'e1', title: 'Dentista', start_at: '2026-09-15T08:30:00Z', remind_before_minutes: antelacion, ...over }
}

test.describe('momentoDelAvisoDeEvento', () => {
  test('es la hora del evento menos la antelación', () => {
    expect(momentoDelAvisoDeEvento('2026-09-15T08:30:00Z', 30).toISOString()).toBe('2026-09-15T08:00:00.000Z')
    expect(momentoDelAvisoDeEvento('2026-09-15T08:30:00Z', 1440).toISOString()).toBe('2026-09-14T08:30:00.000Z')
  })
})

test.describe('avisosDeEventoPendientes', () => {
  test('todavía no es la hora: no avisa', () => {
    expect(avisosDeEventoPendientes([eventoA(30)], new Date('2026-09-15T07:59:00Z'))).toEqual([])
  })

  test('llega la hora: avisa, y dice cuál es el momento', () => {
    const hay = avisosDeEventoPendientes([eventoA(30)], new Date('2026-09-15T08:02:00Z'))
    expect(hay.map(a => a.evento.id)).toEqual(['e1'])
    expect(hay[0].fireAt).toBe('2026-09-15T08:00:00.000Z')
  })

  test('un aviso que llega tarde pero dentro del margen sale igual', () => {
    const tarde = new Date(new Date('2026-09-15T08:00:00Z').getTime() + MARGEN_DEL_AVISO_MS - 1000)
    expect(avisosDeEventoPendientes([eventoA(30)], tarde)).toHaveLength(1)
  })

  test('pasado el margen ya no: «en 30 minutos» no se dice cuando faltan dos', () => {
    const muyTarde = new Date(new Date('2026-09-15T08:00:00Z').getTime() + MARGEN_DEL_AVISO_MS)
    expect(avisosDeEventoPendientes([eventoA(30)], muyTarde)).toEqual([])
  })

  test('nunca avisa de algo que ya ha empezado', () => {
    // Con un margen enorme el momento del aviso «cuenta», pero el evento ya pasó.
    const yaEmpezado = new Date('2026-09-15T08:31:00Z')
    expect(avisosDeEventoPendientes([eventoA(30)], yaEmpezado, 24 * 3600 * 1000)).toEqual([])
  })

  test('un aviso de un día antes sale el día antes, a la misma hora', () => {
    expect(avisosDeEventoPendientes([eventoA(1440)], new Date('2026-09-14T08:31:00Z'))).toHaveLength(1)
    expect(avisosDeEventoPendientes([eventoA(1440)], new Date('2026-09-15T08:00:00Z'))).toEqual([])
  })

  test('varios eventos: solo los que les toca, y cada uno con su antelación', () => {
    const ahora = new Date('2026-09-15T08:16:00Z')
    const hay = avisosDeEventoPendientes([
      eventoA(15, { id: 'a' }),                                           // 08:15 → toca
      eventoA(30, { id: 'b' }),                                           // 08:00 → 16 min de retraso, se pasó el margen
      eventoA(60, { id: 'c', start_at: '2026-09-15T09:15:00Z' }),          // 08:15 → toca
      eventoA(15, { id: 'd', start_at: '2026-09-15T10:00:00Z' }),          // 09:45 → aún no
    ], ahora)
    expect(hay.map(a => a.evento.id).sort()).toEqual(['a', 'c'])
  })

  test('una fecha rota no tumba a las demás', () => {
    const hay = avisosDeEventoPendientes([eventoA(30, { id: 'x', start_at: 'no es una fecha' }), eventoA(30)], new Date('2026-09-15T08:02:00Z'))
    expect(hay.map(a => a.evento.id)).toEqual(['e1'])
  })
})

test.describe('avisoDeEvento', () => {
  test('el título es el del evento y el cuerpo dice cuándo, en la hora de la familia', () => {
    expect(avisoDeEvento(eventoA(30), MADRID)).toEqual({ title: 'Dentista', body: 'En 30 minutos, a las 10:30.' })
  })

  test('cada antelación se dice como se diría en voz alta', () => {
    expect(avisoDeEvento(eventoA(15), MADRID).body).toBe('En 15 minutos, a las 10:30.')
    expect(avisoDeEvento(eventoA(60), MADRID).body).toBe('En una hora, a las 10:30.')
    expect(avisoDeEvento(eventoA(1440), MADRID).body).toBe('Mañana, a las 10:30.')
  })

  test('un evento sin título sigue teniendo un aviso que se entiende', () => {
    expect(avisoDeEvento(eventoA(30, { title: '   ' }), MADRID).title).toBe('Un plan')
  })

  test('la hora es la de Madrid aunque el servidor vaya en UTC', () => {
    // 08:30 UTC son las 10:30 de Madrid en verano y las 09:30 en invierno.
    expect(avisoDeEvento(eventoA(30, { start_at: '2026-12-15T08:30:00Z' }), MADRID).body).toBe('En 30 minutos, a las 09:30.')
  })
})
