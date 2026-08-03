import { test, expect } from '@playwright/test'
import {
  buildLocalDateTime,
  extractDate,
  extractTime,
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
  test('extrae la hora HH:mm', () => {
    expect(extractTime('2026-08-03T09:30:00')).toBe('09:30')
    expect(extractTime('2026-08-03T09:30:00.000Z')).toBe('09:30')
  })

  test('devuelve cadena vacía si no hay componente de hora', () => {
    expect(extractTime('2026-08-03')).toBe('')
  })

  test('extrae la parte de fecha', () => {
    expect(extractDate('2026-08-03T09:30:00')).toBe('2026-08-03')
    expect(extractDate('2026-08-03')).toBe('2026-08-03')
  })
})
