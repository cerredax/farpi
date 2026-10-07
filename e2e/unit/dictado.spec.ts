import { test, expect } from '@playwright/test'
import { separarItems } from '@/lib/dictado'

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
