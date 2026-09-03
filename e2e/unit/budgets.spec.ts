import { test, expect } from '@playwright/test'
import {
  agruparPresupuestos, apuntesDelMes, cuentaDelMes, estaCaducado, fijosDe,
  gastosSinPartida, mediaQueQueda, mesDe, mesVecino, plantillaDelMes,
  repartoDelMes, repartoPorPartida, resumenPartidas, serieDeMeses, sumaDeFijos,
  titulosDePresupuestos,
} from '@/lib/budgets'
import type {
  Budget, Child, Expense, FamilyMember, FixedEntry, MonthPlan, MonthPlanLine, Quote,
} from '@/types'

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

/** Un apunte de entrada. Nunca cuelga de una partida, así que nace sin ella. */
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

function linea(over: Partial<MonthPlanLine> = {}): MonthPlanLine {
  return {
    id: 'mp1',
    family_id: 'f1',
    month: '2026-07',
    line: 'gasto',
    budget_id: null,
    name: 'Alquiler',
    emoji: '🏠',
    amount_cents: 76000,
    child_id: null,
    member_id: null,
    sort_order: 0,
    created_at: '2026-08-01T05:00:00',
    ...over,
  }
}

function plan(month: string, lines: MonthPlanLine[]): MonthPlan {
  return { family_id: 'f1', month, closed_at: `${month}-28T05:00:00`, lines }
}

/**
 * La plantilla resuelta de un mes en curso. Es lo que esperaban los tests de
 * partidas y de la cuenta antes de que los meses tuvieran historia: como mes
 * actual se pasa `'2026-08'`, así que agosto sale espejo de lo que se le dé.
 */
function espejo(fixed: FixedEntry[] = [], budgets: Budget[] = []) {
  return plantillaDelMes('2026-08', '2026-08', fixed, budgets, [])
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

test.describe('resumenPartidas', () => {
  test('suma solo los gastos de ese mes y de ese presupuesto', () => {
    const r = resumenPartidas(
      espejo([], [budget({ id: 'b1' }), budget({ id: 'b2', name: 'Casa', sort_order: 1, monthly_limit_cents: 10000 })]),
      [
        gasto({ id: 'g1', budget_id: 'b1', amount_cents: 6000, date: '2026-08-05' }),
        gasto({ id: 'g2', budget_id: 'b1', amount_cents: 4000, date: '2026-08-20' }),
        // De otro mes: no cuenta.
        gasto({ id: 'g3', budget_id: 'b1', amount_cents: 9900, date: '2026-07-31' }),
        // De otro presupuesto.
        gasto({ id: 'g4', budget_id: 'b2', amount_cents: 2500, date: '2026-08-10' }),
        // Sin partida: no cuenta para ninguna.
        gasto({ id: 'g5', budget_id: null, amount_cents: 5000, date: '2026-08-10' }),
      ],
      '2026-08',
    )
    expect(r.map(x => [x.partida.budgetId, x.gastado])).toEqual([['b1', 10000], ['b2', 2500]])
    expect(r[0].restante).toBe(20000)
    expect(r[0].porcentaje).toBe(33)
    expect(r[0].pasado).toBe(false)
  })

  // Un presupuesto sin gastos es justo lo que hay que ver a primeros de mes.
  test('los presupuestos sin gastos también salen, a cero', () => {
    const r = resumenPartidas(espejo([], [budget()]), [], '2026-08')
    expect(r).toHaveLength(1)
    expect(r[0].gastado).toBe(0)
    expect(r[0].porcentaje).toBe(0)
  })

  test('pasarse deja el restante en negativo y la barra al 100 %', () => {
    const r = resumenPartidas(
      espejo([], [budget({ monthly_limit_cents: 10000 })]),
      [gasto({ amount_cents: 34000 })],
      '2026-08',
    )
    expect(r[0].pasado).toBe(true)
    expect(r[0].restante).toBe(-24000)
    // Recortado: una barra del 340 % se saldría de la tarjeta.
    expect(r[0].porcentaje).toBe(100)
  })

  test('gastarlo justo no es pasarse', () => {
    const r = resumenPartidas(espejo([], [budget({ monthly_limit_cents: 10000 })]), [gasto({ amount_cents: 10000 })], '2026-08')
    expect(r[0].pasado).toBe(false)
    expect(r[0].restante).toBe(0)
  })

  test('gastosSinPartida son los del mes que no cuelgan de ninguna', () => {
    const r = gastosSinPartida([
      gasto({ id: 'con', budget_id: 'b1' }),
      gasto({ id: 'sin', budget_id: null }),
      gasto({ id: 'otro-mes', budget_id: null, date: '2026-07-01' }),
    ], '2026-08')
    expect(r.map(e => e.id)).toEqual(['sin'])
  })
})

test.describe('los apuntes del mes', () => {
  test('apuntesDelMes trae gastos e ingresos juntos, del más reciente al más viejo', () => {
    const r = apuntesDelMes([
      gasto({ id: 'g-viejo', date: '2026-08-02' }),
      ingreso({ id: 'i', date: '2026-08-20' }),
      gasto({ id: 'g-nuevo', date: '2026-08-25' }),
      gasto({ id: 'otro-mes', date: '2026-07-30' }),
    ], '2026-08')
    expect(r.map(m => m.id)).toEqual(['g-nuevo', 'i', 'g-viejo'])
  })

  // Si un ingreso descontara de una partida, una devolución de 40 € "liberaría"
  // 40 € de la compra sin que nadie haya dejado de comprar.
  test('un ingreso no cuenta para ninguna partida', () => {
    const r = resumenPartidas(
      espejo([], [budget({ monthly_limit_cents: 30000 })]),
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

  test('«sin partida» cuenta gastos, no ingresos', () => {
    const r = gastosSinPartida([
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
    const c = cuentaDelMes(espejo(FIJOS), [
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

  // Sin fijos, «queda» sería el gasto del mes en negativo, que no significa
  // nada. La pantalla lo mira para enseñar otra cosa.
  test('sin ningún fijo lo dice, y la cuenta se queda en el gasto del mes', () => {
    const c = cuentaDelMes(espejo([]), [gasto({ amount_cents: 4200 })], '2026-08')
    expect(c.hayFijos).toBe(false)
    expect(c.paraElMes).toBe(0)
    expect(c.gastosApuntados).toBe(4200)
    expect(c.queda).toBe(-4200)
  })

  test('gastar más de lo que hay deja «queda» en negativo', () => {
    const c = cuentaDelMes(
      espejo([fijo({ kind: 'ingreso', amount_cents: 100000 }), fijo({ kind: 'gasto', amount_cents: 90000 })]),
      [gasto({ amount_cents: 15000 })],
      '2026-08',
    )
    expect(c.queda).toBe(-5000)
  })
})

test.describe('qué plantilla valía en un mes', () => {
  const FIJOS = [
    fijo({ id: 'in1', kind: 'ingreso', name: 'Nómina', amount_cents: 200000 }),
    fijo({ id: 'ga1', kind: 'gasto', name: 'Alquiler', amount_cents: 80000 }),
  ]
  const PARTIDAS = [budget({ id: 'b1', name: 'Compra', monthly_limit_cents: 40000 })]

  // Junio se cerró con otros números: 760 de alquiler y 350 de compra.
  const JUNIO = plan('2026-06', [
    linea({ id: 'l1', month: '2026-06', line: 'ingreso', name: 'Nómina', amount_cents: 200000 }),
    linea({ id: 'l2', month: '2026-06', line: 'gasto', name: 'Alquiler', amount_cents: 76000 }),
    linea({ id: 'l3', month: '2026-06', line: 'partida', budget_id: 'b1', name: 'Compra', amount_cents: 35000 }),
  ])

  test('el mes en curso es espejo de la plantilla', () => {
    const p = plantillaDelMes('2026-08', '2026-08', FIJOS, PARTIDAS, [JUNIO])
    expect(p.origen).toBe('plantilla')
    expect(p.fijos.map(f => f.amountCents)).toEqual([200000, 80000])
    expect(p.partidas[0].limiteCents).toBe(40000)
  })

  // Un mes que aún no ha llegado enseña las cifras de la plantilla —es lo único
  // que se puede decir de él, y es lo que va a heredar cuando llegue— pero se
  // marca aparte, para que la pantalla pueda avisar y no ofrecer apuntar.
  test('un mes por venir refleja la plantilla, pero marcado como por venir', () => {
    const p = plantillaDelMes('2026-12', '2026-08', FIJOS, PARTIDAS, [])
    expect(p.origen).toBe('por-venir')
    expect(p.fijos.map(f => f.amountCents)).toEqual([200000, 80000])
    expect(p.partidas[0].limiteCents).toBe(40000)
  })

  // El caso entero: esto es lo que el cambio del 02-09-2026 vino a arreglar.
  test('un mes cerrado enseña lo que valía entonces, no lo de hoy', () => {
    const p = plantillaDelMes('2026-06', '2026-08', FIJOS, PARTIDAS, [JUNIO])
    expect(p.origen).toBe('copia')
    expect(p.fijos.find(f => f.name === 'Alquiler')?.amountCents).toBe(76000)
    expect(p.partidas[0].limiteCents).toBe(35000)
  })

  test('cambiar la plantilla no toca un mes ya cerrado', () => {
    const subido = [fijo({ id: 'ga1', kind: 'gasto', name: 'Alquiler', amount_cents: 99000 })]
    const p = plantillaDelMes('2026-06', '2026-08', subido, [], [JUNIO])
    expect(p.fijos.find(f => f.name === 'Alquiler')?.amountCents).toBe(76000)
  })

  // No inventarse el pasado es la mitad de la decisión. Enseñar la plantilla de
  // hoy en un mes que nunca se cerró es exactamente el error de antes.
  test('un mes terminado y sin cerrar no se rellena con la plantilla de hoy', () => {
    const p = plantillaDelMes('2026-07', '2026-08', FIJOS, PARTIDAS, [JUNIO])
    expect(p.origen).toBe('sin-plan')
    expect(p.fijos).toEqual([])
    expect(p.partidas).toEqual([])
  })

  // El cierre anticipado: la copia manda aunque el mes no haya terminado. Esto
  // es lo que hace que «dar septiembre por cerrado el día 28» signifique algo, y
  // se escribió al revés la primera vez —preguntando antes si el mes había
  // terminado—, con lo que la copia se guardaba y la pantalla la ignoraba.
  test('un mes en curso ya cerrado enseña su copia, no la plantilla', () => {
    const AGOSTO = plan('2026-08', [
      linea({ id: 'l1', month: '2026-08', line: 'gasto', name: 'Alquiler', amount_cents: 76000 }),
    ])
    const p = plantillaDelMes('2026-08', '2026-08', FIJOS, PARTIDAS, [AGOSTO])
    expect(p.origen).toBe('copia')
    expect(p.fijos.find(f => f.name === 'Alquiler')?.amountCents).toBe(76000)
    // Y la plantilla, que dice 80000, ya no lo toca.
    expect(p.partidas).toEqual([])
  })

  test('las líneas de la copia salen en el orden de la pantalla', () => {
    const desordenado = plan('2026-06', [
      linea({ id: 'z', month: '2026-06', line: 'gasto', name: 'Zumba', sort_order: 1 }),
      linea({ id: 'a', month: '2026-06', line: 'gasto', name: 'Agua', sort_order: 1 }),
      linea({ id: 'p', month: '2026-06', line: 'gasto', name: 'Primero', sort_order: 0 }),
    ])
    const p = plantillaDelMes('2026-06', '2026-08', [], [], [desordenado])
    expect(p.fijos.map(f => f.name)).toEqual(['Primero', 'Agua', 'Zumba'])
  })
})

test.describe('la cuenta y las partidas de un mes cerrado', () => {
  const JUNIO = plan('2026-06', [
    linea({ id: 'l1', month: '2026-06', line: 'ingreso', name: 'Nómina', amount_cents: 200000 }),
    linea({ id: 'l2', month: '2026-06', line: 'gasto', name: 'Alquiler', amount_cents: 76000 }),
    linea({ id: 'l3', month: '2026-06', line: 'partida', budget_id: 'b1', name: 'Compra', amount_cents: 35000 }),
  ])
  const junio = () => plantillaDelMes('2026-06', '2026-08', [], [], [JUNIO])

  test('la cuenta sale de la copia y dice de dónde sale', () => {
    const c = cuentaDelMes(junio(), [gasto({ id: 'g', amount_cents: 5000, date: '2026-06-10' })], '2026-06')
    expect(c.origen).toBe('copia')
    expect(c.ingresosFijos).toBe(200000)
    expect(c.gastosFijos).toBe(76000)
    expect(c.paraElMes).toBe(124000)
    expect(c.queda).toBe(119000)
  })

  test('la barra de la partida se mide contra el límite de aquel mes', () => {
    const r = resumenPartidas(junio(), [
      gasto({ id: 'g', budget_id: 'b1', amount_cents: 30000, date: '2026-06-10' }),
    ], '2026-06')
    expect(r[0].partida.limiteCents).toBe(35000)
    expect(r[0].restante).toBe(5000)
    // Con el límite de hoy (400 €) no se habría pasado ni de lejos; con el de
    // junio (350 €) va justo. Es justo lo que hay que poder ver.
    expect(r[0].pasado).toBe(false)
  })

  // Borrar una partida en abril no puede dejar a junio con un hueco donde decía
  // «Compra 350 €». La línea guarda el nombre y sobrevive sin `budget_id`.
  test('una partida borrada después sigue saliendo en el mes que ya se cerró', () => {
    const sinEnlace = plan('2026-06', [
      linea({ id: 'l3', month: '2026-06', line: 'partida', budget_id: null, name: 'Compra', amount_cents: 35000 }),
    ])
    const r = resumenPartidas(plantillaDelMes('2026-06', '2026-08', [], [], [sinEnlace]), [], '2026-06')
    expect(r[0].partida.name).toBe('Compra')
    expect(r[0].partida.budgetId).toBeNull()
    // Sus gastos perdieron el `budget_id` con ella, así que ya no cuentan aquí:
    // están en «sin partida», que es donde de verdad están.
    expect(r[0].gastado).toBe(0)
  })

  // Sin plan no se puede decir qué quedó, y decir cero sería mentir distinto.
  test('un mes sin plan no da cuenta, solo lo apuntado', () => {
    const c = cuentaDelMes(
      plantillaDelMes('2026-07', '2026-08', [], [], []),
      [gasto({ id: 'g', amount_cents: 4200, date: '2026-07-10' })],
      '2026-07',
    )
    expect(c.origen).toBe('sin-plan')
    expect(c.hayFijos).toBe(false)
    expect(c.gastosApuntados).toBe(4200)
  })
})

test.describe('la serie de meses del resumen', () => {
  const FIJOS = [
    fijo({ id: 'in1', kind: 'ingreso', name: 'Nómina', amount_cents: 200000 }),
    fijo({ id: 'ga1', kind: 'gasto', name: 'Alquiler', amount_cents: 80000 }),
  ]
  const JUNIO = plan('2026-06', [
    linea({ id: 'j1', month: '2026-06', line: 'ingreso', name: 'Nómina', amount_cents: 150000 }),
    linea({ id: 'j2', month: '2026-06', line: 'gasto', name: 'Alquiler', amount_cents: 76000 }),
  ])

  test('va del más viejo al más nuevo, que es como se leen las barras', () => {
    const r = serieDeMeses('2026-08', 3, '2026-08', FIJOS, [], [JUNIO, plan('2026-07', [])], [])
    expect(r.map(m => m.mes)).toEqual(['2026-06', '2026-07', '2026-08'])
  })

  // Cada mes con **sus** fijos: junio se cerró con 150.000 de nómina y agosto,
  // que está en curso, tira de la plantilla, que dice 200.000.
  test('cada mes cuenta con los fijos que tenía entonces', () => {
    const r = serieDeMeses('2026-08', 3, '2026-08', FIJOS, [], [JUNIO, plan('2026-07', [])], [])
    expect(r[0]).toMatchObject({ mes: '2026-06', entra: 150000, sale: 76000, queda: 74000 })
    expect(r[2]).toMatchObject({ mes: '2026-08', entra: 200000, sale: 80000, queda: 120000 })
  })

  test('lo apuntado a mano suma a los fijos de su mes', () => {
    const r = serieDeMeses('2026-08', 1, '2026-08', FIJOS, [], [], [
      gasto({ id: 'g', amount_cents: 5000, date: '2026-08-10' }),
      ingreso({ id: 'i', amount_cents: 3000, date: '2026-08-11' }),
      gasto({ id: 'otro-mes', amount_cents: 99900, date: '2026-07-01' }),
    ])
    expect(r[0]).toMatchObject({ entra: 203000, sale: 85000 })
  })

  // Una barra a cero diría «ese mes no gastasteis nada», que es distinto de «de
  // ese mes no sabemos». El hueco es lo honesto.
  test('un mes sin plan se cae de la serie en vez de salir a cero', () => {
    const r = serieDeMeses('2026-08', 3, '2026-08', FIJOS, [], [JUNIO], [])
    expect(r.map(m => m.mes)).toEqual(['2026-06', '2026-08'])
  })

  test('sin nada que enseñar, la serie viene vacía', () => {
    expect(serieDeMeses('2026-08', 3, '2026-09', [], [], [], [])).toEqual([])
  })

  // La pantalla nunca pide un tramo que llegue al futuro, pero la función es
  // pura y se le puede pedir: una previsión de la plantilla al lado de meses que
  // ya pasaron no es una tendencia, es dos cosas distintas en el mismo dibujo.
  test('un mes que aún no ha llegado tampoco entra en la serie', () => {
    const r = serieDeMeses('2026-10', 3, '2026-08', FIJOS, [], [], [])
    expect(r.map(m => m.mes)).toEqual(['2026-08'])
  })

  test('la media de lo que queda sale de los meses que hay', () => {
    const r = serieDeMeses('2026-08', 3, '2026-08', FIJOS, [], [JUNIO, plan('2026-07', [])], [])
    // Junio 74.000, julio 0 (se cerró sin líneas) y agosto 120.000.
    expect(mediaQueQueda(r)).toBe(64667)
  })

  test('sin meses no hay media', () => {
    expect(mediaQueQueda([])).toBe(0)
  })
})

test.describe('el reparto por partida de «en qué se va»', () => {
  const PARTIDAS = [
    budget({ id: 'b1', name: 'Compra', monthly_limit_cents: 40000 }),
    budget({ id: 'b2', name: 'Coche', sort_order: 1, monthly_limit_cents: 15000 }),
  ]
  const agosto = () => plantillaDelMes('2026-08', '2026-08', [], PARTIDAS, [])

  test('ordena de más a menos y calcula el porcentaje sobre el gasto del mes', () => {
    const r = repartoPorPartida(agosto(), [
      gasto({ id: 'g1', budget_id: 'b1', amount_cents: 6000 }),
      gasto({ id: 'g2', budget_id: 'b2', amount_cents: 2000 }),
      gasto({ id: 'g3', budget_id: 'b1', amount_cents: 2000 }),
    ], '2026-08')
    expect(r.map(t => [t.nombre, t.total, t.porcentaje])).toEqual([
      ['Compra', 8000, 80],
      ['Coche', 2000, 20],
    ])
  })

  // La mitad de lo que gasta una casa no cae en ninguna partida. Esconderlo
  // dejaría un desglose que no suma el mes.
  test('lo que no cuelga de ninguna partida entra como «Sin partida»', () => {
    const r = repartoPorPartida(agosto(), [
      gasto({ id: 'g1', budget_id: 'b1', amount_cents: 5000 }),
      gasto({ id: 'g2', budget_id: null, amount_cents: 5000 }),
    ], '2026-08')
    expect(r.map(t => t.nombre)).toEqual(['Compra', 'Sin partida'])
    expect(r.reduce((t, x) => t + x.total, 0)).toBe(10000)
  })

  test('una partida sin gasto no pinta porción', () => {
    const r = repartoPorPartida(agosto(), [gasto({ id: 'g', budget_id: 'b1', amount_cents: 100 })], '2026-08')
    expect(r.map(t => t.nombre)).toEqual(['Compra'])
  })

  test('un ingreso no se va a ninguna parte, así que no cuenta', () => {
    const r = repartoPorPartida(agosto(), [
      gasto({ id: 'g', budget_id: 'b1', amount_cents: 1000 }),
      ingreso({ id: 'i', amount_cents: 9000 }),
    ], '2026-08')
    expect(r).toHaveLength(1)
    expect(r[0].porcentaje).toBe(100)
  })

  // Doce filas dejan de ser un gráfico y son una lista, y las últimas serían
  // rayas de dos píxeles que no dicen nada.
  test('se corta en el máximo y el resto se junta en «Otras»', () => {
    const muchas = [1, 2, 3, 4, 5, 6, 7].map(n =>
      budget({ id: `b${n}`, name: `P${n}`, sort_order: n }))
    const gastos = [1, 2, 3, 4, 5, 6, 7].map(n =>
      gasto({ id: `g${n}`, budget_id: `b${n}`, amount_cents: (8 - n) * 1000 }))
    const r = repartoPorPartida(plantillaDelMes('2026-08', '2026-08', [], muchas, []), gastos, '2026-08', 5)
    expect(r).toHaveLength(6)
    expect(r[5].nombre).toBe('Otras')
    // 2.000 + 1.000 de las dos que se quedaron fuera.
    expect(r[5].total).toBe(3000)
  })

  // Si solo sobra una, se la llama por su nombre: «Otras» para una sola cosa es
  // esconder un dato que cabía.
  test('si solo sobra una, conserva su nombre', () => {
    const seis = [1, 2, 3, 4, 5, 6].map(n => budget({ id: `b${n}`, name: `P${n}`, sort_order: n }))
    const gastos = [1, 2, 3, 4, 5, 6].map(n =>
      gasto({ id: `g${n}`, budget_id: `b${n}`, amount_cents: (7 - n) * 1000 }))
    const r = repartoPorPartida(plantillaDelMes('2026-08', '2026-08', [], seis, []), gastos, '2026-08', 5)
    expect(r[5].nombre).toBe('P6')
  })

  test('sin gastos no hay reparto', () => {
    expect(repartoPorPartida(agosto(), [], '2026-08')).toEqual([])
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
