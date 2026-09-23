import { test, expect } from '@playwright/test'
import { leerArchivoDeExtracto, leerBbva, leerExtracto, leerSabadell } from '@/lib/extractos'
import { huellaDeMovimiento, ordenEnSuDia } from '@/lib/n43'
import { leerXlsx } from '@/lib/xlsx'
import { cabecera, final, finFichero, movimiento } from '../n43-fixture'
import { cabeceraBbva, filaBbva, xlsx, zip, type Celda } from '../xlsx-fixture'

// Los extractos que no son la Norma 43. Los datos son inventados, pero la forma
// es la de los archivos que dan los bancos: el `.txt` del Sabadell línea a línea
// y el Excel del BBVA celda a celda, con su título y su columna vacía delante.

// ─── Sabadell ────────────────────────────────────────────────────────────────

// Siete campos con `|`, lo más reciente arriba y el saldo que dejó cada movimiento.

/** Una línea del fichero. El saldo es el que queda **después** del movimiento. */
function linea(fecha: string, concepto: string, importe: string, saldo: string, ref1 = '', ref2 = '') {
  return [fecha, concepto, fecha, importe, saldo, ref1, ref2].join('|')
}

/** Saldo inicial 1.000 €. Del más reciente al más antiguo, como lo da el banco. */
function extractoNormal() {
  return [
    linea('03/09/2026', 'TRASPASO A 1234-00000000-00 ABCDEF', '-30.00', '1882.35'),
    linea('02/09/2026', 'NOMINA EMPRESA SL', '1000.00', '1912.35'),
    linea('02/09/2026', 'LUZ Iberdrola Clientes, S.A.U.', '-45.11', '912.35', 'A00000000000', '0000001'),
    linea('01/09/2026', 'COMPRA TARJ. 5402XXXXXXXX1111 MERCADONA-OVIEDO', '-42.54', '957.46', '', '5402__1111'),
  ].join('\n') + '\n'
}

function leerBien(contenido: string) {
  const lectura = leerSabadell(contenido)
  if (!lectura.ok) throw new Error(`no debería fallar: ${lectura.error}`)
  return lectura.extracto
}

test.describe('leerSabadell', () => {
  test('lee los movimientos del más antiguo al más reciente, como la norma', () => {
    const { cuentas, avisos } = leerBien(extractoNormal())

    expect(avisos).toEqual([])
    expect(cuentas).toHaveLength(1)
    expect(cuentas[0].movimientos.map(m => m.fecha)).toEqual(['2026-09-01', '2026-09-02', '2026-09-02', '2026-09-03'])
    expect(cuentas[0].desde).toBe('2026-09-01')
    expect(cuentas[0].hasta).toBe('2026-09-03')
  })

  test('el saldo inicial sale de deshacer el primer movimiento, y el final es el último saldo', () => {
    const [cuenta] = leerBien(extractoNormal()).cuentas

    expect(cuenta.saldoInicialCents).toBe(100000)
    expect(cuenta.saldoFinalCents).toBe(188235)
  })

  test('el importe son céntimos positivos y el signo va en kind', () => {
    const [compra, , nomina] = leerBien(extractoNormal()).cuentas[0].movimientos

    expect(compra).toMatchObject({ amountCents: 4254, kind: 'gasto' })
    expect(nomina).toMatchObject({ amountCents: 100000, kind: 'ingreso' })
  })

  // Con `Number('0.29') * 100` salen 28,999…: el céntimo se lee como texto.
  test('los decimales no pierden un céntimo por el camino', () => {
    const [unico] = leerBien(linea('01/09/2026', 'X', '-0.29', '0.71')).cuentas[0].movimientos
    expect(unico.amountCents).toBe(29)
  })

  // Farpi promete en /privacidad que no guarda números de tarjeta, y el concepto
  // va a «Qué fue».
  test('el concepto no lleva el número de la tarjeta', () => {
    const [compra] = leerBien(extractoNormal()).cuentas[0].movimientos
    expect(compra.concepto).toBe('MERCADONA-OVIEDO')

    const [devolucion] = leerBien(linea('18/09/2026', 'DEVOLUCION TAR.5402XXXXXXXX1111 18.09 TIENDA-OVIEDO', '9.99', '9.99')).cuentas[0].movimientos
    expect(devolucion.concepto).toBe('DEVOLUCION TAR. TIENDA-OVIEDO')
  })

  test('el concepto de un traspaso no lleva la cuenta de destino', () => {
    const traspaso = leerBien(extractoNormal()).cuentas[0].movimientos[3]
    expect(traspaso.concepto).toBe('TRASPASO A ABCDEF')
  })

  // Sin clave del anexo 2, `importacion.ts` no compararía el recibo con los fijos
  // y la luz se contaría dos veces.
  test('deduce la clave de la AEB: recibo, tarjeta, traspaso y nómina', () => {
    const claves = leerBien(extractoNormal()).cuentas[0].movimientos.map(m => m.conceptoComun)
    expect(claves).toEqual(['12', '03', '15', '04'])
  })

  // La tarjeta viene como referencia en todas las compras: si entrara en la
  // huella, dos cafés iguales del mismo día serían el mismo movimiento.
  test('dos compras iguales del mismo día y la misma tarjeta tienen huellas distintas', () => {
    const cafe = 'COMPRA TARJ. 5402XXXXXXXX1111 CAFE-OVIEDO'
    const [cuenta] = leerBien([
      linea('01/09/2026', cafe, '-1.50', '97.00', '', '5402__1111'),
      linea('01/09/2026', cafe, '-1.50', '98.50', '', '5402__1111'),
    ].join('\n')).cuentas

    const ordenes = ordenEnSuDia(cuenta.movimientos)
    const huellas = cuenta.movimientos.map((m, i) => huellaDeMovimiento(cuenta.cuenta, m, ordenes[i]))
    expect(new Set(huellas).size).toBe(2)
  })

  // Contado desde el primero del día, el orden no cambia cuando una descarga
  // posterior trae más movimientos de ese día: la huella de los que ya estaban
  // es la misma y no entran dos veces.
  test('una descarga posterior con más movimientos del mismo día no cambia las huellas de los de antes', () => {
    const huellas = (contenido: string) => {
      const [cuenta] = leerBien(contenido).cuentas
      const ordenes = ordenEnSuDia(cuenta.movimientos)
      return cuenta.movimientos.map((m, i) => huellaDeMovimiento(cuenta.cuenta, m, ordenes[i]))
    }
    const primero = linea('01/09/2026', 'COMPRA TARJ. 5402XXXXXXXX1111 A-OVIEDO', '-5.00', '95.00')
    const despues = linea('01/09/2026', 'COMPRA TARJ. 5402XXXXXXXX1111 B-OVIEDO', '-5.00', '90.00')

    const antes = huellas(primero)
    const ahora = huellas([despues, primero].join('\n'))
    expect(ahora).toContain(antes[0])
    expect(ahora).toHaveLength(2)
  })

  test('avisa si el saldo de una línea no cuadra con la anterior', () => {
    const { avisos } = leerBien([
      linea('02/09/2026', 'B', '-10.00', '80.00'),
      linea('01/09/2026', 'A', '-10.00', '100.00'),
    ].join('\n'))

    expect(avisos).toHaveLength(1)
    expect(avisos[0]).toContain('línea 1')
  })

  test('tolera saltos de línea de Windows', () => {
    expect(leerBien(extractoNormal().replace(/\n/g, '\r\n')).cuentas[0].movimientos).toHaveLength(4)
  })

  test('rechaza una línea que no tiene la forma del fichero', () => {
    const lectura = leerSabadell([extractoNormal().trim(), '01/09/2026|SOLO|DOS'].join('\n'))
    expect(lectura).toEqual({ ok: false, error: 'La línea 5 no tiene la forma del extracto del Sabadell' })

    const malImporte = leerSabadell(linea('01/09/2026', 'X', '-1,50', '10.00'))
    expect(malImporte.ok).toBe(false)
  })

  test('un archivo vacío se dice como tal', () => {
    expect(leerSabadell('\n\n')).toEqual({ ok: false, error: 'El archivo está vacío' })
  })
})

test.describe('leerExtracto', () => {
  test('reconoce el .txt del Sabadell por su primera línea', () => {
    const lectura = leerExtracto(extractoNormal())
    expect(lectura.ok && lectura.extracto.cuentas[0].entidad).toBe('0081')
  })

  test('lo demás lo lee como Norma 43', () => {
    const n43 = [
      cabecera({ saldo: 100000 }),
      movimiento({ fecha: '260903', comun: '12', signo: '1', importe: 1000 }),
      final({ apuntesDebe: 1, totalDebe: 1000, apuntesHaber: 0, totalHaber: 0, saldo: 99000 }),
      finFichero,
    ].join('\n')
    const lectura = leerExtracto(n43)
    expect(lectura.ok && lectura.extracto.cuentas[0].entidad).toBe('0182')
  })

  test('un fichero que no es ninguno de los dos da el error de la norma', () => {
    const lectura = leerExtracto('Fecha;Concepto;Importe\n')
    expect(lectura.ok).toBe(false)
  })
})

// ─── El Excel por dentro ─────────────────────────────────────────────────────

test.describe('leerXlsx', () => {
  test('saca las celdas en su columna, con los huecos vacíos', async () => {
    const filas = await leerXlsx(xlsx([['a', null, 3], [], [null, 'b']]))
    expect(filas).toEqual([['a', '', '3'], [], ['', 'b']])
  })

  test('lee también un zip sin comprimir', async () => {
    const filas = await leerXlsx(xlsx([['hola', 1.5]], { comprimir: false }))
    expect(filas).toEqual([['hola', '1.5']])
  })

  // Excel guarda con formato los textos que alguien retocó: vienen partidos en
  // trozos y hay que juntarlos. Y las entidades XML se deshacen.
  test('junta los textos con formato y deshace las entidades', async () => {
    const libro = zip({
      'xl/workbook.xml': '<workbook><sheets><sheet r:id="rId7"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Target="/xl/worksheets/hoja.xml" Id="rId7"/></Relationships>',
      'xl/worksheets/hoja.xml': '<worksheet><sheetData><row r="2"><c r="AA2" t="s"><v>0</v></c><c r="AB2" t="inlineStr"><is><t>en línea</t></is></c></row></sheetData></worksheet>',
      'xl/sharedStrings.xml': '<sst><si><r><t>Pan </t></r><r><t>&amp; vino &#241;</t></r></si></sst>',
    })
    const filas = await leerXlsx(libro)
    expect(filas[1][26]).toBe('Pan & vino ñ')
    expect(filas[1][27]).toBe('en línea')
  })

  test('un zip que no es un Excel da error', async () => {
    await expect(leerXlsx(zip({ 'hola.txt': 'hola' }))).rejects.toThrow()
  })
})

// ─── BBVA ────────────────────────────────────────────────────────────────────

/** Saldo inicial 1.000 €. Lo más reciente arriba, como lo da el banco. */
function excelNormal() {
  return [
    ...cabeceraBbva(),
    filaBbva('03/09/2026', 'Bizum', 'Enviado: pescado', -60, 1812.35),
    filaBbva('02/09/2026', 'Abono de nómina', 'Nomina del mes: agosto', 1000, 1872.35),
    filaBbva('02/09/2026', 'Adeudo orange telecom', 'Adeudo nº 2026240002003836', -45.11, 872.35),
    filaBbva('01/09/2026', 'Adeudo mensual de tarjeta', '4552000011112222', -82.54, 917.46),
  ]
}

async function leerExcel(filas: Celda[][]) {
  const lectura = leerBbva(await leerXlsx(xlsx(filas)))
  if (!lectura.ok) throw new Error(`no debería fallar: ${lectura.error}`)
  return lectura.extracto
}

test.describe('leerBbva', () => {
  test('encuentra la tabla debajo del título y la lee del más antiguo al más reciente', async () => {
    const { cuentas, avisos } = await leerExcel(excelNormal())

    expect(avisos).toEqual([])
    expect(cuentas[0].entidad).toBe('0182')
    expect(cuentas[0].movimientos.map(m => m.fecha)).toEqual(['2026-09-01', '2026-09-02', '2026-09-02', '2026-09-03'])
    expect(cuentas[0].saldoInicialCents).toBe(100000)
    expect(cuentas[0].saldoFinalCents).toBe(181235)
  })

  test('el importe son céntimos positivos y el signo va en kind', async () => {
    const [tarjeta, , nomina] = (await leerExcel(excelNormal())).cuentas[0].movimientos
    expect(tarjeta).toMatchObject({ amountCents: 8254, kind: 'gasto' })
    expect(nomina).toMatchObject({ amountCents: 100000, kind: 'ingreso' })
  })

  // Excel guarda un double: 30,63 puede salir escrito como 30.629999999999999.
  test('un importe con la cola del redondeo binario se queda en su céntimo', async () => {
    // Se escribe el XML a mano: en JavaScript, -30.629999999999999 ya es -30.63
    // y el generador lo escribiría limpio.
    const libro = zip({
      'xl/workbook.xml': '<workbook><sheets><sheet r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/worksheets/sheet1.xml': '<worksheet><sheetData>'
        + '<row r="1"><c r="A1" t="inlineStr"><is><t>Fecha</t></is></c><c r="B1" t="inlineStr"><is><t>Concepto</t></is></c><c r="C1" t="inlineStr"><is><t>Importe</t></is></c><c r="D1" t="inlineStr"><is><t>Disponible</t></is></c></row>'
        + '<row r="2"><c r="A2" t="inlineStr"><is><t>01/09/2026</t></is></c><c r="B2" t="inlineStr"><is><t>X</t></is></c><c r="C2"><v>-30.629999999999999</v></c><c r="D2"><v>69.370000000000005</v></c></row>'
        + '</sheetData></worksheet>',
    })
    const lectura = leerBbva(await leerXlsx(libro))
    expect(lectura.ok && lectura.extracto.cuentas[0].movimientos[0].amountCents).toBe(3063)
  })

  // El BBVA pone la tarjeta entera en «Adeudo mensual de tarjeta» y la cuenta en
  // el préstamo. /privacidad promete que eso no se guarda.
  test('el concepto no lleva ni la tarjeta ni la cuenta enteras', async () => {
    const [tarjeta] = (await leerExcel(excelNormal())).cuentas[0].movimientos
    expect(tarjeta.concepto).toBe('Adeudo mensual de tarjeta')

    const [prestamo] = (await leerExcel([
      ...cabeceraBbva(),
      filaBbva('01/09/2026', 'Cargo por amortizacion de prestamo', '0182-4800-55-0830101685', -300, 700),
    ])).cuentas[0].movimientos
    expect(prestamo.concepto).toBe('Cargo por amortizacion de prestamo')
  })

  test('el detalle se suma cuando dice qué fue, y no cuando repite el concepto', async () => {
    const conceptos = (await leerExcel(excelNormal())).cuentas[0].movimientos.map(m => m.concepto)
    expect(conceptos).toEqual([
      'Adeudo mensual de tarjeta',
      'Adeudo orange telecom',
      'Abono de nómina · Nomina del mes: agosto',
      'Bizum · Enviado: pescado',
    ])
  })

  test('deduce la clave de la AEB: tarjeta, recibo, nómina y transferencia', async () => {
    const claves = (await leerExcel(excelNormal())).cuentas[0].movimientos.map(m => m.conceptoComun)
    expect(claves).toEqual(['12', '03', '15', '04'])
  })

  test('avisa si el disponible de una fila no cuadra con la anterior', async () => {
    const { avisos } = await leerExcel([
      ...cabeceraBbva(),
      filaBbva('02/09/2026', 'B', '', -10, 80),
      filaBbva('01/09/2026', 'A', '', -10, 100),
    ])
    expect(avisos).toEqual(['El saldo de la fila 6 del Excel no sale de sumar su movimiento al anterior: puede faltar algún movimiento entre medias'])
  })

  test('una fecha guardada como fecha de Excel se lee igual', async () => {
    // 46266 es el 1 de septiembre de 2026 en el calendario de Excel.
    const filas: Celda[][] = [...cabeceraBbva(), [null, 46266, 46266, 'X', '', -1, 'EUR', 99, 'EUR', '']]
    expect((await leerExcel(filas)).cuentas[0].movimientos[0].fecha).toBe('2026-09-01')
  })

  test('un Excel sin las columnas del BBVA dice cuáles hacen falta', async () => {
    const lectura = leerBbva(await leerXlsx(xlsx([['Fecha', 'Concepto', 'Importe']])))
    expect(lectura).toEqual({ ok: false, error: 'Este Excel no tiene las columnas del extracto del BBVA: Fecha, Concepto, Importe y Disponible' })
  })

  test('una tabla sin movimientos no es un extracto', async () => {
    expect(leerBbva(await leerXlsx(xlsx(cabeceraBbva())))).toEqual({ ok: false, error: 'El Excel no trae ningún movimiento' })
  })
})

// ─── La puerta ───────────────────────────────────────────────────────────────

test.describe('leerArchivoDeExtracto', () => {
  test('un zip lo lee como el Excel del BBVA', async () => {
    const lectura = await leerArchivoDeExtracto(new Uint8Array(xlsx(excelNormal())))
    expect(lectura.ok && lectura.extracto.cuentas[0].movimientos).toHaveLength(4)
  })

  test('un zip que no es un Excel lo dice en castellano', async () => {
    const lectura = await leerArchivoDeExtracto(new Uint8Array(zip({ 'foto.jpg': 'x' })))
    expect(lectura).toEqual({ ok: false, error: 'No se ha podido abrir: parece un archivo comprimido, pero no un Excel' })
  })

  // Latín-1 es como lo manda el Sabadell: una «Ñ» es un solo byte, que en UTF-8
  // estricto no vale, y tiene que llegar como «Ñ» y no como un carácter roto.
  test('el texto en latín-1 se lee con sus eñes', async () => {
    const txt = Buffer.from('01/09/2026|COMPRA TARJ. 5402XXXXXXXX1111 ESPAÑA-OVIEDO|01/09/2026|-1.00|9.00||\n', 'latin1')
    const lectura = await leerArchivoDeExtracto(new Uint8Array(txt))
    expect(lectura.ok && lectura.extracto.cuentas[0].movimientos[0].concepto).toBe('ESPAÑA-OVIEDO')
  })
})
