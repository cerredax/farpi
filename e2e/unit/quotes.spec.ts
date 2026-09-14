import { test, expect } from '@playwright/test'
import { agruparPresupuestos, estaCaducado, titulosDePresupuestos } from '@/lib/quotes'
import type { Quote } from '@/types'

// Los presupuestos que te pasan de fuera: agruparlos por trabajo, marcar el más
// barato mientras la cosa siga sin decidir y saber cuándo un precio ya no vale.
// Vivían en `budgets.spec.ts` hasta el 14-09-2026, con su librería.

function pedido(over: Partial<Quote> = {}): Quote {
  return {
    id: 'p1',
    family_id: 'f1',
    title: 'Cambiar la caldera',
    provider: 'Fontanería López',
    amount_cents: 240000,
    status: 'pedido',
    valid_until: null,
    notes: null,
    created_by: 'u1',
    created_at: '2026-08-01T10:00:00',
    updated_at: '2026-08-01T10:00:00',
    ...over,
  }
}

test.describe('agruparPresupuestos', () => {
  test('junta los del mismo trabajo aunque se escriban distinto', () => {
    const grupos = agruparPresupuestos([
      pedido({ id: 'p1', title: 'Cambiar la caldera' }),
      pedido({ id: 'p2', title: 'cambiar la  CALDERA', provider: 'Clima Ruiz', amount_cents: 215000 }),
      pedido({ id: 'p3', title: 'Pintar el salón', provider: 'Nieto', amount_cents: 62000 }),
    ])
    expect(grupos).toHaveLength(2)
    const caldera = grupos.find(g => g.quotes.length === 2)!
    expect(caldera.quotes.map(q => q.id)).toEqual(['p2', 'p1'])
  })

  test('marca el más barato solo mientras el trabajo sigue sin decidir', () => {
    const abierto = agruparPresupuestos([
      pedido({ id: 'caro', amount_cents: 240000 }),
      pedido({ id: 'barato', amount_cents: 215000 }),
    ])[0]
    expect(abierto.masBaratoId).toBe('barato')
    expect(abierto.decidido).toBe(false)

    // Ya se aceptó uno: marcar el barato sería un reproche a una decisión tomada.
    const decidido = agruparPresupuestos([
      pedido({ id: 'caro', amount_cents: 240000, status: 'aceptado' }),
      pedido({ id: 'barato', amount_cents: 215000 }),
    ])[0]
    expect(decidido.masBaratoId).toBeNull()
    expect(decidido.decidido).toBe(true)
  })

  test('un descartado no puede ser el más barato', () => {
    const g = agruparPresupuestos([
      pedido({ id: 'descartado', amount_cents: 100000, status: 'descartado' }),
      pedido({ id: 'vivo', amount_cents: 215000 }),
      pedido({ id: 'otro-vivo', amount_cents: 240000 }),
    ])[0]
    expect(g.masBaratoId).toBe('vivo')
  })

  test('uno solo no se marca: no hay con qué compararlo', () => {
    expect(agruparPresupuestos([pedido()])[0].masBaratoId).toBeNull()
  })

  test('los grupos sin decidir van primero', () => {
    const grupos = agruparPresupuestos([
      pedido({ id: 'p1', title: 'Aaa pintar', status: 'aceptado' }),
      pedido({ id: 'p2', title: 'Zzz caldera' }),
    ])
    expect(grupos.map(g => g.titulo)).toEqual(['Zzz caldera', 'Aaa pintar'])
  })

  test('los títulos ya usados se ofrecen una sola vez', () => {
    expect(titulosDePresupuestos([
      pedido({ id: 'p1', title: 'Cambiar la caldera' }),
      pedido({ id: 'p2', title: 'cambiar la caldera' }),
      pedido({ id: 'p3', title: 'Pintar el salón' }),
    ])).toEqual(['Cambiar la caldera', 'Pintar el salón'])
  })
})

test('estaCaducado solo con fecha, y el mismo día todavía vale', () => {
  expect(estaCaducado(pedido({ valid_until: null }), '2026-08-31')).toBe(false)
  expect(estaCaducado(pedido({ valid_until: '2026-08-31' }), '2026-08-31')).toBe(false)
  expect(estaCaducado(pedido({ valid_until: '2026-08-30' }), '2026-08-31')).toBe(true)
})
