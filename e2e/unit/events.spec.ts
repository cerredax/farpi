import { test, expect } from '@playwright/test'
import { eventCoversDay, isVacation, vacationEdges, vacationLength } from '@/lib/events'
import { event } from './fixtures'

// Antes de las vacaciones, el calendario daba por hecho que un evento vivía en
// un solo día. Estas reglas son las que permiten que ocupe un tramo.

test.describe('eventCoversDay', () => {
  test('un evento de un día solo cubre ese día', () => {
    const e = event({ start_at: '2026-08-10T10:00:00' })
    expect(eventCoversDay(e, '2026-08-10')).toBe(true)
    expect(eventCoversDay(e, '2026-08-09')).toBe(false)
    expect(eventCoversDay(e, '2026-08-11')).toBe(false)
  })

  test('un evento con hora de fin sigue siendo de un solo día', () => {
    const e = event({ start_at: '2026-08-10T10:00:00', end_at: '2026-08-10T12:00:00' })
    expect(eventCoversDay(e, '2026-08-10')).toBe(true)
    expect(eventCoversDay(e, '2026-08-11')).toBe(false)
  })

  test('unas vacaciones cubren todos los días del rango, extremos incluidos', () => {
    const v = event({ kind: 'vacaciones', all_day: true, start_at: '2026-08-10T00:00:00', end_at: '2026-08-16T23:59:00' })
    for (const d of ['2026-08-10', '2026-08-13', '2026-08-16']) {
      expect(eventCoversDay(v, d), d).toBe(true)
    }
    expect(eventCoversDay(v, '2026-08-09')).toBe(false)
    expect(eventCoversDay(v, '2026-08-17')).toBe(false)
  })

  test('acepta tanto Date como cadena', () => {
    const v = event({ kind: 'vacaciones', start_at: '2026-08-10T00:00:00', end_at: '2026-08-16T23:59:00' })
    expect(eventCoversDay(v, new Date(2026, 7, 13))).toBe(true)
    expect(eventCoversDay(v, new Date(2026, 7, 20))).toBe(false)
  })

  test('cruza el cambio de mes', () => {
    const v = event({ kind: 'vacaciones', start_at: '2026-08-28T00:00:00', end_at: '2026-09-04T23:59:00' })
    expect(eventCoversDay(v, '2026-08-31')).toBe(true)
    expect(eventCoversDay(v, '2026-09-01')).toBe(true)
  })
})

test('vacationLength cuenta el primer y el último día', () => {
  const v = event({ kind: 'vacaciones', start_at: '2026-08-10T00:00:00', end_at: '2026-08-16T23:59:00' })
  expect(vacationLength(v)).toBe(7)
  const uno = event({ kind: 'vacaciones', start_at: '2026-08-10T00:00:00', end_at: '2026-08-10T23:59:00' })
  expect(vacationLength(uno)).toBe(1)
})

test('vacationEdges distingue el primer y el último día del tramo', () => {
  const v = event({ kind: 'vacaciones', start_at: '2026-08-10T00:00:00', end_at: '2026-08-16T23:59:00' })
  expect(vacationEdges(v, '2026-08-10')).toEqual({ primero: true, ultimo: false })
  expect(vacationEdges(v, '2026-08-13')).toEqual({ primero: false, ultimo: false })
  expect(vacationEdges(v, '2026-08-16')).toEqual({ primero: false, ultimo: true })
})

test('isVacation distingue el tipo', () => {
  expect(isVacation(event({ kind: 'vacaciones' }))).toBe(true)
  expect(isVacation(event())).toBe(false)
})
