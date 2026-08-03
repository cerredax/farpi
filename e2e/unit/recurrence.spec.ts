import { test, expect } from '@playwright/test'
import { buildWeeklyDates, buildYearlyDates, getNextOccurrence } from '@/lib/recurrence'

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
