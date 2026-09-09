import { test, expect } from '@playwright/test'
import { listaParaCompartir } from '@/lib/text'

// Lo que llega al chat de quien va al súper. La mitad de las veces esa persona
// no tiene cuenta —el abuelo, el amigo que pasa por allí—, así que este texto es
// toda la información que va a tener.

test('lleva el nombre con su emoji delante y una línea por cosa', () => {
  const texto = listaParaCompartir('Compra', '🛒', [
    { text: 'Café', quantity: 1 },
    { text: 'Leche', quantity: 3 },
  ])
  expect(texto).toBe('🛒 Compra\n- Café\n- Leche ×3')
})

test('la cantidad solo se escribe cuando pasa de una', () => {
  const texto = listaParaCompartir('Compra', '🛒', [{ text: 'Pan', quantity: 1 }])
  expect(texto).not.toContain('×')
})

test('una lista sin emoji propio lleva el de por defecto', () => {
  expect(listaParaCompartir('Farmacia', null, [{ text: 'Ibuprofeno', quantity: 1 }]))
    .toBe('📋 Farmacia\n- Ibuprofeno')
})

test('sin nada pendiente no hay nada que mandar', () => {
  expect(listaParaCompartir('Compra', '🛒', [])).toBe('')
})
