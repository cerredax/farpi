import { test, expect } from '@playwright/test'
import { daysBetween, eventCoversDay, eventTitleOr, isAbsence, isHoliday, isPersonAvailableOnDay, isPersonOffOnDay, isRangeKind, isRestDay, isVacation, vacationEdges, vacationLength } from '@/lib/events'
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

test('daysBetween cuenta los dos extremos y protege el rango inválido', () => {
  expect(daysBetween('2026-08-10', '2026-08-16')).toBe(7)
  expect(daysBetween('2026-08-10', '2026-08-10')).toBe(1)
  // Rango al revés o incompleto: cero, para que el formulario no muestre basura.
  expect(daysBetween('2026-08-16', '2026-08-10')).toBe(0)
  expect(daysBetween('2026-08-10', '')).toBe(0)
  expect(daysBetween('', '2026-08-16')).toBe(0)
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

test('un descanso cubre todos los días del rango y se reconoce por tipo', () => {
  const descanso = event({ kind: 'descanso', all_day: true, start_at: '2026-08-10T00:00:00', end_at: '2026-08-12T23:59:00' })
  expect(isRestDay(descanso)).toBe(true)
  expect(eventCoversDay(descanso, '2026-08-10')).toBe(true)
  expect(eventCoversDay(descanso, '2026-08-11')).toBe(true)
  expect(eventCoversDay(descanso, '2026-08-12')).toBe(true)
  expect(eventCoversDay(descanso, '2026-08-13')).toBe(false)
})

test('la disponibilidad dice si puedes contar con una persona ese día', () => {
  const descanso = event({
    kind: 'descanso',
    member_id: 'm1',
    child_id: null,
    start_at: '2026-08-10T00:00:00',
    end_at: '2026-08-12T23:59:00',
  })

  expect(isPersonOffOnDay([descanso], { child_id: null, member_id: 'm1' }, '2026-08-11')).toBe(true)
  expect(isPersonAvailableOnDay([descanso], { child_id: null, member_id: 'm1' }, '2026-08-13')).toBe(true)
  expect(isPersonAvailableOnDay([descanso], { child_id: null, member_id: 'm2' }, '2026-08-11')).toBe(true)
})

// El formulario no pide título en vacaciones ni en descansos, pero `title` no es
// nullable en la base y la franja del calendario lo enseña.
// Vacaciones y descansos son lo mismo para el calendario: quién no está. De ahí
// que compartan el tinte del día y el bloque de "Vacaciones y descansos".

test.describe('isAbsence', () => {
  test('vacaciones y descansos cuentan; un plan no', () => {
    expect(isAbsence(event({ kind: 'vacaciones' }))).toBe(true)
    expect(isAbsence(event({ kind: 'descanso' }))).toBe(true)
    expect(isAbsence(event({ kind: 'evento' }))).toBe(false)
  })
})

test.describe('eventTitleOr', () => {
  test('pone el nombre del tipo cuando no hay título', () => {
    expect(eventTitleOr('vacaciones', '')).toBe('Vacaciones')
    expect(eventTitleOr('descanso', '   ')).toBe('Descanso')
  })

  test('respeta el título que se haya escrito', () => {
    expect(eventTitleOr('vacaciones', 'Playa con los abuelos')).toBe('Playa con los abuelos')
    expect(eventTitleOr('descanso', 'Turno de noche')).toBe('Turno de noche')
  })

  test('recorta los espacios de los lados', () => {
    expect(eventTitleOr('vacaciones', '  Asturias  ')).toBe('Asturias')
  })

  // Un plan sí necesita nombre y el validador lo exige antes de llegar aquí:
  // esta función no se lo inventa.
  test('a un plan sin título no le pone nada', () => {
    expect(eventTitleOr('evento', '')).toBe('')
  })
})

// Un festivo es la cuarta cara de `kind`, y la que no es de nadie: dice que ese
// día no hay trabajo ni colegio, no quién falta. De ahí que se quede fuera de
// `isAbsence` —que responde "¿con quién no puedo contar?"— y dentro de
// `isRangeKind`, porque un puente son dos o tres días seguidos.
test('un festivo ocupa días completos pero no es una ausencia', () => {
  const festivo = event({ kind: 'festivo', all_day: true, start_at: '2026-12-06T00:00:00', end_at: '2026-12-08T23:59:00' })
  expect(isHoliday(festivo)).toBe(true)
  expect(isAbsence(festivo)).toBe(false)
  expect(isVacation(festivo)).toBe(false)
  expect(isRestDay(festivo)).toBe(false)
  expect(eventCoversDay(festivo, '2026-12-07')).toBe(true)
  expect(eventCoversDay(festivo, '2026-12-09')).toBe(false)
})

test('los tres tipos de rango piden día final; un plan no', () => {
  expect(isRangeKind('vacaciones')).toBe(true)
  expect(isRangeKind('descanso')).toBe(true)
  expect(isRangeKind('festivo')).toBe(true)
  expect(isRangeKind('evento')).toBe(false)
})

// Sin título escrito, cada tipo se guarda con el suyo. Un plan no: ahí el título
// es obligatorio y lo exige el validador.
test('un festivo sin título se guarda como "Festivo"', () => {
  expect(eventTitleOr('festivo', '   ')).toBe('Festivo')
  expect(eventTitleOr('festivo', 'Hispanidad')).toBe('Hispanidad')
  expect(eventTitleOr('evento', '   ')).toBe('')
})
