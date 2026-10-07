/**
 * Lo que se dicta para apuntar algo: de una frase a lo que Farpi sabe guardar.
 *
 * Pura y aquí —y no dentro de un sheet— porque es la parte que se equivoca, y las
 * reglas de «qué es un ítem» o «qué día es mañana» hay que poder probarlas sin
 * navegador ni micrófono. El reconocimiento de voz lo hace el navegador
 * (`useDictado`); esto solo interpreta lo que ya viene escrito.
 *
 * Es deliberadamente simple: lo que no entiende lo deja como está, y quien llama
 * enseña el resultado **antes** de guardar.
 */

/** Minúsculas y sin acentos, para comparar lo que dice la voz con lo que está escrito. */
function sinAcentos(texto: string): string {
  return texto.normalize('NFC').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function escaparParaRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Un texto con la primera en mayúscula, como los apuntados a mano. */
function conMayuscula(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase() + texto.slice(1)
}

// ─── Ítems de una lista ──────────────────────────────────────────────────────

/** «Añade», «apunta», «hay que comprar»… al principio de la frase. */
const PETICION_AL_PRINCIPIO =
  /^(?:por favor,?\s+)?(?:a[ñn][aá]de(?:me)?|a[ñn]adir|apunta(?:me|r)?|pon(?:me|er)?|mete|necesito|necesitamos|hay que comprar|tenemos que comprar|falta|faltan|comprar|add|put)\s+/i

/** «…a la compra», «…en la lista de la compra» al final. */
const DESTINO_AL_FINAL =
  /\s+(?:a|en|to|on)\s+(?:la|el|the|my|our)?\s*(?:lista|compra|cesta|list|shopping(?:\s+list)?|basket)(?:\s+de\s+la\s+compra)?\s*$/i

/** Lo que separa un ítem de otro: comas, puntos y comas, «y», «e» y «and». */
const SEPARADOR = /\s*(?:[,;]|\s(?:y|e|and)\s)\s*/i

/**
 * Parte lo dictado en ítems, sin repetidos y sin vacíos.
 *
 * «Añade leche, pan y huevos a la compra» → `['Leche', 'Pan', 'Huevos']`. Un ítem
 * como «sal y pimienta» se parte en dos al dictarlo, y por eso quien llama enseña
 * lo que va a añadir antes de guardar.
 */
export function separarItems(frase: string): string[] {
  let resto = frase.trim()
  resto = resto.replace(DESTINO_AL_FINAL, '')
  // Solo se quita la petición si queda algo detrás: «compra» a secas es un ítem.
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

/**
 * Si la frase termina diciendo **a qué lista** va («…a la ferretería»), la lista y
 * lo que queda de la frase sin ese final.
 *
 * Se mira solo el final y con una preposición delante, para que un ítem que se
 * llame como una lista («tarta de compra») no la elija por accidente. Las listas
 * de nombre más largo van primero: «Compra grande» gana a «Compra».
 */
export function destinoDeLista(
  frase: string,
  listas: { id: string; name: string }[],
): { frase: string; listaId: string | null } {
  const normal = sinAcentos(frase)
  const porLargo = [...listas].sort((a, b) => b.name.length - a.name.length)
  for (const lista of porLargo) {
    const nombre = sinAcentos(lista.name).trim()
    if (!nombre) continue
    const final = new RegExp(
      '\\s+(?:a|en|para|de)\\s+(?:la|el|las|los|mi|nuestra)?\\s*(?:lista\\s+(?:de\\s+(?:la\\s+)?)?)?' +
        escaparParaRegex(nombre) + '\\s*[.!]?$',
    )
    const encaje = final.exec(normal)
    if (encaje) return { frase: frase.slice(0, encaje.index), listaId: lista.id }
  }
  return { frase, listaId: null }
}

// ─── Un plan del calendario ──────────────────────────────────────────────────

/** Lo que se ha entendido de un plan dictado. Lo que no se entendió es `null`. */
export interface EventoDictado {
  titulo: string
  /** `YYYY-MM-DD`, en el calendario de quien mira. */
  fecha: string | null
  /** `HH:mm`. */
  hora: string | null
  persona: { child_id: string | null; member_id: string | null } | null
}

const DIAS_DE_LA_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const NUMEROS_EN_PALABRAS: Record<string, number> = {
  una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
}

function aFecha(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

function sumarDias(base: Date, dias: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias)
}

/** Quita de la frase (y de su copia sin acentos) el trozo que casó, para que no quede en el título. */
function recortar(original: string, normal: string, encaje: RegExpExecArray): [string, string] {
  const desde = encaje.index
  const hasta = desde + encaje[0].length
  return [
    original.slice(0, desde) + ' ' + original.slice(hasta),
    normal.slice(0, desde) + ' ' + normal.slice(hasta),
  ]
}

/**
 * Entiende «dentista mañana a las cinco de la tarde» como un plan.
 *
 * Saca el día, la hora y a quién le toca, y deja el resto como título. **Lo que no
 * entiende se queda `null`**, y quien llama no lo toca: es un formulario que se
 * revisa antes de guardar, y una fecha mal adivinada es peor que ninguna.
 *
 * Dos suposiciones que conviene saber: sin decir mañana, tarde o noche, una hora
 * de la 1 a las 7 se toma por la tarde («a las 5» son las 17:00), porque nadie
 * apunta un plan a las cinco de la madrugada; y un día de la semana es **el
 * próximo**, nunca hoy («el viernes», dicho en viernes, es el de dentro de ocho
 * días).
 */
export function entenderEvento(
  frase: string,
  hoy: Date,
  personas: { nombre: string; child_id: string | null; member_id: string | null }[] = [],
): EventoDictado {
  let original = frase.normalize('NFC').trim()
  let normal = sinAcentos(original)

  // La hora, primero: «de la mañana» es una franja y no el día de mañana.
  let hora: string | null = null
  const HORA = new RegExp(
    '\\b(?:a\\s+las?|sobre\\s+las)\\s+(\\d{1,2}|' + Object.keys(NUMEROS_EN_PALABRAS).join('|') + ')' +
      '(?:\\s*[:.h]\\s*(\\d{2}))?' +
      '(?:\\s+(y\\s+media|y\\s+cuarto|menos\\s+cuarto|en\\s+punto))?' +
      '(?:\\s+(?:de|por)\\s+la\\s+(manana|tarde|noche|madrugada))?',
  )
  const h = HORA.exec(normal)
  if (h) {
    let horas = /^\d+$/.test(h[1]) ? Number(h[1]) : NUMEROS_EN_PALABRAS[h[1]]
    const franja = h[4]
    // La franja manda sobre la hora que se dijo, y «menos cuarto» resta después:
    // «las ocho menos cuarto» son las 7:45 de la mañana, no de la tarde.
    if ((franja === 'tarde' || franja === 'noche') && horas < 12) horas += 12
    else if (!franja && horas >= 1 && horas <= 7) horas += 12
    let minutos = h[2] ? Number(h[2]) : 0
    if (h[3]?.startsWith('y media')) minutos = 30
    else if (h[3]?.startsWith('y cuarto')) minutos = 15
    else if (h[3]?.startsWith('menos')) { minutos = 45; horas -= 1 }
    if (horas >= 0 && horas < 24 && minutos < 60) {
      hora = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
      ;[original, normal] = recortar(original, normal, h)
    }
  }

  // El día. El primero de estos que case manda.
  let fecha: string | null = null
  const dia = (re: RegExp, calcula: (m: RegExpExecArray) => Date | null) => {
    if (fecha) return
    const m = re.exec(normal)
    if (!m) return
    const resultado = calcula(m)
    if (!resultado) return
    fecha = aFecha(resultado)
    ;[original, normal] = recortar(original, normal, m)
  }
  dia(/\bpasado\s+manana\b/, () => sumarDias(hoy, 2))
  dia(/\bmanana\b/, () => sumarDias(hoy, 1))
  dia(/\bhoy\b/, () => hoy)
  dia(/\b(?:el\s+)?(?:proximo\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/, m => {
    const objetivo = DIAS_DE_LA_SEMANA.indexOf(m[1])
    const falta = (objetivo - hoy.getDay() + 7) % 7 || 7
    return sumarDias(hoy, falta)
  })
  dia(new RegExp('\\bel\\s+(\\d{1,2})\\s+de\\s+(' + MESES.join('|') + ')\\b'), m => {
    const mes = MESES.indexOf(m[2])
    let candidata = new Date(hoy.getFullYear(), mes, Number(m[1]))
    if (candidata.getMonth() !== mes) return null
    if (aFecha(candidata) < aFecha(hoy)) candidata = new Date(hoy.getFullYear() + 1, mes, Number(m[1]))
    return candidata
  })
  dia(/\bel\s+(\d{1,2})\b/, m => {
    const numero = Number(m[1])
    if (numero < 1 || numero > 31) return null
    let candidata = new Date(hoy.getFullYear(), hoy.getMonth(), numero)
    if (aFecha(candidata) < aFecha(hoy)) candidata = new Date(hoy.getFullYear(), hoy.getMonth() + 1, numero)
    return candidata.getDate() === numero ? candidata : null
  })

  // A quién le toca: el primer nombre de la casa que aparezca como palabra entera.
  let persona: EventoDictado['persona'] = null
  for (const p of personas) {
    const nombre = sinAcentos(p.nombre).trim()
    if (nombre && new RegExp('\\b' + escaparParaRegex(nombre) + '\\b').test(normal)) {
      persona = { child_id: p.child_id, member_id: p.member_id }
      break
    }
  }

  const titulo = original
    .replace(/^(?:por favor,?\s+)?(?:a[ñn][aá]de(?:me)?|a[ñn]adir|apunta(?:me|r)?|pon(?:me|er)?|recu[eé]rdame|tengo|tenemos|hay)\s+/i, '')
    .replace(/\s+(?:en|al)\s+(?:el\s+)?calendario\s*$/i, '')
    .replace(/[.!?¡¿]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Lo que quedó colgando al quitar el día o la hora: «Dentista el», «Cena para».
    .replace(/(?:\s+(?:el|la|los|las|a|de|del|para|por|en|con|y))+$/i, '')
    .replace(/^(?:el|la|los|las|a|de|para|y)\s+/i, '')
    .trim()

  return { titulo: titulo ? conMayuscula(titulo) : '', fecha, hora, persona }
}
