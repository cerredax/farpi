import { deflateRawSync } from 'node:zlib'

/**
 * Un `.xlsx` mínimo hecho a mano, para probar `src/lib/xlsx.ts` sin guardar un
 * Excel de un banco en el repositorio (que llevaría los movimientos de alguien).
 *
 * Es un zip de verdad —cabeceras locales, directorio central y registro final—
 * con los cuatro archivos que el lector mira. Los comparten el test unitario y
 * el de navegador, que sube uno a la pantalla de importar.
 */

/** Las celdas, fila a fila desde la A1. Un número va como número; un texto, a la tabla compartida. */
export type Celda = string | number | null

export function xlsx(filas: Celda[][], opciones: { comprimir?: boolean } = {}): Buffer {
  const compartidos: string[] = []
  const indice = (texto: string) => {
    const i = compartidos.indexOf(texto)
    return i >= 0 ? i : compartidos.push(texto) - 1
  }

  const filasXml = filas.map((fila, f) => {
    const celdas = fila.map((celda, c) => {
      if (celda === null) return ''
      const ref = `${letra(c)}${f + 1}`
      return typeof celda === 'number'
        ? `<c r="${ref}"><v>${celda}</v></c>`
        : `<c r="${ref}" t="s"><v>${indice(celda)}</v></c>`
    }).join('')
    return `<row r="${f + 1}">${celdas}</row>`
  }).join('')

  return zip({
    'xl/workbook.xml': '<?xml version="1.0"?><workbook xmlns:r="r"><sheets><sheet name="Hoja" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': `<?xml version="1.0"?><worksheet><sheetData>${filasXml}</sheetData></worksheet>`,
    'xl/sharedStrings.xml': `<?xml version="1.0"?><sst>${compartidos.map(t => `<si><t xml:space="preserve">${escapar(t)}</t></si>`).join('')}</sst>`,
  }, opciones.comprimir ?? true)
}

/** Un zip con esos archivos, comprimidos (método 8) o tal cual (método 0). */
export function zip(archivos: Record<string, string>, comprimir = true): Buffer {
  const locales: Buffer[] = []
  const centrales: Buffer[] = []
  let desplazamiento = 0

  for (const [nombre, contenido] of Object.entries(archivos)) {
    const crudo = Buffer.from(contenido, 'utf-8')
    const datos = comprimir ? deflateRawSync(crudo) : crudo
    const nombreBytes = Buffer.from(nombre, 'utf-8')

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(comprimir ? 8 : 0, 8)
    local.writeUInt32LE(datos.length, 18)
    local.writeUInt32LE(crudo.length, 22)
    local.writeUInt16LE(nombreBytes.length, 26)
    locales.push(local, nombreBytes, datos)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(comprimir ? 8 : 0, 10)
    central.writeUInt32LE(datos.length, 20)
    central.writeUInt32LE(crudo.length, 24)
    central.writeUInt16LE(nombreBytes.length, 28)
    central.writeUInt32LE(desplazamiento, 42)
    centrales.push(central, nombreBytes)

    desplazamiento += 30 + nombreBytes.length + datos.length
  }

  const directorio = Buffer.concat(centrales)
  const fin = Buffer.alloc(22)
  fin.writeUInt32LE(0x06054b50, 0)
  fin.writeUInt16LE(Object.keys(archivos).length, 8)
  fin.writeUInt16LE(Object.keys(archivos).length, 10)
  fin.writeUInt32LE(directorio.length, 12)
  fin.writeUInt32LE(desplazamiento, 16)
  return Buffer.concat([...locales, directorio, fin])
}

function letra(columna: number): string {
  let texto = ''
  for (let n = columna + 1; n > 0; n = Math.floor((n - 1) / 26)) texto = String.fromCharCode(65 + ((n - 1) % 26)) + texto
  return texto
}

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * La cabecera del Excel del BBVA tal y como sale, con su título y su columna A
 * vacía delante. Las filas de datos van debajo, lo más reciente arriba.
 */
export function cabeceraBbva(): Celda[][] {
  return [
    [],
    [null, null, null, 'Últimos movimientos'],
    [null, null, null, 'Fecha de generación del informe: 23/09/2026'],
    [],
    [null, 'F.Valor', 'Fecha', 'Concepto', 'Movimiento', 'Importe', 'Divisa', 'Disponible', 'Divisa', 'Observaciones'],
  ]
}

/** Una fila de datos del BBVA. El disponible es el saldo que queda **después**. */
export function filaBbva(fecha: string, concepto: string, detalle: string, importe: number, disponible: number): Celda[] {
  return [null, fecha, fecha, concepto, detalle, importe, 'EUR', disponible, 'EUR', detalle.toUpperCase()]
}
