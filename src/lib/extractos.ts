import { leerN43, type CuentaN43, type LecturaN43, type MovimientoN43 } from './n43'
import { normalizaParaBuscar } from './text'
import { esZip, leerXlsx, type FilasXlsx } from './xlsx'

/**
 * El extracto del banco, venga como venga, leído siempre al mismo `ExtractoN43`.
 *
 * **La Norma 43 sigue siendo la opción buena**, y `n43.ts` cuenta por qué: un
 * solo formato, igual en todos los bancos, que no se mueve. Pero la banca online
 * de algunos bancos no lo da en la descarga de movimientos, y la familia tiene
 * lo que tiene. Aquí están los otros dos que se saben leer, **uno por banco que
 * lo ha necesitado** y no un lector de CSV para cualquiera:
 *
 * - **Sabadell**: un `.txt` con siete campos separados por `|`.
 * - **BBVA**: un Excel con la tabla de «Últimos movimientos».
 *
 * Los dos devuelven **el mismo `ExtractoN43`** que la norma, así que la revisión
 * de `importacion.ts` —lo ya apuntado, lo que cubre un fijo— no sabe de dónde
 * vino. Y los dos traen el saldo tras cada movimiento, que es lo que permite
 * cuadrarlos igual que a la norma (ver `cuentaConSaldos`).
 */

/**
 * El archivo tal cual, en bytes. Es la puerta de la pantalla de importar.
 *
 * Se decide por lo que hay dentro y **nunca por la extensión**: el Sabadell y la
 * norma llegan los dos como `.txt`, y un zip es un Excel se llame como se llame.
 */
export async function leerArchivoDeExtracto(bytes: Uint8Array): Promise<LecturaN43> {
  if (esZip(bytes)) {
    let filas: FilasXlsx
    try {
      filas = await leerXlsx(bytes)
    } catch {
      return { ok: false, error: 'No se ha podido abrir: parece un archivo comprimido, pero no un Excel' }
    }
    return leerBbva(filas)
  }
  return leerExtracto(comoTexto(bytes))
}

/**
 * Un extracto que ya es texto: la norma o el `.txt` del Sabadell.
 *
 * Se distinguen por la primera línea: la de la norma empieza por un código de
 * registro de dos cifras y la del Sabadell por una fecha con barras.
 */
export function leerExtracto(contenido: string): LecturaN43 {
  const primera = contenido.split(/\r?\n/).find(linea => linea.trim() !== '') ?? ''
  return LINEA_SABADELL.test(primera) ? leerSabadell(contenido) : leerN43(contenido)
}

/**
 * Los bytes, leídos con la codificación que traigan.
 *
 * Los N43 salen de los bancos en ISO-8859-1, que es lo que había cuando se
 * escribió la norma, y el `.txt` del Sabadell también; alguno ya da UTF-8. Se
 * prueba primero UTF-8 en modo estricto: si el archivo no lo es, `TextDecoder`
 * lanza y entonces se lee como latín. Al revés no funcionaría —latín acepta
 * cualquier byte sin quejarse— y una «ñ» acabaría siendo dos caracteres raros.
 */
function comoTexto(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('iso-8859-1').decode(bytes)
  }
}

// ─── Sabadell ────────────────────────────────────────────────────────────────

/**
 * El `.txt` de movimientos del Sabadell: una línea por movimiento, sin cabecera,
 * en ISO-8859-1 y **del más reciente al más antiguo**:
 *
 *     fecha|concepto|fecha valor|importe|saldo|referencia 1|referencia 2
 *     21/09/2026|COMPRA TARJ. 5402XXXXXXXX3026 DAHORA-OVIEDO|21/09/2026|-37.10|525.06||5402__3026
 */

/** Cuántos campos trae cada línea. Se toleran de más, por si el banco añade uno al final. */
const CAMPOS_SABADELL = 7

/** Así empieza una línea de este formato: la fecha con barras y la primera `|`. */
const LINEA_SABADELL = /^\d{2}\/\d{2}\/\d{4}\|/

export function leerSabadell(contenido: string): LecturaN43 {
  const lineas = contenido
    .split(/\r?\n/)
    .map((texto, indice) => ({ texto, numero: indice + 1 }))
    .filter(({ texto }) => texto.trim() !== '')

  if (lineas.length === 0) return { ok: false, error: 'El archivo está vacío' }

  const leidos: ConSaldo[] = []
  for (const { texto, numero } of lineas) {
    const campos = texto.split('|')
    const fecha = fechaConBarras(campos[0] ?? '')
    const importeCents = centimos(campos[3] ?? '')
    const saldoCents = centimos(campos[4] ?? '')

    if (campos.length < CAMPOS_SABADELL || !fecha || importeCents === null || saldoCents === null) {
      return { ok: false, error: `La línea ${numero} no tiene la forma del extracto del Sabadell` }
    }

    const concepto = campos[1].trim()
    leidos.push({
      donde: `la línea ${numero}`,
      saldoCents,
      movimiento: {
        fecha,
        fechaValor: fechaConBarras(campos[2]) ?? fecha,
        amountCents: Math.abs(importeCents),
        kind: importeCents < 0 ? 'gasto' : 'ingreso',
        concepto: sinNumerosPrivados(concepto),
        conceptoComun: conceptoSabadell(concepto, campos[5].trim()),
        // **Vacía a propósito.** La segunda referencia de una compra es la
        // tarjeta («5402__3026»), la misma en todas: si entrara, dos cafés de
        // 1,50 € el mismo día con la misma tarjeta darían la misma huella y el
        // segundo se tomaría por repetido. Sin referencia, la huella usa el
        // orden dentro del día, que es lo que está para eso.
        referencia: '',
      },
    })
  }

  return { ok: true, extracto: cuentaConSaldos(leidos.reverse(), ENTIDAD_SABADELL) }
}

/** La entidad del Sabadell en el registro de bancos. El fichero no trae la cuenta. */
const ENTIDAD_SABADELL = '0081'

/**
 * La clave del anexo 2 de la AEB que le correspondería, deducida del texto.
 *
 * Hace falta porque `importacion.ts` solo compara con los fijos lo que se
 * domicilia (03, 04, 05, 15): sin clave, el recibo de la luz entraría marcado y
 * se contaría dos veces. **El recibo se reconoce por la primera referencia**,
 * que en este fichero solo la traen los adeudos SEPA (el identificador del
 * acreedor); lo demás, por cómo empieza el concepto. Lo que no se reconoce es
 * «Varios», que nunca se confunde con un fijo.
 */
function conceptoSabadell(concepto: string, referencia: string): string {
  if (referencia) return '03'
  if (/^COMPRA TARJ/.test(concepto)) return '12'
  if (/^DEVOLUCION/.test(concepto)) return '14'
  if (/^(TRASPASO|TRANSFERENCIA)/.test(concepto)) return '04'
  if (/NOMINA/.test(concepto)) return '15'
  if (/^(PRESTAMO|CUOTA)/.test(concepto)) return '05'
  return '99'
}

// ─── BBVA ────────────────────────────────────────────────────────────────────

/**
 * El Excel de «Últimos movimientos» del BBVA: un título, la fecha del informe y
 * una tabla con estas columnas, **lo más reciente arriba**:
 *
 *     F.Valor | Fecha | Concepto | Movimiento | Importe | Divisa | Disponible | Divisa | Observaciones
 *
 * La tabla no empieza en la A1 —hay título y una columna vacía delante—, así que
 * se busca la fila de cabecera por sus nombres y las columnas por lo que dicen,
 * no por su posición: si el banco añade una, esto sigue leyendo.
 */

/** La entidad del BBVA en el registro de bancos. El Excel no trae la cuenta. */
const ENTIDAD_BBVA = '0182'

export function leerBbva(filas: FilasXlsx): LecturaN43 {
  const nombres = filas.map(fila => fila.map(celda => normalizaParaBuscar(celda).trim()))
  const cabecera = nombres.findIndex(fila => ['fecha', 'concepto', 'importe', 'disponible'].every(n => fila.includes(n)))
  if (cabecera < 0) {
    return { ok: false, error: 'Este Excel no tiene las columnas del extracto del BBVA: Fecha, Concepto, Importe y Disponible' }
  }

  const col = (nombre: string) => nombres[cabecera].indexOf(nombre)
  const [cFecha, cValor, cConcepto, cDetalle, cImporte, cDisponible] =
    [col('fecha'), col('f.valor'), col('concepto'), col('movimiento'), col('importe'), col('disponible')]
  // La primera «Divisa» es la del importe; la segunda, la del saldo.
  const cDivisa = nombres[cabecera].indexOf('divisa', cImporte)

  const leidos: ConSaldo[] = []
  let otraDivisa = false
  for (let i = cabecera + 1; i < filas.length; i++) {
    const fila = filas[i]
    // La tabla acaba en la primera fila sin fecha: debajo puede haber notas.
    if (!fila[cFecha]?.trim()) break

    const numero = i + 1
    const fecha = fechaDeCelda(fila[cFecha])
    const importeCents = importeDeCelda(fila[cImporte] ?? '')
    const saldoCents = importeDeCelda(fila[cDisponible] ?? '')
    if (!fecha || importeCents === null || saldoCents === null) {
      return { ok: false, error: `La fila ${numero} del Excel no tiene la forma del extracto del BBVA` }
    }
    if (cDivisa >= 0 && fila[cDivisa] && fila[cDivisa].trim() !== 'EUR') otraDivisa = true

    const concepto = (fila[cConcepto] ?? '').replace(/\s+/g, ' ').trim()
    leidos.push({
      donde: `la fila ${numero} del Excel`,
      saldoCents,
      movimiento: {
        fecha,
        fechaValor: (cValor >= 0 && fechaDeCelda(fila[cValor] ?? '')) || fecha,
        amountCents: Math.abs(importeCents),
        kind: importeCents < 0 ? 'gasto' : 'ingreso',
        concepto: conceptoLegibleBbva(concepto, cDetalle >= 0 ? fila[cDetalle] ?? '' : ''),
        conceptoComun: conceptoBbva(concepto),
        // Como en el Sabadell: el detalle no identifica un movimiento (en los
        // Bizum es el texto que escribió quien lo mandó), así que manda el orden.
        referencia: '',
      },
    })
  }

  if (leidos.length === 0) return { ok: false, error: 'El Excel no trae ningún movimiento' }

  const extracto = cuentaConSaldos(leidos.reverse(), ENTIDAD_BBVA)
  if (otraDivisa) extracto.avisos.unshift('Hay movimientos que no van en euros y Farpi solo lleva euros')
  return { ok: true, extracto }
}

/**
 * Lo que se escribiría en «Qué fue»: el concepto y, si añade algo, el detalle.
 *
 * El BBVA parte el texto en dos: «Bizum» y «Enviado: pescado», o «Transferencia
 * realizada» y «Bautizo». El detalle es lo que dice qué fue, así que se suma;
 * pero no cuando repite el concepto («Adeudo» y «Adeudo nº 2026…»), cuando es
 * «Otros» o cuando es solo un número —que además es a veces una tarjeta o una
 * cuenta entera, y eso no se guarda (ver `sinNumerosPrivados`)—.
 */
function conceptoLegibleBbva(concepto: string, detalle: string): string {
  const limpioConcepto = sinNumerosPrivados(concepto)
  const limpioDetalle = sinNumerosPrivados(detalle.replace(/\s+/g, ' ').trim())
  const primeraPalabra = (texto: string) => normalizaParaBuscar(texto).split(' ')[0]

  const suma = /\p{L}{3}/u.test(limpioDetalle)
    && normalizaParaBuscar(limpioDetalle) !== 'otros'
    && primeraPalabra(limpioDetalle) !== primeraPalabra(limpioConcepto)
  return suma ? `${limpioConcepto} · ${limpioDetalle}` : limpioConcepto
}

/**
 * La clave de la AEB, deducida del concepto del BBVA. Es la misma idea que
 * `conceptoSabadell`, con las palabras de este banco: los adeudos son recibos
 * domiciliados y el préstamo tiene su clave, que son los que pueden estar en
 * los fijos. Un Bizum es una transferencia, que es lo que es.
 */
function conceptoBbva(concepto: string): string {
  const texto = normalizaParaBuscar(concepto)
  if (/^adeudo mensual de tarjeta/.test(texto)) return '12'
  if (/amortizacion de prestamo|^cuota/.test(texto)) return '05'
  if (/^(adeudo|recibo)/.test(texto)) return '03'
  if (/nomina/.test(texto)) return '15'
  if (/^(transferencia|traspaso|bizum)/.test(texto)) return '04'
  if (/^(ret\. efectivo|reintegro)/.test(texto)) return '01'
  if (/^ingreso/.test(texto)) return '02'
  if (/^(pago con tarjeta|compra)/.test(texto)) return '12'
  if (/^devolucion/.test(texto)) return '14'
  return '99'
}

// ─── Lo que comparten ────────────────────────────────────────────────────────

/** Un movimiento con el saldo que dejó, y dónde estaba para poder decirlo. */
interface ConSaldo {
  movimiento: MovimientoN43
  saldoCents: number
  donde: string
}

/**
 * La cuenta, cuadrada con el saldo de cada movimiento.
 *
 * Recibe los movimientos **del más antiguo al más reciente**, como la norma: el
 * orden dentro del día es parte de la huella, y contado desde el primero del
 * día no cambia cuando una descarga posterior trae más movimientos de ese día.
 *
 * **Esta es la comprobación que hace que se puedan usar.** No hay registro final
 * con totales, pero cada movimiento trae el saldo que dejó, y eso es más fino
 * todavía: el saldo de uno tiene que ser el del anterior más su importe. Si falta
 * un movimiento o se lee mal un importe, la cadena se rompe justo ahí y sale en
 * `avisos`, igual que un descuadre de la norma.
 */
function cuentaConSaldos(leidos: ConSaldo[], entidad: string) {
  const avisos: string[] = []
  for (let i = 1; i < leidos.length; i++) {
    if (leidos[i - 1].saldoCents + conSigno(leidos[i].movimiento) !== leidos[i].saldoCents) {
      avisos.push(`El saldo de ${leidos[i].donde} no sale de sumar su movimiento al anterior: puede faltar algún movimiento entre medias`)
    }
  }

  const movimientos = leidos.map(l => l.movimiento)
  const fechas = movimientos.map(m => m.fecha).sort()
  const cuenta: CuentaN43 = {
    // El archivo no dice de qué cuenta es, y el nombre del archivo no se
    // adivina. La huella se queda sin cuenta: lo peor que pasa con dos cuentas
    // del mismo banco es que un movimiento llegue desmarcado por parecerse a otro.
    cuenta: '',
    entidad,
    titular: '',
    desde: fechas[0],
    hasta: fechas[fechas.length - 1],
    saldoInicialCents: leidos[0].saldoCents - conSigno(leidos[0].movimiento),
    saldoFinalCents: leidos[leidos.length - 1].saldoCents,
    movimientos,
  }
  return { cuentas: [cuenta], avisos }
}

/**
 * El texto sin números de tarjeta ni de cuenta.
 *
 * Todo esto acaba en «Qué fue», y Farpi promete en `/privacidad` que no guarda
 * números de cuenta ni de tarjeta. Los bancos los meten en el concepto:
 *
 * - La tarjeta enmascarada del Sabadell, «COMPRA TARJ. 5402XXXXXXXX3026
 *   MERCADONA…». En las compras se va también el prefijo, porque lo que se
 *   quiere leer es dónde fue, y en las devoluciones la fecha corta («18.09») que
 *   va detrás del número.
 * - **Cualquier tira de doce dígitos o más**, con o sin guiones o espacios: la
 *   tarjeta entera que el BBVA pone en «Adeudo mensual de tarjeta», la cuenta del
 *   préstamo o la de destino de un traspaso. Doce es más que cualquier otra cosa
 *   que se escribe en un concepto —un teléfono son nueve, una fecha ocho— y menos
 *   que una tarjeta (dieciséis) o una cuenta (veinte).
 */
function sinNumerosPrivados(texto: string): string {
  return texto
    .replace(/^COMPRA TARJ\.?\s*\d{4}X+\d{4}\s*/, '')
    .replace(/\s*\d{4}X+\d{4}(\s+\d{2}\.\d{2})?/g, '')
    .replace(/\d[\d\s-]*\d/g, tira => (tira.replace(/\D/g, '').length >= 12 ? '' : tira))
    .replace(/\s+/g, ' ')
    .trim()
}

/** `DD/MM/AAAA` a `YYYY-MM-DD`, como texto y sin pasar por `Date`. */
function fechaConBarras(texto: string): string | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim())
  return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : null
}

/**
 * La fecha de una celda de Excel: texto con barras, que es como la da el BBVA, o
 * el número de serie de Excel si alguien la guardó como fecha de verdad.
 *
 * El número de serie son días desde el 30-12-1899. Se cuenta en UTC, que no
 * tiene horario de verano, y se lee en UTC: así el día no se mueve, que es lo
 * que la regla de las fechas de esta casa quiere evitar al prohibir `Date`.
 */
function fechaDeCelda(texto: string): string | null {
  const conBarras = fechaConBarras(texto)
  if (conBarras) return conBarras
  if (!/^\d{5}(\.\d+)?$/.test(texto.trim())) return null
  const dia = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(texto)) * 86_400_000)
  return `${dia.getUTCFullYear()}-${String(dia.getUTCMonth() + 1).padStart(2, '0')}-${String(dia.getUTCDate()).padStart(2, '0')}`
}

/**
 * «-26.34» a -2634. Con el punto como decimal, que es como lo escribe el banco,
 * y **sin pasar por `Number` con decimales**: 0.1 + 0.2 no es 0.3, y un céntimo
 * de menos rompería el cuadre del saldo.
 */
function centimos(texto: string): number | null {
  const partes = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(texto.trim())
  if (!partes) return null
  const valor = Number(partes[2]) * 100 + Number((partes[3] ?? '').padEnd(2, '0'))
  return partes[1] ? -valor : valor
}

/**
 * El importe de una celda de Excel, en céntimos.
 *
 * Un número de Excel se guarda como un `double` escrito en texto, y a veces sale
 * con la cola del redondeo binario —«30.629999999999999»—: `centimos` lo
 * rechazaría por tener más de dos decimales, así que aquí se redondea al
 * céntimo, que es exacto para cualquier importe de una casa. Y si la celda es
 * texto con formato español («-1.234,56 €»), se entiende también.
 */
function importeDeCelda(texto: string): number | null {
  let limpio = texto.replace(/[€\s]/g, '')
  if (limpio.includes(',')) limpio = limpio.replace(/\./g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?(e-?\d+)?$/i.test(limpio)) return null
  return Math.round(Number(limpio) * 100)
}

function conSigno(movimiento: MovimientoN43): number {
  return movimiento.kind === 'gasto' ? -movimiento.amountCents : movimiento.amountCents
}
