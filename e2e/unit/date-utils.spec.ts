import { test, expect } from '@playwright/test'
import {
  buildLocalDateTime,
  extractDate,
  extractTime,
  getDayPeriod,
  getDayPeriodEnMadrid,
  getDayPeriodFromHour,
  getLocalDateString,
  isSameLocalDay,
  parseLocalDate,
} from '@/lib/date-utils'

// El objetivo de este módulo es que "hoy" sea el día local de la familia y no
// el de UTC. Los tests fijan ese contrato.

test.describe('getLocalDateString', () => {
  test('formatea como yyyy-MM-dd con ceros a la izquierda', () => {
    expect(getLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(getLocalDateString(new Date(2026, 11, 25))).toBe('2026-12-25')
  })

  test('usa el día local, no el UTC', () => {
    // 23:30 local del 3 de agosto. En UTC+X esto puede ser ya día 4 en UTC;
    // el helper debe seguir diciendo 03.
    expect(getLocalDateString(new Date(2026, 7, 3, 23, 30))).toBe('2026-08-03')
    // 00:30 local del 3 de agosto: en UTC-X sería aún día 2 en UTC.
    expect(getLocalDateString(new Date(2026, 7, 3, 0, 30))).toBe('2026-08-03')
  })
})

test.describe('parseLocalDate', () => {
  test('ida y vuelta sin desplazar el día', () => {
    for (const fecha of ['2026-01-01', '2026-06-15', '2026-12-31', '2026-03-29']) {
      expect(getLocalDateString(parseLocalDate(fecha))).toBe(fecha)
    }
  })

  test('sitúa la fecha al mediodía para sobrevivir a los cambios de hora', () => {
    expect(parseLocalDate('2026-08-03').getHours()).toBe(12)
  })

  test('sumar días desde una fecha parseada no se salta ninguno', () => {
    const d = parseLocalDate('2026-10-24')
    const dias: string[] = []
    for (let i = 0; i < 5; i++) {
      dias.push(getLocalDateString(d))
      d.setDate(d.getDate() + 1)
    }
    // El último domingo de octubre suele traer cambio de hora en Europa.
    expect(dias).toEqual(['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28'])
  })
})

test.describe('isSameLocalDay', () => {
  test('compara strings, Dates y mezclas', () => {
    expect(isSameLocalDay('2026-08-03', '2026-08-03')).toBe(true)
    expect(isSameLocalDay('2026-08-03', '2026-08-04')).toBe(false)
    expect(isSameLocalDay(new Date(2026, 7, 3, 9, 0), new Date(2026, 7, 3, 22, 0))).toBe(true)
    expect(isSameLocalDay(new Date(2026, 7, 3), '2026-08-03')).toBe(true)
  })

  test('ignora la parte de hora de un datetime', () => {
    expect(isSameLocalDay('2026-08-03T23:59:00', '2026-08-03T00:00:00')).toBe(true)
  })
})

test.describe('buildLocalDateTime', () => {
  test('une fecha y hora en formato local', () => {
    expect(buildLocalDateTime('2026-08-03', '09:30')).toBe('2026-08-03T09:30:00')
  })

  test('sin hora asume medianoche', () => {
    expect(buildLocalDateTime('2026-08-03')).toBe('2026-08-03T00:00:00')
  })
})

test.describe('extractTime / extractDate', () => {
  test('lee la hora de pared de un datetime sin zona', () => {
    // Es lo que guarda el mock: la hora tal cual se escribió.
    expect(extractTime('2026-08-03T09:30:00')).toBe('09:30')
    expect(extractDate('2026-08-03T09:30:00')).toBe('2026-08-03')
  })

  test('un instante UTC se lee en la hora local, no en la de UTC', () => {
    // Es lo que devuelve Supabase, que guarda `timestamptz`. Se construye desde
    // componentes locales para que el test valga en cualquier zona: las 09:30
    // de la familia tienen que volver como 09:30, no como su equivalente UTC.
    const instante = new Date(2026, 7, 3, 9, 30).toISOString()
    expect(extractTime(instante)).toBe('09:30')
    expect(extractDate(instante)).toBe('2026-08-03')
  })

  test('ida y vuelta estable: releer y reescribir no mueve la hora', () => {
    // El fallo que motivó esto se acumulaba: cada edición restaba el desfase
    // otra vez. Dos vueltas tienen que dar lo mismo que una.
    const original = new Date(2026, 7, 3, 9, 30).toISOString()
    const primera = buildLocalDateTime(extractDate(original), extractTime(original))
    const segunda = buildLocalDateTime(extractDate(new Date(primera).toISOString()), extractTime(new Date(primera).toISOString()))
    expect(primera).toBe('2026-08-03T09:30:00')
    expect(segunda).toBe(primera)
  })

  test('una medianoche local no adelanta ni retrasa el día', () => {
    // Un evento de todo el día se guarda a las 00:00 locales, que en UTC caen
    // en el día anterior. Cortando el string se leía el día equivocado.
    const medianoche = new Date(2026, 7, 3, 0, 0).toISOString()
    expect(extractDate(medianoche)).toBe('2026-08-03')
  })

  test('devuelve cadena vacía si no hay componente de hora', () => {
    expect(extractTime('2026-08-03')).toBe('')
  })

  test('una fecha suelta se devuelve tal cual', () => {
    expect(extractDate('2026-08-03')).toBe('2026-08-03')
  })
})

// ─── Tramo del día ────────────────────────────────────────────────────────────
//
// Lo comparten el saludo de Inicio, el cielo de la ilustración y —desde el
// 01-09-2026— la portada pública, que la pinta en el servidor y por eso
// pregunta por la hora suelta y no por una fecha.

test('el tramo del día parte en las 12 y en las 20', () => {
  expect(getDayPeriodFromHour(0)).toBe('mañana')
  expect(getDayPeriodFromHour(11)).toBe('mañana')
  expect(getDayPeriodFromHour(12)).toBe('tarde')
  expect(getDayPeriodFromHour(19)).toBe('tarde')
  expect(getDayPeriodFromHour(20)).toBe('noche')
  expect(getDayPeriodFromHour(23)).toBe('noche')
})

// La portada y el login se pintan en el servidor, que va en UTC. Lo que estos
// tests fijan es que el tramo se decide por el reloj de Madrid y no por el de la
// máquina: a las 22:30 UTC de un día de verano en España ya es el siguiente.

test('el tramo en Madrid no es el de UTC', () => {
  // Verano (UTC+2): las 23:00 UTC son la 1 de la madrugada en Madrid.
  expect(getDayPeriodEnMadrid(new Date('2026-06-17T23:00:00Z'))).toBe('mañana')
  // Invierno (UTC+1): las 19:30 UTC son las 20:30 en Madrid, ya de noche.
  expect(getDayPeriodEnMadrid(new Date('2026-01-17T19:30:00Z'))).toBe('noche')
  expect(getDayPeriodEnMadrid(new Date('2026-01-17T18:30:00Z'))).toBe('tarde')
})

test('el tramo de una fecha es el de su hora local', () => {
  expect(getDayPeriod(new Date(2026, 5, 17, 9, 40))).toBe('mañana')
  expect(getDayPeriod(new Date(2026, 5, 17, 15, 0))).toBe('tarde')
  expect(getDayPeriod(new Date(2026, 5, 17, 22, 30))).toBe('noche')
})
