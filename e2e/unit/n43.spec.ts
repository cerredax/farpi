import { test, expect } from '@playwright/test'
import { huellaDeMovimiento, leerN43, ordenEnSuDia, type MovimientoN43 } from '@/lib/n43'
import { cabecera, concepto, final, finFichero, movimiento } from '../n43-fixture'

// El fichero de la Norma 43 es texto con los campos en posiciones fijas, y esa
// es exactamente la clase de código que no falla con un error: falla leyendo una
// posición más allá y devolviendo un importe creíble y equivocado. Por eso las
// líneas de aquí se construyen campo a campo, con las longitudes de la norma
// (AEB, cuaderno 43, junio de 2012), y no copiando un fichero de un banco: si
// alguien mueve un `slice`, aquí se cae algo.

// Los constructores de líneas viven en `e2e/n43-fixture.ts`: los comparte el
// test de navegador, que sube un fichero a la pantalla de importar.

/** Un extracto que cuadra: saldo inicial 1.500 €, una compra y una nómina. */
function extractoNormal() {
  return [
    cabecera({ saldo: 150000 }),
    movimiento({ fecha: '260903', comun: '12', signo: '1', importe: 4235 }),
    concepto('COMPRA EN SUPERMERCADO'),
    movimiento({ fecha: '260925', comun: '15', signo: '2', importe: 210000 }),
    concepto('NOMINA SEPTIEMBRE'),
    final({ apuntesDebe: 1, totalDebe: 4235, apuntesHaber: 1, totalHaber: 210000, saldo: 150000 - 4235 + 210000 }),
    finFichero,
  ].join('\n')
}

function leerBien(contenido: string) {
  const lectura = leerN43(contenido)
  if (!lectura.ok) throw new Error(`no debería fallar: ${lectura.error}`)
  return lectura.extracto
}

test.describe('leerN43', () => {
  test('lee la cuenta, el período y el saldo de la cabecera', () => {
    const { cuentas } = leerBien(extractoNormal())

    expect(cuentas).toHaveLength(1)
    expect(cuentas[0].cuenta).toBe('018200010012345678')
    expect(cuentas[0].entidad).toBe('0182')
    expect(cuentas[0].titular).toBe('GARCIA FAMILIA')
    expect(cuentas[0].desde).toBe('2026-09-01')
    expect(cuentas[0].hasta).toBe('2026-09-30')
    expect(cuentas[0].saldoInicialCents).toBe(150000)
  })

  // Los importes de la norma vienen con dos decimales que no se escriben, que es
  // justo lo que aquí se guarda: céntimos enteros, como `expenses`.
  test('el importe son céntimos y el signo va en kind, no en el número', () => {
    const { cuentas } = leerBien(extractoNormal())
    const [compra, nomina] = cuentas[0].movimientos

    expect(compra.amountCents).toBe(4235)
    expect(compra.kind).toBe('gasto')
    expect(nomina.amountCents).toBe(210000)
    expect(nomina.kind).toBe('ingreso')
  })

  test('la fecha no se mueve de día al convertirla', () => {
    const { cuentas } = leerBien(extractoNormal())

    expect(cuentas[0].movimientos[0].fecha).toBe('2026-09-03')
    expect(cuentas[0].movimientos[0].fechaValor).toBe('2026-09-03')
  })

  test('el concepto sale de los registros complementarios cuando vienen', () => {
    const { cuentas } = leerBien(extractoNormal())

    expect(cuentas[0].movimientos[0].concepto).toBe('COMPRA EN SUPERMERCADO')
    expect(cuentas[0].movimientos[1].concepto).toBe('NOMINA SEPTIEMBRE')
  })

  // Hay bancos que no mandan los complementarios, que son opcionales. Sin ellos
  // la fila diría solo una fecha y un importe, así que se cae al nombre del
  // concepto común del anexo 2.
  test('sin complementarios, el concepto es el nombre del concepto común', () => {
    const contenido = [
      cabecera(),
      movimiento({ comun: '03', signo: '1', importe: 3412 }),
      final({ apuntesDebe: 1, totalDebe: 3412, saldo: 150000 - 3412 }),
    ].join('\n')

    expect(leerBien(contenido).cuentas[0].movimientos[0].concepto).toBe('Recibo domiciliado')
    expect(leerBien(contenido).cuentas[0].movimientos[0].conceptoComun).toBe('03')
  })

  test('un concepto partido en los dos trozos de 38 se junta entero', () => {
    const largo = 'PAGO CON TARJETA EN UN COMERCIO CON UN NOMBRE MUY LARGO DE VERDAD'
    const contenido = [
      cabecera(),
      movimiento({ importe: 1000 }),
      concepto(largo),
      final({ apuntesDebe: 1, totalDebe: 1000, saldo: 149000 }),
    ].join('\n')

    expect(leerBien(contenido).cuentas[0].movimientos[0].concepto).toBe(largo)
  })

  test('una cuenta en números rojos trae el saldo en negativo', () => {
    const contenido = [
      cabecera({ signoSaldo: '1', saldo: 5000 }),
      final({ signoSaldo: '1', saldo: 5000 }),
    ].join('\n')

    expect(leerBien(contenido).cuentas[0].saldoInicialCents).toBe(-5000)
    expect(leerBien(contenido).cuentas[0].saldoFinalCents).toBe(-5000)
  })

  test('varias cuentas en el mismo fichero salen separadas', () => {
    const otra = '012800010098765432'
    const contenido = [
      cabecera(),
      movimiento({ importe: 1000 }),
      final({ apuntesDebe: 1, totalDebe: 1000, saldo: 149000 }),
      cabecera({ cuenta: otra, saldo: 30000 }),
      movimiento({ signo: '2', importe: 2000 }),
      final({ cuenta: otra, apuntesHaber: 1, totalHaber: 2000, saldo: 32000 }),
    ].join('\n')

    const { cuentas } = leerBien(contenido)
    expect(cuentas.map(c => c.cuenta)).toEqual(['018200010012345678', otra])
    expect(cuentas[1].movimientos[0].kind).toBe('ingreso')
  })

  // Hay bancos que no rellenan con espacios hasta la posición 80. El fichero es
  // válido igual y rechazarlo dejaría fuera a media España.
  test('las líneas cortas se leen igual', () => {
    const contenido = [
      cabecera().trimEnd(),
      movimiento({ importe: 1000 }).trimEnd(),
      final({ apuntesDebe: 1, totalDebe: 1000, saldo: 149000 }).trimEnd(),
    ].join('\r\n')

    expect(leerBien(contenido).cuentas[0].movimientos[0].amountCents).toBe(1000)
  })
})

test.describe('el cuadre con lo que dice el propio fichero', () => {
  test('un extracto que cuadra no deja ningún aviso', () => {
    expect(leerBien(extractoNormal()).avisos).toEqual([])
  })

  // Esta es la comprobación por la que existe `cuadrar`: si un campo se leyera
  // desplazado, los importes seguirían pareciendo buenos y solo el recuento del
  // banco lo delataría.
  test('avisa si el banco dice más movimientos de los que se han leído', () => {
    const contenido = [
      cabecera(),
      movimiento({ importe: 1000 }),
      final({ apuntesDebe: 2, totalDebe: 2000, saldo: 148000 }),
    ].join('\n')

    const avisos = leerBien(contenido).avisos
    expect(avisos.some(a => a.includes('dice que hay 2 movimientos y se han leído 1'))).toBe(true)
  })

  test('avisa si las sumas no coinciden con las del banco', () => {
    const contenido = [
      cabecera(),
      movimiento({ importe: 1000 }),
      final({ apuntesDebe: 1, totalDebe: 9999, saldo: 149000 }),
    ].join('\n')

    expect(leerBien(contenido).avisos.some(a => a.includes('las sumas no coinciden'))).toBe(true)
  })

  test('avisa si el saldo final no sale de sumar los movimientos al inicial', () => {
    const contenido = [
      cabecera({ saldo: 150000 }),
      movimiento({ importe: 1000 }),
      final({ apuntesDebe: 1, totalDebe: 1000, saldo: 999999 }),
    ].join('\n')

    expect(leerBien(contenido).avisos.some(a => a.includes('el saldo final no sale'))).toBe(true)
  })

  // Un fichero cortado no es un error —sus movimientos valen— pero no se ha
  // podido comprobar, y eso hay que decirlo antes de apuntar nada.
  test('una cuenta sin registro final entra con su aviso', () => {
    const contenido = [cabecera(), movimiento({ importe: 1000 })].join('\n')
    const { cuentas, avisos } = leerBien(contenido)

    expect(cuentas[0].movimientos).toHaveLength(1)
    expect(cuentas[0].saldoFinalCents).toBeNull()
    expect(avisos.some(a => a.includes('se corta sin su saldo final'))).toBe(true)
  })

  test('una divisa que no es el euro se avisa', () => {
    const contenido = [cabecera({ divisa: '840' }), final()].join('\n')
    expect(leerBien(contenido).avisos.some(a => a.includes('no va en euros'))).toBe(true)
  })
})

test.describe('lo que no es un fichero de la Norma 43', () => {
  test('un archivo vacío', () => {
    expect(leerN43('   \n\n')).toEqual({ ok: false, error: 'El archivo está vacío' })
  })

  test('un archivo con líneas más largas de 80', () => {
    const lectura = leerN43(`${cabecera()}DEMASIADO`)
    expect(lectura.ok).toBe(false)
    if (!lectura.ok) expect(lectura.error).toContain('no parece un fichero de la Norma 43')
  })

  test('un tipo de registro que no existe', () => {
    const lectura = leerN43([cabecera(), '99' + ' '.repeat(78)].join('\n'))
    expect(lectura.ok).toBe(false)
    if (!lectura.ok) expect(lectura.error).toContain('empieza por "99"')
  })

  test('un movimiento que no cuelga de ninguna cuenta', () => {
    const lectura = leerN43(movimiento())
    expect(lectura.ok).toBe(false)
    if (!lectura.ok) expect(lectura.error).toContain('no cuelga de ninguna cuenta')
  })

  test('un fichero sin ninguna cuenta', () => {
    expect(leerN43(finFichero)).toEqual({ ok: false, error: 'El archivo no trae ninguna cuenta' })
  })
})

test.describe('huellaDeMovimiento', () => {
  const base: MovimientoN43 = {
    fecha: '2026-09-03', fechaValor: '2026-09-03', amountCents: 150,
    kind: 'gasto', concepto: 'CAFE', conceptoComun: '12', referencia: '',
  }

  // El caso por el que la huella no puede ser solo fecha e importe: dos cafés
  // iguales el mismo día son dos apuntes, no uno repetido.
  test('dos movimientos idénticos del mismo día no son el mismo', () => {
    expect(huellaDeMovimiento('c1', base, 1)).not.toBe(huellaDeMovimiento('c1', base, 2))
  })

  test('el mismo movimiento leído dos veces da la misma huella', () => {
    expect(huellaDeMovimiento('c1', base, 1)).toBe(huellaDeMovimiento('c1', { ...base }, 1))
  })

  // Con referencia de verdad la huella deja de depender del orden, que es lo que
  // permite descargar rangos solapados sin duplicar.
  test('con referencia, la huella no depende de la posición en el fichero', () => {
    const conRef = { ...base, referencia: '1234567890 000123456789' }
    expect(huellaDeMovimiento('c1', conRef, 1)).toBe(huellaDeMovimiento('c1', conRef, 7))
  })

  // Un documento a ceros y una referencia a ceros son «sin referencia»: hay
  // bancos que rellenan esos campos en vez de dejarlos en blanco.
  test('una referencia de solo ceros no cuenta como referencia', () => {
    const ceros = { ...base, referencia: '0000000000 000000000000' }
    expect(huellaDeMovimiento('c1', ceros, 1)).not.toBe(huellaDeMovimiento('c1', ceros, 2))
  })

  test('la misma fila en dos cuentas distintas son dos movimientos', () => {
    expect(huellaDeMovimiento('c1', base, 1)).not.toBe(huellaDeMovimiento('c2', base, 1))
  })
})

test.describe('ordenEnSuDia', () => {
  test('numera desde uno dentro de cada día', () => {
    const del = (fecha: string) => ({ fecha } as MovimientoN43)
    expect(ordenEnSuDia([del('2026-09-03'), del('2026-09-03'), del('2026-09-04'), del('2026-09-03')]))
      .toEqual([1, 2, 1, 3])
  })
})

// Farpi promete —en `docs/architecture.md` y en `/privacidad`— que no guarda
// números de cuenta, y la huella es lo único de un extracto que acaba en la base
// (`expenses.import_ref`). Así que esto no es una preferencia de formato: es la
// comprobación de que esa promesa sigue siendo verdad.
test('la huella no se lleva el número de cuenta a la base', () => {
  const cuenta = '018200010012345678'
  const mov: MovimientoN43 = {
    fecha: '2026-09-03', fechaValor: '2026-09-03', amountCents: 150,
    kind: 'gasto', concepto: 'CAFE', conceptoComun: '12', referencia: '',
  }

  const huella = huellaDeMovimiento(cuenta, mov, 1)

  expect(huella).not.toContain(cuenta)
  expect(huella).toContain('5678')
  // Ni la entidad, ni la oficina, ni el número entero: solo los cuatro últimos.
  expect(huella).not.toContain('0182')
  expect(huella).not.toContain('001234')
})
