import { test, expect } from '@playwright/test'
import { destinoDeLista, entenderEvento, separarItems } from '@/lib/dictado'

// Lo dictado llega como una frase y la lista necesita ítems. Estas reglas son las
// que se equivocan, así que se prueban sin micrófono.

test.describe('separarItems', () => {
  test('parte por comas y por «y»', () => {
    expect(separarItems('leche, pan y huevos')).toEqual(['Leche', 'Pan', 'Huevos'])
  })

  test('quita la fórmula de pedir y el destino', () => {
    expect(separarItems('Añade leche, pan y huevos a la compra')).toEqual(['Leche', 'Pan', 'Huevos'])
    expect(separarItems('apunta papel de cocina en la lista de la compra')).toEqual(['Papel de cocina'])
    expect(separarItems('hay que comprar detergente')).toEqual(['Detergente'])
  })

  test('un solo ítem se queda como está, con mayúscula', () => {
    expect(separarItems('leche entera')).toEqual(['Leche entera'])
  })

  test('«compra» sola es un ítem, no una petición', () => {
    expect(separarItems('compra')).toEqual(['Compra'])
  })

  test('no parte una palabra que lleva «y» dentro', () => {
    expect(separarItems('yogur y mayonesa')).toEqual(['Yogur', 'Mayonesa'])
  })

  test('sin repetidos ni vacíos, y sin puntuación del dictado', () => {
    expect(separarItems('pan, Pan,  , leche.')).toEqual(['Pan', 'Leche'])
    expect(separarItems('   ')).toEqual([])
  })

  test('también en inglés', () => {
    expect(separarItems('add milk, bread and eggs to the shopping list')).toEqual(['Milk', 'Bread', 'Eggs'])
  })
})

test.describe('destinoDeLista', () => {
  const listas = [
    { id: 'compra', name: 'Compra' },
    { id: 'grande', name: 'Compra grande' },
    { id: 'ferre', name: 'Ferretería' },
  ]

  test('lee la lista del final de la frase', () => {
    expect(destinoDeLista('tornillos y cinta a la ferretería', listas))
      .toEqual({ frase: 'tornillos y cinta', listaId: 'ferre' })
    expect(destinoDeLista('añade leche en la lista de la compra', listas))
      .toEqual({ frase: 'añade leche', listaId: 'compra' })
  })

  test('la de nombre más largo gana a la que es parte de él', () => {
    expect(destinoDeLista('detergente a la compra grande', listas).listaId).toBe('grande')
  })

  test('sin lista dicha, no elige ninguna', () => {
    expect(destinoDeLista('leche, pan y huevos', listas)).toEqual({ frase: 'leche, pan y huevos', listaId: null })
  })

  test('un ítem que se llama como una lista no la elige sin preposición', () => {
    expect(destinoDeLista('tarta ferretería', listas).listaId).toBeNull()
  })
})

test.describe('entenderEvento', () => {
  // Miércoles 7 de octubre de 2026.
  const hoy = new Date(2026, 9, 7)
  const gente = [
    { nombre: 'Leo', child_id: 'leo', member_id: null },
    { nombre: 'Marta', child_id: null, member_id: 'marta' },
  ]

  test('día de mañana y hora de la tarde', () => {
    expect(entenderEvento('Dentista mañana a las 5 de la tarde', hoy)).toEqual({
      titulo: 'Dentista', fecha: '2026-10-08', hora: '17:00', persona: null,
    })
  })

  test('día de la semana, hora y media, y a quién le toca', () => {
    expect(entenderEvento('revisión de Leo el viernes a las 10 y media', hoy, gente)).toEqual({
      titulo: 'Revisión de Leo', fecha: '2026-10-09', hora: '10:30', persona: { child_id: 'leo', member_id: null },
    })
  })

  test('«de la mañana» es la franja, no el día de mañana', () => {
    const e = entenderEvento('reunión a las 9 de la mañana', hoy)
    expect(e.hora).toBe('09:00')
    expect(e.fecha).toBeNull()
  })

  test('hora en 24 horas y en palabras', () => {
    expect(entenderEvento('cena hoy a las 21:00', hoy).hora).toBe('21:00')
    expect(entenderEvento('yoga a las ocho menos cuarto', hoy).hora).toBe('07:45')
    expect(entenderEvento('yoga a las cinco y cuarto', hoy).hora).toBe('17:15')
  })

  test('el día de la semana es el próximo, nunca hoy', () => {
    expect(entenderEvento('piscina el miércoles', hoy).fecha).toBe('2026-10-14')
  })

  test('un día del mes, este mes o el siguiente, y con mes dicho', () => {
    expect(entenderEvento('reunión el 20', hoy).fecha).toBe('2026-10-20')
    expect(entenderEvento('reunión el 5', hoy).fecha).toBe('2026-11-05')
    expect(entenderEvento('cumple el 15 de octubre', hoy).fecha).toBe('2026-10-15')
    expect(entenderEvento('cumple el 3 de octubre', hoy).fecha).toBe('2027-10-03')
  })

  test('lo que no entiende se queda en null y el resto es el título', () => {
    expect(entenderEvento('Dentista', hoy)).toEqual({ titulo: 'Dentista', fecha: null, hora: null, persona: null })
    expect(entenderEvento('apunta comprar regalo el sábado en el calendario', hoy))
      .toEqual({ titulo: 'Comprar regalo', fecha: '2026-10-10', hora: null, persona: null })
  })

  test('pasado mañana', () => {
    expect(entenderEvento('pediatra pasado mañana', hoy).fecha).toBe('2026-10-09')
  })
})
