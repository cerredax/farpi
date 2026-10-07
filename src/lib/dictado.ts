/**
 * Lo que se dicta para apuntar en una lista: de una frase a varios ítems.
 *
 * Pura y aquí —y no dentro del sheet— porque es la parte que se equivoca, y las
 * reglas de «qué es un ítem» hay que poder probarlas sin navegador ni micrófono.
 * El reconocimiento de voz lo hace el navegador (`useDictado`); esto solo parte
 * lo que ya viene escrito.
 *
 * Es deliberadamente simple: comas, «y» e «e» separan, y se quitan las fórmulas de
 * pedir («añade…», «…a la compra»). Un ítem como «sal y pimienta» se parte en dos
 * al dictarlo, y por eso el sheet enseña lo que va a añadir **antes** de guardar.
 */

/** «Añade», «apunta», «hay que comprar»… al principio de la frase. */
const PETICION_AL_PRINCIPIO =
  /^(?:por favor,?\s+)?(?:a[ñn][aá]de(?:me)?|a[ñn]adir|apunta(?:me|r)?|pon(?:me|er)?|mete|necesito|necesitamos|hay que comprar|tenemos que comprar|falta|faltan|comprar|add|put)\s+/i

/** «…a la compra», «…en la lista de la compra» al final. */
const DESTINO_AL_FINAL =
  /\s+(?:a|en|to|on)\s+(?:la|el|the|my|our)?\s*(?:lista|compra|cesta|list|shopping(?:\s+list)?|basket)(?:\s+de\s+la\s+compra)?\s*$/i

/** Lo que separa un ítem de otro: comas, puntos y comas, «y», «e» y «and». */
const SEPARADOR = /\s*(?:[,;]|\s(?:y|e|and)\s)\s*/i

/** Un ítem de la lista, con la primera en mayúscula como los apuntados a mano. */
function conMayuscula(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase() + texto.slice(1)
}

/**
 * Parte lo dictado en ítems, sin repetidos y sin vacíos.
 *
 * «Añade leche, pan y huevos a la compra» → `['Leche', 'Pan', 'Huevos']`.
 */
export function separarItems(frase: string): string[] {
  let resto = frase.trim()
  // Solo se quita una petición si queda algo detrás: «compra» a secas es un ítem.
  resto = resto.replace(DESTINO_AL_FINAL, '')
  resto = resto.replace(PETICION_AL_PRINCIPIO, '')
  resto = resto.replace(/[.!?¡¿]+/g, ' ')

  const vistos = new Set<string>()
  const items: string[] = []
  for (const trozo of resto.split(SEPARADOR)) {
    const texto = trozo.replace(/\s+/g, ' ').trim()
    if (!texto) continue
    const clave = texto.toLocaleLowerCase()
    if (vistos.has(clave)) continue
    vistos.add(clave)
    items.push(conMayuscula(texto))
  }
  return items
}
