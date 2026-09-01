import { test, expect } from '@playwright/test'
import {
  agruparPresupuestos, cuentaDelMes, estaCaducado, fijosDe, gastosSinTope,
  mesDe, mesVecino, movimientosDelMes, repartoDelMes, resumenTopes,
  sumaDeFijos, titulosDePresupuestos,
} from '@/lib/budgets'
import type { Budget, Child, Expense, FamilyMember, FixedEntry, Quote } from '@/types'

// Lo que la pantalla de Finanzas calcula y no está guardado en ninguna fila.

function budget(over: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    family_id: 'f1',
    name: 'Compra',
    emoji: '🛒',
    monthly_limit_cents: 30000,
    sort_order: 0,
    created_by: 'u1',
    created_at: '2026-08-01T10:00:00',
    updated_at: '2026-08-01T10:00:00',
    ...over,
  }
}

function gasto(over: Partial<Expense> = {}): Expense {
  return {
    id: 'g1',
    family_id: 'f1',
    budget_id: 'b1',
    child_id: null,
    member_id: null,
    kind: 'gasto',
    amount_cents: 1000,
    date: '2026-08-15',
    description: null,
    created_by: 'u1',
    created_at: '2026-08-15T10:00:00',
    updated_at: '2026-08-15T10:00:00',
    ...over,
  }
}

/** Un movimiento de entrada. Nunca cuelga de un tope, así que nace sin él. */
function ingreso(over: Partial<Expense> = {}): Expense {
  return gasto({ id: 'i1', kind: 'ingreso', budget_id: null, ...over })
}

function fijo(over: Partial<FixedEntry> = {}): FixedEntry {
  return {
    id: 'fx1',
    family_id: 'f1',
    kind: 'gasto',
    name: 'Alquiler',
    emoji: '🏠',
    amount_cents: 78000,
    child_id: null,
    member_id: null,
    sort_order: 0,
    created_by: 'u1',
    created_at: '2026-08-01T10:00:00',
    updated_at: '2026-08-01T10:00:00',
    ...over,
  }
}

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

const MIEMBROS: FamilyMember[] = [
  { id: 'm1', family_id: 'f1', user_id: 'u1', display_name: 'Omar',  avatar_url: null, color: '#A8503A', role: 'admin',  created_at: '2026-06-01T00:00:00' },
  { id: 'm2', family_id: 'f1', user_id: 'u2', display_name: 'Sofía', avatar_url: null, color: '#4A6C8C', role: 'member', created_at: '2026-06-01T00:00:00' },
]
const HIJOS: Child[] = []

test.describe('el mes', () => {
  test('mesDe corta la cadena, sin pasar por Date', () => {
    expect(mesDe('2026-08-31')).toBe('2026-08')
    // El caso que rompería con `new Date()`: el último día del mes a última
    // hora, que en UTC ya sería el mes siguiente.
    expect(mesDe('2026-12-31')).toBe('2026-12')
  })

  test('mesVecino cruza el año en los dos sentidos', () => {
    expect(mesVecino('2026-08', 1)).toBe('2026-09')
    expect(mesVecino('2026-12', 1)).toBe('2027-01')
    expect(mesVecino('2026-01', -1)).toBe('2025-12')
  })
})

test.describe('resumenTopes', () => {
  test('suma solo los gastos de ese mes y de ese presupuesto', () => {
    const r = resumenTopes(
      [budget({ id: 'b1' }), budget({ id: 'b2', name: 'Casa', sort_order: 1, monthly_limit_cents: 10000 })],
      [
        gasto({ id: 'g1', budget_id: 'b1', amount_cents: 6000, date: '2026-08-05' }),
        gasto({ id: 'g2', budget_id: 'b1', amount_cents: 4000, date: '2026-08-20' }),
        // De otro mes: no cuenta.
        gasto({ id: 'g3', budget_id: 'b1', amount_cents: 9900, date: '2026-07-31' }),
        // De otro presupuesto.
        gasto({ id: 'g4', budget_id: 'b2', amount_cents: 2500, date: '2026-08-10' }),
        // Sin presupuesto: no cuenta para ningún tope.
        gasto({ id: 'g5', budget_id: null, amount_cents: 5000, date: '2026-08-10' }),
      ],
      '2026-08',
    )
    expect(r.map(x => [x.budget.id, x.gastado])).toEqual([['b1', 10000], ['b2', 2500]])
    expect(r[0].restante).toBe(20000)
    expect(r[0].porcentaje).toBe(33)
    expect(r[0].pasado).toBe(false)
  })

  // Un presupuesto sin gastos es justo lo que hay que ver a primeros de mes.
  test('los presupuestos sin gastos también salen, a cero', () => {
    const r = resumenTopes([budget()], [], '2026-08')
    expect(r).toHaveLength(1)
    expect(r[0].gastado).toBe(0)
    expect(r[0].porcentaje).toBe(0)
  })

  test('pasarse deja el restante en negativo y la barra al tope', () => {
    const r = resumenTopes(
      [budget({ monthly_limit_cents: 10000 })],
      [gasto({ amount_cents: 34000 })],
      '2026-08',
    )
    expect(r[0].pasado).toBe(true)
    expect(r[0].restante).toBe(-24000)
    // Recortado: una barra del 340 % se saldría de la tarjeta.
    expect(r[0].porcentaje).toBe(100)
  })

  test('gastarlo justo no es pasarse', () => {
    const r = resumenTopes([budget({ monthly_limit_cents: 10000 })], [gasto({ amount_cents: 10000 })], '2026-08')
    expect(r[0].pasado).toBe(false)
    expect(r[0].restante).toBe(0)
  })

  test('gastosSinTope son los del mes que no cuelgan de ninguno', () => {
    const r = gastosSinTope([
      gasto({ id: 'con', budget_id: 'b1' }),
      gasto({ id: 'sin', budget_id: null }),
      gasto({ id: 'otro-mes', budget_id: null, date: '2026-07-01' }),
    ], '2026-08')
    expect(r.map(e => e.id)).toEqual(['sin'])
  })
})

test.describe('los movimientos del mes', () => {
  test('movimientosDelMes trae gastos e ingresos juntos, del más reciente al más viejo', () => {
    const r = movimientosDelMes([
      gasto({ id: 'g-viejo', date: '2026-08-02' }),
      ingreso({ id: 'i', date: '2026-08-20' }),
      gasto({ id: 'g-nuevo', date: '2026-08-25' }),
      gasto({ id: 'otro-mes', date: '2026-07-30' }),
    ], '2026-08')
    expect(r.map(m => m.id)).toEqual(['g-nuevo', 'i', 'g-viejo'])
  })

  // Si un ingreso descontara de un tope, una devolución de 40 € "liberaría"
  // 40 € de la compra sin que nadie haya dejado de comprar.
  test('un ingreso no cuenta para ningún tope', () => {
    const r = resumenTopes(
      [budget({ monthly_limit_cents: 30000 })],
      [
        gasto({ id: 'g', budget_id: 'b1', amount_cents: 10000 }),
        // Aunque llegara con `budget_id` puesto —la base no deja, pero el
        // cálculo no puede depender de eso—, se queda fuera.
        ingreso({ id: 'i', budget_id: 'b1', amount_cents: 4000 }),
      ],
      '2026-08',
    )
    expect(r[0].gastado).toBe(10000)
  })

  test('«sin tope» cuenta gastos, no ingresos', () => {
    const r = gastosSinTope([
      gasto({ id: 'sin', budget_id: null }),
      ingreso({ id: 'entrada' }),
    ], '2026-08')
    expect(r.map(m => m.id)).toEqual(['sin'])
  })
})

test.describe('los fijos y la cuenta del mes', () => {
  const FIJOS = [
    fijo({ id: 'in1', kind: 'ingreso', name: 'Nómina de Omar', amount_cents: 165000, sort_order: 0 }),
    fijo({ id: 'in2', kind: 'ingreso', name: 'Nómina de Sofía', amount_cents: 148000, sort_order: 1 }),
    fijo({ id: 'ga1', kind: 'gasto', name: 'Alquiler', amount_cents: 78000, sort_order: 0 }),
    fijo({ id: 'ga2', kind: 'gasto', name: 'Luz', amount_cents: 7400, sort_order: 1 }),
  ]

  test('fijosDe separa por tipo y respeta el orden de la pantalla', () => {
    expect(fijosDe(FIJOS, 'ingreso').map(f => f.id)).toEqual(['in1', 'in2'])
    expect(fijosDe(FIJOS, 'gasto').map(f => f.id)).toEqual(['ga1', 'ga2'])
  })

  test('con el mismo sort_order desempata el nombre', () => {
    const r = fijosDe([
      fijo({ id: 'z', name: 'Zumba', sort_order: 0 }),
      fijo({ id: 'a', name: 'Agua', sort_order: 0 }),
    ], 'gasto')
    expect(r.map(f => f.id)).toEqual(['a', 'z'])
  })

  test('sumaDeFijos suma solo los de su tipo', () => {
    expect(sumaDeFijos(FIJOS, 'ingreso')).toBe(313000)
    expect(sumaDeFijos(FIJOS, 'gasto')).toBe(85400)
  })

  // La cuenta entera, que es el número que la pantalla existe para dar.
  test('queda = fijos + ingresos apuntados − gastos apuntados', () => {
    const c = cuentaDelMes(FIJOS, [
      gasto({ id: 'g1', amount_cents: 6000 }),
      gasto({ id: 'g2', amount_cents: 4000, budget_id: null }),
      ingreso({ id: 'i1', amount_cents: 12000 }),
      // De otro mes: no toca la cuenta de este.
      gasto({ id: 'viejo', amount_cents: 99900, date: '2026-07-15' }),
    ], '2026-08')

    expect(c.ingresosFijos).toBe(313000)
    expect(c.gastosFijos).toBe(85400)
    expect(c.paraElMes).toBe(227600)
    expect(c.gastosApuntados).toBe(10000)
    expect(c.ingresosApuntados).toBe(12000)
    expect(c.queda).toBe(229600)
    expect(c.hayFijos).toBe(true)
  })

  // Los fijos no llevan vigencias: son una cifra que vale hasta que se cambie.
  // Mirar julio con el alquiler de hoy es la contrapartida asumida.
  test('los fijos valen igual en cualquier mes que se mire', () => {
    const agosto = cuentaDelMes(FIJOS, [], '2026-08')
    const mayo = cuentaDelMes(FIJOS, [], '2026-05')
    expect(mayo.paraElMes).toBe(agosto.paraElMes)
  })

  // Sin fijos, «queda» sería el gasto del mes en negativo, que no significa
  // nada. La pantalla lo mira para enseñar otra cosa.
  test('sin ningún fijo lo dice, y la cuenta se queda en el gasto del mes', () => {
    const c = cuentaDelMes([], [gasto({ amount_cents: 4200 })], '2026-08')
    expect(c.hayFijos).toBe(false)
    expect(c.paraElMes).toBe(0)
    expect(c.gastosApuntados).toBe(4200)
    expect(c.queda).toBe(-4200)
  })

  test('gastar más de lo que hay deja «queda» en negativo', () => {
    const c = cuentaDelMes(
      [fijo({ kind: 'ingreso', amount_cents: 100000 }), fijo({ kind: 'gasto', amount_cents: 90000 })],
      [gasto({ amount_cents: 15000 })],
      '2026-08',
    )
    expect(c.queda).toBe(-5000)
  })
})

test.describe('repartoDelMes', () => {
  test('agrupa por quién pagó y deja la cuenta común como «De casa»', () => {
    const r = repartoDelMes([
      gasto({ id: 'g1', member_id: 'm1', amount_cents: 5000 }),
      gasto({ id: 'g2', member_id: 'm1', amount_cents: 1000 }),
      gasto({ id: 'g3', member_id: 'm2', amount_cents: 2000 }),
      gasto({ id: 'g4', member_id: null, amount_cents: 300 }),
    ], '2026-08', MIEMBROS, HIJOS)

    expect(r.map(a => [a.nombre, a.total])).toEqual([
      ['Omar', 6000],
      ['Sofía', 2000],
      ['De casa', 300],
    ])
    expect(r[0].color).toBe('#A8503A')
    // Lo de la cuenta común no es de nadie, así que no lleva color de persona.
    expect(r[2].color).toBeNull()
  })

  // Con los ingresos dentro, la línea diría "Omar 121.000" mezclando una nómina
  // con la compra, y dejaría de significar lo único que significa: quién ha ido
  // poniendo el dinero del día a día.
  test('los ingresos no entran en el reparto', () => {
    const r = repartoDelMes([
      gasto({ id: 'g1', member_id: 'm1', amount_cents: 5000 }),
      ingreso({ id: 'i1', member_id: 'm1', amount_cents: 120000 }),
    ], '2026-08', MIEMBROS, HIJOS)

    expect(r.map(a => [a.nombre, a.total])).toEqual([['Omar', 5000]])
  })
})

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
