import { test, expect } from '@playwright/test'
import {
  buildWeeklyDates,
  buildYearlyDates,
  getNextOccurrence,
  isYearlySeries,
  joinWeekdayNames,
  maxWeeklyEndDate,
  sameDayInYear,
  weekdayOf,
} from '@/lib/recurrence'

// Esta lógica la comparten los repos de Supabase, el store mock y la
// previsualización de series en EventSheet. Si cambia aquí, cambia en los tres.

test.describe('buildWeeklyDates', () => {
  test('devuelve solo los días de la semana pedidos, extremos incluidos', () => {
    // 2026-08-03 es lunes
    expect(buildWeeklyDates('2026-08-03', '2026-08-17', [1])).toEqual([
      '2026-08-03', '2026-08-10', '2026-08-17',
    ])
  })

  test('admite varios días por semana y los devuelve en orden cronológico', () => {
    expect(buildWeeklyDates('2026-08-03', '2026-08-09', [1, 3, 5])).toEqual([
      '2026-08-03', '2026-08-05', '2026-08-07',
    ])
  })

  test('el domingo es 0, no 7', () => {
    expect(buildWeeklyDates('2026-08-03', '2026-08-09', [0])).toEqual(['2026-08-09'])
  })

  test('devuelve vacío si falta algún dato o no hay días marcados', () => {
    expect(buildWeeklyDates('', '2026-08-17', [1])).toEqual([])
    expect(buildWeeklyDates('2026-08-03', '', [1])).toEqual([])
    expect(buildWeeklyDates('2026-08-03', '2026-08-17', [])).toEqual([])
  })

  test('devuelve vacío si la fecha de fin es anterior a la de inicio', () => {
    expect(buildWeeklyDates('2026-08-17', '2026-08-03', [1])).toEqual([])
  })

  test('un solo día cuando inicio y fin coinciden y ese día toca', () => {
    expect(buildWeeklyDates('2026-08-03', '2026-08-03', [1])).toEqual(['2026-08-03'])
    expect(buildWeeklyDates('2026-08-03', '2026-08-03', [2])).toEqual([])
  })

  test('cruza el cambio de mes y de año sin saltarse fechas', () => {
    expect(buildWeeklyDates('2026-12-28', '2027-01-11', [1])).toEqual([
      '2026-12-28', '2027-01-04', '2027-01-11',
    ])
  })
})

test.describe('sameDayInYear', () => {
  test('lleva el mes y el día a otro año', () => {
    expect(sameDayInYear('2027-03-05', 2029)).toBe('2029-03-05')
  })

  test('es lo que hace buildYearlyDates con cada año: las dos dicen lo mismo', () => {
    const fechas = buildYearlyDates('11-30', 2026, 2030)
    expect(fechas.map(f => sameDayInYear('2026-11-30', Number(f.slice(0, 4))))).toEqual(fechas)
  })
})

test.describe('isYearlySeries', () => {
  test('las filas de un cumpleaños caen el mismo día de años distintos', () => {
    expect(isYearlySeries(['2026-03-15T00:00:00', '2027-03-15T00:00:00', '2028-03-15T00:00:00'])).toBe(true)
  })

  test('una serie semanal no lo es: sus filas van de siete en siete días', () => {
    expect(isYearlySeries(['2026-08-03T09:00:00', '2026-08-10T09:00:00', '2026-08-17T09:00:00'])).toBe(false)
  })

  test('con una sola fila no hay serie que decir', () => {
    expect(isYearlySeries(['2026-03-15T00:00:00'])).toBe(false)
    expect(isYearlySeries([])).toBe(false)
  })

  test('un cumpleaños el 1 de enero sigue siéndolo con la hora de Madrid en UTC', () => {
    // La medianoche local del 1 de enero es el 31 de diciembre en UTC: se mira el día local.
    const local = (y: number) => new Date(y, 0, 1).toISOString()
    expect(isYearlySeries([local(2026), local(2027), local(2028)])).toBe(true)
  })
})

test.describe('buildYearlyDates', () => {
  test('repite el mismo día cada año, extremos incluidos', () => {
    expect(buildYearlyDates('03-15', 2026, 2029)).toEqual([
      '2026-03-15', '2027-03-15', '2028-03-15', '2029-03-15',
    ])
  })

  test('un único año cuando inicio y fin coinciden', () => {
    expect(buildYearlyDates('01-01', 2026, 2026)).toEqual(['2026-01-01'])
  })

  test('devuelve vacío si el año final es anterior al inicial', () => {
    expect(buildYearlyDates('01-01', 2029, 2026)).toEqual([])
  })
})

test.describe('getNextOccurrence', () => {
  test('diaria suma un día', () => {
    expect(getNextOccurrence('2026-08-03', 'daily')).toBe('2026-08-04')
  })

  test('semanal suma siete días', () => {
    expect(getNextOccurrence('2026-08-03', 'weekly')).toBe('2026-08-10')
  })

  test('mensual suma un mes', () => {
    expect(getNextOccurrence('2026-08-03', 'monthly')).toBe('2026-09-03')
  })

  test('cruza el fin de mes correctamente', () => {
    expect(getNextOccurrence('2026-08-31', 'daily')).toBe('2026-09-01')
    expect(getNextOccurrence('2026-12-31', 'daily')).toBe('2027-01-01')
  })

  test('el 31 en mensual desborda al mes siguiente, como hace JavaScript', () => {
    // Documenta el comportamiento real: 31 de enero + 1 mes = 3 de marzo (2026 no es bisiesto).
    expect(getNextOccurrence('2026-01-31', 'monthly')).toBe('2026-03-03')
  })

  test('sin recurrencia devuelve la misma fecha', () => {
    expect(getNextOccurrence('2026-08-03', 'none')).toBe('2026-08-03')
  })
})

test.describe('joinWeekdayNames', () => {
  test('los enumera de lunes a domingo, no en el orden en que se tocaron', () => {
    expect(joinWeekdayNames([5, 1, 3])).toBe('lunes, miércoles y viernes')
  })

  test('uno solo va sin comas ni "y"', () => {
    expect(joinWeekdayNames([2])).toBe('martes')
  })

  test('el domingo va al final, aunque sea el 0', () => {
    expect(joinWeekdayNames([0, 1])).toBe('lunes y domingos')
  })

  test('sin días, sin frase', () => {
    expect(joinWeekdayNames([])).toBe('')
  })
})

test.describe('maxWeeklyEndDate', () => {
  test('52 semanas justas desde el día de inicio', () => {
    expect(maxWeeklyEndDate('2026-08-05')).toBe('2027-08-04')
  })

  test('el tope cruza un cambio de hora sin perder un día', () => {
    // Del invierno al verano y vuelta: si se contara en milisegundos, saldría el 3.
    expect(maxWeeklyEndDate('2026-01-15')).toBe('2027-01-14')
  })
})

test.describe('weekdayOf', () => {
  test('devuelve el día local, no el de UTC', () => {
    expect(weekdayOf('2026-08-05')).toBe(3)  // miércoles
    expect(weekdayOf('2026-08-09')).toBe(0)  // domingo
  })
})
