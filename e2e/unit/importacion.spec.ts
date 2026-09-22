import { test, expect } from '@playwright/test'
import { comoSeApunta, loQueEntra, resumenDeRevision, revisarExtracto, type ContextoDeRevision } from '@/lib/importacion'
import type { FijoDelMes } from '@/lib/budgets'
import type { CuentaN43, ExtractoN43, MovimientoN43 } from '@/lib/n43'
import type { Budget, Expense } from '@/types'

// Qué del extracto es un apunte de la casa y qué ya está contado en otro sitio.
// Es la regla que sostiene la cuenta del mes —`(ingresos fijos − gastos fijos) +
// ingresos apuntados − gastos apuntados`—, así que cada caso de aquí es una forma
// distinta de contar dos veces el mismo dinero.

function movimiento(over: Partial<MovimientoN43> = {}): MovimientoN43 {
  return {
    fecha: '2026-09-03',
    fechaValor: '2026-09-03',
    amountCents: 4235,
    kind: 'gasto',
    concepto: 'COMPRA EN SUPERMERCADO',
    conceptoComun: '12',
    referencia: '',
    ...over,
  }
}

function cuenta(movimientos: MovimientoN43[], over: Partial<CuentaN43> = {}): CuentaN43 {
  return {
    cuenta: '018200010012345678',
    entidad: '0182',
    titular: 'GARCIA FAMILIA',
    desde: '2026-09-01',
    hasta: '2026-09-30',
    saldoInicialCents: 150000,
    saldoFinalCents: 150000,
    movimientos,
    ...over,
  }
}

function extracto(...cuentas: CuentaN43[]): ExtractoN43 {
  return { cuentas, avisos: [] }
}

function fijo(over: Partial<FijoDelMes> = {}): FijoDelMes {
  return {
    key: 'f1',
    fixedId: 'f1',
    kind: 'gasto',
    name: 'Luz',
    emoji: '💡',
    amountCents: 12000,
    referenciaCents: null,
    childId: null,
    memberId: null,
    sortOrder: 0,
    ...over,
  }
}

function apunte(over: Partial<Expense> = {}): Expense {
  return {
    id: 'g1',
    family_id: 'f1',
    budget_id: null,
    child_id: null,
    member_id: null,
    kind: 'gasto',
    amount_cents: 4235,
    date: '2026-09-03',
    description: null,
    import_ref: null,
    created_by: 'u1',
    created_at: '2026-09-03T10:00:00',
    updated_at: '2026-09-03T10:00:00',
    ...over,
  }
}

function partida(over: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    family_id: 'f1',
    name: 'Farmacia',
    emoji: '💊',
    monthly_limit_cents: 5000,
    sort_order: 0,
    created_by: 'u1',
    created_at: '2026-09-01T10:00:00',
    updated_at: '2026-09-01T10:00:00',
    ...over,
  }
}

const SIN_NADA: ContextoDeRevision = { apuntes: [], fijos: [], partidas: [] }

function revisar(ext: ExtractoN43, contexto: Partial<ContextoDeRevision> = {}) {
  return revisarExtracto(ext, { ...SIN_NADA, ...contexto })
}

test.describe('lo que entra marcado', () => {
  test('una compra normal entra, sin motivo que explicar', () => {
    const [fila] = revisar(extracto(cuenta([movimiento()])))

    expect(fila.marcada).toBe(true)
    expect(fila.motivo).toBeNull()
    expect(fila.explicacion).toBeNull()
    expect(fila.movimiento.amountCents).toBe(4235)
    expect(fila.cuenta).toBe('018200010012345678')
  })

  test('el concepto del banco llega escrito como una frase', () => {
    const [fila] = revisar(extracto(cuenta([movimiento()])))
    expect(fila.descripcion).toBe('Compra en supermercado')
  })
})

test.describe('cubierto por un fijo', () => {
  test('un recibo domiciliado que encaja con un fijo no entra, y dice cuál', () => {
    const [fila] = revisar(
      extracto(cuenta([movimiento({ conceptoComun: '03', amountCents: 12000 })])),
      { fijos: [fijo({ name: 'Luz', amountCents: 12000 })] },
    )

    expect(fila.marcada).toBe(false)
    expect(fila.motivo).toBe('cubierto-por-fijo')
    expect(fila.explicacion).toBe('Esto suele estar en «Luz» (120,00 €)')
  })

  // El margen existe porque los fijos que se domicilian son justo los que bailan:
  // la luz de 120 € que un mes son 128.
  test('el fijo admite un 10 % de diferencia', () => {
    const conFijo = { fijos: [fijo({ amountCents: 12000 })] }
    const cerca = revisar(extracto(cuenta([movimiento({ conceptoComun: '03', amountCents: 12800 })])), conFijo)
    const lejos = revisar(extracto(cuenta([movimiento({ conceptoComun: '03', amountCents: 14000 })])), conFijo)

    expect(cerca[0].motivo).toBe('cubierto-por-fijo')
    expect(lejos[0].marcada).toBe(true)
  })

  test('en un fijo pequeño el margen son cinco euros y no un 10 % ridículo', () => {
    const conFijo = { fijos: [fijo({ name: 'Cuota del gimnasio', amountCents: 3000 })] }
    const dentro = revisar(extracto(cuenta([movimiento({ conceptoComun: '03', amountCents: 3400 })])), conFijo)
    const fuera = revisar(extracto(cuenta([movimiento({ conceptoComun: '03', amountCents: 3600 })])), conFijo)

    expect(dentro[0].motivo).toBe('cubierto-por-fijo')
    expect(fuera[0].marcada).toBe(true)
  })

  // Esta es la razón de la lista de conceptos domiciliables: sin ella, una compra
  // de 120 € en el súper se confundiría con la limpieza de 120 €.
  test('una compra con tarjeta del mismo importe que un fijo sí entra', () => {
    const [fila] = revisar(
      extracto(cuenta([movimiento({ conceptoComun: '12', amountCents: 12000 })])),
      { fijos: [fijo({ amountCents: 12000 })] },
    )

    expect(fila.marcada).toBe(true)
  })

  test('un recibo domiciliado sin fijo que lo explique entra como cualquier gasto', () => {
    const [fila] = revisar(extracto(cuenta([movimiento({ conceptoComun: '03', amountCents: 8000 })])), { fijos: [fijo()] })
    expect(fila.marcada).toBe(true)
  })

  test('la nómina se empareja con el fijo de ingreso, no con uno de gasto', () => {
    const nomina = movimiento({ conceptoComun: '15', kind: 'ingreso', amountCents: 210000, concepto: 'NOMINA' })
    const soloGastos = revisar(extracto(cuenta([nomina])), { fijos: [fijo({ kind: 'gasto', amountCents: 210000 })] })
    const conIngreso = revisar(extracto(cuenta([nomina])), { fijos: [fijo({ kind: 'ingreso', name: 'Nómina', amountCents: 210000 })] })

    expect(soloGastos[0].marcada).toBe(true)
    expect(conIngreso[0].motivo).toBe('cubierto-por-fijo')
  })
})

test.describe('ya apuntado', () => {
  test('lo que vino en una importación anterior no vuelve a entrar', () => {
    const primera = revisar(extracto(cuenta([movimiento()])))
    const segunda = revisar(extracto(cuenta([movimiento()])), { huellasApuntadas: new Set([primera[0].huella]) })

    expect(segunda[0].marcada).toBe(false)
    expect(segunda[0].motivo).toBe('ya-apuntado')
    expect(segunda[0].explicacion).toBe('Ya se apuntó en una importación anterior')
  })

  // El caso de la casa que teclea la compra al salir del súper y luego importa
  // el mes: el mismo gasto, uno a mano y otro del banco.
  test('lo que ya se tecleó a mano ese día por ese importe no entra', () => {
    const [fila] = revisar(extracto(cuenta([movimiento()])), { apuntes: [apunte({ description: 'La compra' })] })

    expect(fila.motivo).toBe('ya-apuntado')
    expect(fila.explicacion).toBe('Ya hay un apunte de ese día por 42,35 €: «La compra»')
  })

  test('un apunte del mismo importe en otro día no tapa nada', () => {
    const [fila] = revisar(extracto(cuenta([movimiento()])), { apuntes: [apunte({ date: '2026-09-04' })] })
    expect(fila.marcada).toBe(true)
  })

  test('un ingreso no se confunde con un gasto del mismo importe', () => {
    const [fila] = revisar(
      extracto(cuenta([movimiento({ kind: 'ingreso' })])),
      { apuntes: [apunte({ kind: 'gasto' })] },
    )
    expect(fila.marcada).toBe(true)
  })

  // Manda lo más seguro: si ya está apuntado, da igual que además parezca un fijo.
  test('estar ya apuntado gana a parecer un fijo', () => {
    const [fila] = revisar(
      extracto(cuenta([movimiento({ conceptoComun: '03', amountCents: 12000 })])),
      { apuntes: [apunte({ amount_cents: 12000 })], fijos: [fijo({ amountCents: 12000 })] },
    )
    expect(fila.motivo).toBe('ya-apuntado')
  })
})

test.describe('traspasos entre cuentas propias', () => {
  const otra = '012800010098765432'

  test('el cargo y el abono espejo no entran ninguno de los dos', () => {
    const filas = revisar(extracto(
      cuenta([movimiento({ conceptoComun: '04', amountCents: 20000, kind: 'gasto' })]),
      cuenta([movimiento({ conceptoComun: '04', amountCents: 20000, kind: 'ingreso', fecha: '2026-09-04' })], { cuenta: otra }),
    ))

    expect(filas.map(f => f.motivo)).toEqual(['traspaso', 'traspaso'])
    expect(filas[0].explicacion).toBe('Parece dinero movido entre dos cuentas tuyas, no un gasto')
  })

  // Mandar dinero a una cuenta que no sale en el fichero es indistinguible de
  // pagar a alguien, y aquí no se adivina.
  test('con una sola cuenta en el fichero no se detecta ningún traspaso', () => {
    const filas = revisar(extracto(cuenta([
      movimiento({ conceptoComun: '04', amountCents: 20000, kind: 'gasto' }),
      movimiento({ conceptoComun: '04', amountCents: 20000, kind: 'ingreso' }),
    ])))

    expect(filas.every(f => f.marcada)).toBe(true)
  })

  test('si el abono tarda más de tres días ya no es su espejo', () => {
    const filas = revisar(extracto(
      cuenta([movimiento({ amountCents: 20000, kind: 'gasto', fecha: '2026-09-03' })]),
      cuenta([movimiento({ amountCents: 20000, kind: 'ingreso', fecha: '2026-09-10' })], { cuenta: otra }),
    ))

    expect(filas.every(f => f.marcada)).toBe(true)
  })

  // Sin emparejar de uno en uno, tres idas y dos vueltas darían cinco traspasos.
  test('se emparejan de uno en uno: tres idas y dos vueltas dejan un gasto vivo', () => {
    const salida = () => movimiento({ amountCents: 20000, kind: 'gasto' })
    const entrada = () => movimiento({ amountCents: 20000, kind: 'ingreso' })
    const filas = revisar(extracto(
      cuenta([salida(), salida(), salida()]),
      cuenta([entrada(), entrada()], { cuenta: otra }),
    ))

    expect(filas.filter(f => f.motivo === 'traspaso')).toHaveLength(4)
    expect(filas.filter(f => f.marcada)).toHaveLength(1)
  })
})

test.describe('la partida que se propone', () => {
  test('la propone cuando el concepto la nombra', () => {
    const [fila] = revisar(
      extracto(cuenta([movimiento({ concepto: 'PAGO EN FARMACIA CENTRAL' })])),
      { partidas: [partida({ id: 'b-farmacia', name: 'Farmacia' })] },
    )
    expect(fila.budgetId).toBe('b-farmacia')
  })

  test('sin tildes ni mayúsculas de por medio', () => {
    const [fila] = revisar(
      extracto(cuenta([movimiento({ concepto: 'RECIBO GUARDERIA' })])),
      { partidas: [partida({ id: 'b-guarde', name: 'Guardería' })] },
    )
    expect(fila.budgetId).toBe('b-guarde')
  })

  test('gana la que dice más', () => {
    const [fila] = revisar(
      extracto(cuenta([movimiento({ concepto: 'COMIDA DEL COLE SEPTIEMBRE' })])),
      { partidas: [partida({ id: 'b-corta', name: 'Comida' }), partida({ id: 'b-larga', name: 'Comida del cole' })] },
    )
    expect(fila.budgetId).toBe('b-larga')
  })

  // La base lo rechaza, no solo el formulario: `expenses_ingreso_sin_tope`.
  test('un ingreso nunca lleva partida, aunque el concepto la nombre', () => {
    const [fila] = revisar(
      extracto(cuenta([movimiento({ kind: 'ingreso', concepto: 'DEVOLUCION FARMACIA' })])),
      { partidas: [partida({ name: 'Farmacia' })] },
    )
    expect(fila.budgetId).toBeNull()
  })

  test('sin ninguna que suene, se deja para elegir en la fila', () => {
    const [fila] = revisar(extracto(cuenta([movimiento()])), { partidas: [partida({ name: 'Farmacia' })] })
    expect(fila.budgetId).toBeNull()
  })
})

test.describe('comoSeApunta', () => {
  test('lo que grita el banco se lee como una frase', () => {
    expect(comoSeApunta('RECIBO IBERDROLA CLIENTES SAU')).toBe('Recibo iberdrola clientes sau')
  })

  test('los espacios de relleno de la norma no llegan al apunte', () => {
    expect(comoSeApunta('  COMPRA    TARJETA   ')).toBe('Compra tarjeta')
  })

  // Un texto mezclado lo escribió una persona, no la máquina de mayúsculas.
  test('un texto que ya viene escrito se respeta', () => {
    expect(comoSeApunta('Bizum de Marta')).toBe('Bizum de Marta')
  })

  test('lo larguísimo se corta por una palabra', () => {
    const largo = comoSeApunta('PAGO CON TARJETA EN UN COMERCIO QUE TIENE UN NOMBRE INTERMINABLE DE VERDAD DE LA BUENA')
    expect(largo.length).toBeLessThanOrEqual(61)
    expect(largo.endsWith('…')).toBe(true)
    expect(largo).not.toContain('  ')
  })

  test('un concepto vacío no inventa nada', () => {
    expect(comoSeApunta('   ')).toBe('')
  })
})

test.describe('el recuento de antes de confirmar', () => {
  test('cuenta lo que entra y por qué no entra el resto', () => {
    const filas = revisar(
      extracto(
        cuenta([
          movimiento(),
          movimiento({ conceptoComun: '03', amountCents: 12000 }),
          movimiento({ amountCents: 20000, kind: 'gasto', fecha: '2026-09-05' }),
        ]),
        cuenta([movimiento({ amountCents: 20000, kind: 'ingreso', fecha: '2026-09-05' })], { cuenta: '012800010098765432' }),
      ),
      { fijos: [fijo({ amountCents: 12000 })] },
    )

    expect(resumenDeRevision(filas)).toEqual({
      total: 4,
      entran: 1,
      yaApuntados: 0,
      cubiertosPorFijo: 1,
      traspasos: 2,
    })
    expect(loQueEntra(filas)).toHaveLength(1)
  })
})

test.describe('dos movimientos iguales el mismo día', () => {
  // Dos ingresos de 40 € el mismo día son dos ingresos: dos devoluciones, dos
  // bizums. Si el extracto los trae, entran los dos.
  test('si no hay nada apuntado, entran los dos', () => {
    const bizum = () => movimiento({ kind: 'ingreso', amountCents: 4000, concepto: 'BIZUM' })
    const filas = revisar(extracto(cuenta([bizum(), bizum()])))

    expect(filas.filter(f => f.marcada)).toHaveLength(2)
  })

  // Y si ya había **uno** apuntado a mano, se tapa uno y entra el otro. Sin
  // emparejar de uno en uno se taparían los dos con el mismo apunte, y ese
  // ingreso se perdería sin que nadie lo notara.
  test('con uno ya apuntado, se tapa uno y entra el otro', () => {
    const bizum = () => movimiento({ kind: 'ingreso', amountCents: 4000, concepto: 'BIZUM' })
    const filas = revisar(extracto(cuenta([bizum(), bizum()])), {
      apuntes: [apunte({ kind: 'ingreso', amount_cents: 4000 })],
    })

    expect(filas.filter(f => f.motivo === 'ya-apuntado')).toHaveLength(1)
    expect(filas.filter(f => f.marcada)).toHaveLength(1)
  })
})
