/**
 * La primera hoja de un Excel (`.xlsx`), como filas de texto.
 *
 * **Sin librería, a propósito.** Las que leen Excel pesan cientos de KB y hacen
 * mil cosas —fórmulas, estilos, escribir—, y aquí hace falta una: sacar las
 * celdas de la tabla de movimientos que da el banco. Un `.xlsx` es un zip con
 * XML dentro, y el navegador ya trae lo necesario: `DecompressionStream` para
 * el zip. El XML se lee con expresiones regulares y no con `DOMParser` porque
 * esto se prueba en Node, que no lo tiene; el formato de las celdas es fijo y
 * pequeño, y es lo único que se mira.
 *
 * Lo que **no** hace: fórmulas (se lee el último valor calculado, que Excel
 * guarda al lado), formatos de número ni fechas —un número sale como el texto
 * que hay en el archivo y la fecha como su número de serie—. Eso lo interpreta
 * quien sabe qué columna es qué.
 */

/** Cada fila, con las celdas en su columna (A es 0). Las que no existen, `''`. */
export type FilasXlsx = string[][]

/** Si los bytes son un zip, que es lo que es un `.xlsx` por dentro. */
export function esZip(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

export async function leerXlsx(bytes: Uint8Array): Promise<FilasXlsx> {
  const zip = indiceDelZip(bytes)
  const leer = async (ruta: string) => {
    const entrada = zip.get(ruta)
    return entrada ? new TextDecoder('utf-8').decode(await descomprimir(bytes, entrada)) : null
  }

  // La primera hoja es la primera de `workbook.xml`, y su archivo se busca en las
  // relaciones: casi siempre es `sheet1.xml`, pero no hay por qué suponerlo.
  const libro = await leer('xl/workbook.xml')
  const relaciones = await leer('xl/_rels/workbook.xml.rels')
  if (!libro || !relaciones) throw new Error('No es un Excel')

  const idHoja = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(libro)?.[1]
  const destino = idHoja
    ? new RegExp(`<Relationship\\b[^>]*\\bId="${idHoja}"[^>]*\\bTarget="([^"]+)"`).exec(relaciones)?.[1]
      ?? new RegExp(`<Relationship\\b[^>]*\\bTarget="([^"]+)"[^>]*\\bId="${idHoja}"`).exec(relaciones)?.[1]
    : undefined
  const hoja = destino ? await leer(destino.startsWith('/') ? destino.slice(1) : `xl/${destino}`) : null
  if (!hoja) throw new Error('El Excel no tiene ninguna hoja')

  const compartidos = textosCompartidos(await leer('xl/sharedStrings.xml') ?? '')
  return celdas(hoja, compartidos)
}

interface EntradaZip {
  metodo: number
  comprimido: number
  cabeceraLocal: number
}

/**
 * Dónde está cada archivo del zip, leído del directorio central del final.
 *
 * No se recorren las cabeceras locales del principio porque pueden venir con los
 * tamaños a cero —el bit 3, cuando quien escribe no los sabe todavía— y el
 * directorio central siempre los lleva.
 */
function indiceDelZip(bytes: Uint8Array): Map<string, EntradaZip> {
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let fin = -1
  // El registro del final mide 22 bytes más un comentario de hasta 64 KB.
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (vista.getUint32(i, true) === 0x06054b50) { fin = i; break }
  }
  if (fin < 0) throw new Error('No es un zip')

  const entradas = new Map<string, EntradaZip>()
  const cuantas = vista.getUint16(fin + 10, true)
  let pos = vista.getUint32(fin + 16, true)
  for (let n = 0; n < cuantas; n++) {
    if (vista.getUint32(pos, true) !== 0x02014b50) throw new Error('Zip dañado')
    const largoNombre = vista.getUint16(pos + 28, true)
    const nombre = new TextDecoder('utf-8').decode(bytes.subarray(pos + 46, pos + 46 + largoNombre))
    entradas.set(nombre, {
      metodo: vista.getUint16(pos + 10, true),
      comprimido: vista.getUint32(pos + 20, true),
      cabeceraLocal: vista.getUint32(pos + 42, true),
    })
    pos += 46 + largoNombre + vista.getUint16(pos + 30, true) + vista.getUint16(pos + 32, true)
  }
  return entradas
}

async function descomprimir(bytes: Uint8Array, entrada: EntradaZip): Promise<Uint8Array> {
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const inicio = entrada.cabeceraLocal + 30 + vista.getUint16(entrada.cabeceraLocal + 26, true) + vista.getUint16(entrada.cabeceraLocal + 28, true)
  const datos = bytes.slice(inicio, inicio + entrada.comprimido)

  if (entrada.metodo === 0) return datos
  if (entrada.metodo !== 8) throw new Error('Compresión de zip desconocida')

  const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(flujo).arrayBuffer())
}

/** La tabla de textos de `sharedStrings.xml`, en orden: las celdas apuntan a ella por posición. */
function textosCompartidos(xml: string): string[] {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(([, si]) => textoDe(si))
}

/**
 * El texto de un `<si>` o un `<is>`: puede venir entero en un `<t>` o partido en
 * trozos con formato (`<r><t>…</t></r>`), y en ese caso se juntan.
 */
function textoDe(fragmento: string): string {
  return [...fragmento.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(([, t]) => entidades(t)).join('')
}

function celdas(hoja: string, compartidos: string[]): FilasXlsx {
  const filas: FilasXlsx = []
  for (const [, atributosFila, contenido] of hoja.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const numero = Number(/\br="(\d+)"/.exec(atributosFila)?.[1] ?? filas.length + 1)
    const fila: string[] = []
    for (const [, atributos, dentro = ''] of contenido.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+)\d+"/.exec(atributos)?.[1]
      if (!ref) continue
      const tipo = /\bt="(\w+)"/.exec(atributos)?.[1]
      const valor = /<v>([\s\S]*?)<\/v>/.exec(dentro)?.[1]
      const texto = tipo === 's'
        ? compartidos[Number(valor)] ?? ''
        : tipo === 'inlineStr'
          ? textoDe(dentro)
          : entidades(valor ?? '')
      fila[columna(ref)] = texto
    }
    filas[numero - 1] = Array.from(fila, celda => celda ?? '')
  }
  return Array.from(filas, fila => fila ?? [])
}

/** `A` es 0, `Z` 25 y `AA` 26. */
function columna(letras: string): number {
  return [...letras].reduce((total, letra) => total * 26 + letra.charCodeAt(0) - 64, 0) - 1
}

function entidades(texto: string): string {
  return texto.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(amp|lt|gt|quot|apos));/gi, (_, hex, dec, nombre) => {
    if (hex) return String.fromCodePoint(parseInt(hex, 16))
    if (dec) return String.fromCodePoint(Number(dec))
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[nombre.toLowerCase()]
  })
}
