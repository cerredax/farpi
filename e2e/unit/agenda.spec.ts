import { test, expect } from '@playwright/test'
import { tramoDeAgenda } from '@/lib/agenda'

// Los rótulos de la agenda son fechas dichas en palabras, y por eso se prueban
// aquí: "Mañana" o "La semana que viene" salen mal por un día de diferencia y
// eso no se ve en una captura.

// Un lunes, para tener la semana entera por delante en los casos normales.
const LUNES = new Date(2026, 7, 24)

test.describe('tramoDeAgenda', () => {
  test('el día siguiente a hoy es "Mañana", no "Esta semana"', () => {
    expect(tramoDeAgenda(new Date(2026, 7, 25), LUNES, LUNES)).toBe('Mañana')
  })

  test('el resto de la semana del día elegido va en "Esta semana"', () => {
    expect(tramoDeAgenda(new Date(2026, 7, 26), LUNES, LUNES)).toBe('Esta semana')
    // Domingo, último día de la semana que empieza en lunes.
    expect(tramoDeAgenda(new Date(2026, 7, 30), LUNES, LUNES)).toBe('Esta semana')
  })

  test('la semana siguiente tiene su propio rótulo', () => {
    expect(tramoDeAgenda(new Date(2026, 7, 31), LUNES, LUNES)).toBe('La semana que viene')
    expect(tramoDeAgenda(new Date(2026, 8, 6), LUNES, LUNES)).toBe('La semana que viene')
  })

  test('más allá de dos semanas se agrupa por mes', () => {
    expect(tramoDeAgenda(new Date(2026, 8, 7), LUNES, LUNES)).toBe('Septiembre')
    expect(tramoDeAgenda(new Date(2026, 9, 2), LUNES, LUNES)).toBe('Octubre')
  })

  test('el mes lleva año cuando no es el del día elegido', () => {
    const diciembre = new Date(2026, 11, 20)
    expect(tramoDeAgenda(new Date(2027, 0, 15), diciembre, diciembre)).toBe('Enero 2027')
  })

  // "Mañana" es mañana de verdad. Si el tramo se mide desde un día futuro, el
  // día siguiente a ese no es mañana para nadie: es parte de su semana.
  test('mirando un día futuro, el siguiente no se llama "Mañana"', () => {
    const futuro = new Date(2026, 8, 14)
    expect(tramoDeAgenda(new Date(2026, 8, 15), futuro, LUNES)).toBe('Esta semana')
  })

  // Un domingo, mañana ya es de la semana que viene: gana "Mañana" igual, que
  // es lo que se pregunta, y detrás siguen los tramos en orden.
  test('en domingo, mañana sigue siendo "Mañana"', () => {
    const domingo = new Date(2026, 7, 30)
    expect(tramoDeAgenda(new Date(2026, 7, 31), domingo, domingo)).toBe('Mañana')
    expect(tramoDeAgenda(new Date(2026, 8, 1), domingo, domingo)).toBe('La semana que viene')
  })
})
