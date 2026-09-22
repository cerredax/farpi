import type { MovementKind } from '@/types'

/**
 * El extracto del banco, leído del fichero que dan todos.
 *
 * **Por qué la Norma 43 y no el CSV de cada banco.** El cuaderno 43 de la AEB
 * (junio de 2012, circular 1767) lo genera igual BBVA, CaixaBank, Santander o
 * Sabadell: registros de 80 caracteres y campos en posiciones fijas. El CSV, en
 * cambio, es distinto en cada entidad y cambia sin avisar cuando rediseñan la
 * web. Un solo formato, escrito una vez y que no se mueve, frente a uno por
 * banco que hay que perseguir.
 *
 * **Esto no apunta nada.** Lee el fichero y devuelve lo que pone, nada más: qué
 * entra en Finanzas lo decide quien revisa, porque un extracto trae la nómina y
 * el alquiler —que ya están en los fijos— y los traspasos entre cuentas propias,
 * que no son ni gasto ni ingreso de la casa. Si esto apuntara solo, la cuenta
 * del mes contaría dos veces lo que ya estaba en la plantilla.
 *
 * **El fichero se cuadra consigo mismo.** El registro final de cada cuenta trae
 * cuántos apuntes hay de cada signo, cuánto suman y el saldo final. Se comprueba
 * todo, y lo que no cuadre sale en `avisos` para que la pantalla lo diga en vez
 * de importar un extracto al que le falta la mitad: un campo leído una posición
 * más allá no da error, da cifras creíbles y equivocadas.
 */

/** Longitud de un registro de la norma. Los cortos se toleran; los largos, no. */
const ANCHO = 80

/**
 * Los conceptos comunes del anexo 2, que son los mismos en todas las entidades.
 *
 * Están porque el registro de movimiento **no trae texto**: el «concepto» de
 * verdad viene en los registros complementarios, que son opcionales y que algún
 * banco no manda. Sin ellos, la fila diría solo una fecha y un importe; con
 * esto, al menos dice «Recibo domiciliado».
 *
 * Y sirven para una segunda cosa, que es la que hace falta al revisar: los
 * recibos domiciliados (03) y las nóminas (15) son justo lo que ya suele estar
 * en los fijos, y los traspasos (04) lo que no es ni gasto ni ingreso. Quien
 * revise puede empezar por ahí.
 */
export const CONCEPTOS_COMUNES: Record<string, string> = {
  '01': 'Reintegro',
  '02': 'Ingreso',
  '03': 'Recibo domiciliado',
  '04': 'Transferencia o traspaso',
  '05': 'Cuota de préstamo',
  '06': 'Remesa de efectos',
  '07': 'Suscripciones',
  '08': 'Dividendos o cupones',
  '09': 'Compraventa de valores',
  '10': 'Cheque gasolina',
  '11': 'Cajero automático',
  '12': 'Tarjeta',
  '13': 'Operación en el extranjero',
  '14': 'Devolución',
  '15': 'Nómina o Seguridad Social',
  '16': 'Timbres o corretaje',
  '17': 'Intereses, comisiones o gastos',
  '98': 'Corrección de asiento',
  '99': 'Varios',
}

/** El euro, en la tabla de divisas del anexo 2. Lo demás no se sabe convertir. */
const DIVISA_EURO = '978'

export interface MovimientoN43 {
  /** Fecha de la operación, `YYYY-MM-DD`. La que se ve en el banco. */
  fecha: string
  /** Fecha de valor. La guarda porque a veces es la que explica un descuadre. */
  fechaValor: string
  /** En céntimos y **siempre positivo**: el signo lo dice `kind`, como `expenses`. */
  amountCents: number
  /** Lo que sale es gasto y lo que entra es ingreso, que es como se apunta aquí. */
  kind: MovementKind
  /** Lo que se puede leer: los complementarios si vienen, y si no el concepto común. */
  concepto: string
  /** La clave del anexo 2, en crudo, para agrupar y para las reglas de quien revisa. */
  conceptoComun: string
  /**
   * Lo que el banco da para señalar este apunte y ningún otro: número de
   * documento y las dos referencias, ya juntas. Puede venir vacío.
   */
  referencia: string
}

export interface CuentaN43 {
  /**
   * Los dieciocho dígitos del registro de cabecera: entidad, oficina y número.
   * **No sale de aquí**: la pantalla no lo enseña y la huella que se guarda solo
   * se queda con los cuatro últimos.
   */
  cuenta: string
  /** Solo la entidad, que es lo que la pantalla puede enseñar sin cantar el número. */
  entidad: string
  /** A nombre de quién, abreviado, tal y como lo escribe el banco. */
  titular: string
  /** El período del extracto, `YYYY-MM-DD` las dos. */
  desde: string
  hasta: string
  /** Saldo al empezar, **con signo**: negativo si la cuenta estaba en números rojos. */
  saldoInicialCents: number
  /** Saldo al terminar. `null` si el fichero se cortó sin registro final. */
  saldoFinalCents: number | null
  movimientos: MovimientoN43[]
}

export interface ExtractoN43 {
  cuentas: CuentaN43[]
  /**
   * Lo que no cuadró, en castellano y para enseñar. **Vacío es lo normal**: si
   * hay algo aquí, el extracto no se importa entero sin que alguien lo mire.
   */
  avisos: string[]
}

export type LecturaN43 =
  | { ok: true; extracto: ExtractoN43 }
  | { ok: false; error: string }

/**
 * Lee el fichero entero.
 *
 * Recibe **texto ya decodificado**, no bytes: los N43 vienen en ISO-8859-1 y
 * quien abre el archivo es quien sabe con qué codificación leerlo. Aquí solo se
 * parte en líneas, y da igual si el fichero trae saltos de Windows o de Unix.
 */
export function leerN43(contenido: string): LecturaN43 {
  const lineas = contenido
    .split(/\r?\n/)
    .filter(linea => linea.trim() !== '')

  if (lineas.length === 0) return { ok: false, error: 'El archivo está vacío' }

  const cuentas: CuentaN43[] = []
  const avisos: string[] = []
  let abierta: CuentaN43 | null = null

  for (const [indice, cruda] of lineas.entries()) {
    const numero = indice + 1
    if (cruda.length > ANCHO) {
      return { ok: false, error: `La línea ${numero} mide ${cruda.length} caracteres y la norma son ${ANCHO}: esto no parece un fichero de la Norma 43` }
    }
    // Las líneas cortas se rellenan en vez de rechazarse: hay bancos que no
    // completan con espacios hasta la posición 80 y el fichero es válido igual.
    const linea = cruda.padEnd(ANCHO, ' ')
    const tipo = campo(linea, 1, 2)

    switch (tipo) {
      case '11': {
        if (abierta) cuentas.push(abierta)
        const divisa = campo(linea, 48, 50)
        if (divisa !== DIVISA_EURO) {
          avisos.push(`Hay una cuenta que no va en euros (divisa ${divisa}) y Farpi solo lleva euros`)
        }
        abierta = {
          cuenta: campo(linea, 3, 20),
          entidad: campo(linea, 3, 6),
          titular: campo(linea, 52, 77),
          desde: fecha(campo(linea, 21, 26)),
          hasta: fecha(campo(linea, 27, 32)),
          saldoInicialCents: conSigno(campo(linea, 33, 33), importe(campo(linea, 34, 47))),
          saldoFinalCents: null,
          movimientos: [],
        }
        break
      }

      case '22': {
        if (!abierta) {
          return { ok: false, error: `La línea ${numero} es un movimiento que no cuelga de ninguna cuenta` }
        }
        const conceptoComun = campo(linea, 23, 24)
        abierta.movimientos.push({
          fecha: fecha(campo(linea, 11, 16)),
          fechaValor: fecha(campo(linea, 17, 22)),
          amountCents: importe(campo(linea, 29, 42)),
          // 1 es apunte al debe —sale de la cuenta— y 2 al haber. Es la misma
          // clave que el saldo, pero aquí no se guarda con signo: `expenses`
          // rechaza los negativos a propósito y el signo vive en `kind`.
          kind: campo(linea, 28, 28) === '2' ? 'ingreso' : 'gasto',
          concepto: CONCEPTOS_COMUNES[conceptoComun] ?? 'Movimiento',
          conceptoComun,
          referencia: `${campo(linea, 43, 52)} ${campo(linea, 53, 64)} ${campo(linea, 65, 80)}`.trim(),
        })
        break
      }

      case '23': {
        const movimiento = abierta?.movimientos.at(-1)
        if (!movimiento) {
          return { ok: false, error: `La línea ${numero} amplía un concepto y no hay ningún movimiento delante` }
        }
        // Los dos trozos de 38 del complementario son un texto partido por la
        // mitad, no dos datos: van seguidos. **Y se juntan en crudo**, sin
        // recortar cada uno por su lado: el corte cae donde cae, y si toca en un
        // espacio —«…CON UN| NOMBRE…»— recortar antes de juntar pega las dos
        // palabras. Los espacios sobrantes los quita `limpiar` después, cuando ya
        // no hay ninguna frontera que respetar.
        const texto = limpiar(`${crudo(linea, 5, 42)}${crudo(linea, 43, 80)}`)
        if (texto) {
          const puesto = movimiento.concepto === CONCEPTOS_COMUNES[movimiento.conceptoComun]
          movimiento.concepto = puesto ? texto : `${movimiento.concepto} ${texto}`
        }
        break
      }

      case '33': {
        if (!abierta) {
          return { ok: false, error: `La línea ${numero} cierra una cuenta que no estaba abierta` }
        }
        abierta.saldoFinalCents = conSigno(campo(linea, 59, 59), importe(campo(linea, 60, 73)))
        avisos.push(...cuadrar(abierta, {
          apuntesDebe: Number(campo(linea, 21, 25)),
          totalDebe: importe(campo(linea, 26, 39)),
          apuntesHaber: Number(campo(linea, 40, 44)),
          totalHaber: importe(campo(linea, 45, 58)),
        }))
        cuentas.push(abierta)
        abierta = null
        break
      }

      // El complementario de equivalencia de importe (24) trae el importe en la
      // divisa de origen. Se ignora a posta: la cuenta es en euros y lo que se
      // apunta son los euros que se fueron. Y el 88 es el fin del fichero.
      case '24':
      case '88':
        break

      default:
        return { ok: false, error: `La línea ${numero} empieza por "${tipo}", que no es un registro de la Norma 43` }
    }
  }

  // Una cuenta sin su registro final no es un error: hay ficheros cortados por
  // la mitad y sus movimientos valen. Pero no se ha podido cuadrar, y eso se dice.
  if (abierta) {
    avisos.push(`El extracto de la cuenta terminada en ${abierta.cuenta.slice(-4)} se corta sin su saldo final, así que no se ha podido comprobar que estén todos los movimientos`)
    cuentas.push(abierta)
  }

  if (cuentas.length === 0) {
    return { ok: false, error: 'El archivo no trae ninguna cuenta' }
  }

  return { ok: true, extracto: { cuentas, avisos } }
}

/**
 * Lo que dice el fichero de sí mismo, contra lo que se ha leído.
 *
 * **Es la comprobación que hace que esto se pueda usar.** Un parser de campos
 * en posiciones fijas no falla con un error: falla desplazando una posición y
 * devolviendo importes que parecen buenos. El registro final trae los recuentos
 * y las sumas de cada signo, y el saldo final tiene que salir de sumar los
 * movimientos al inicial. Si las cuatro cosas cuadran, lo leído es lo que hay.
 */
function cuadrar(
  cuenta: CuentaN43,
  final: { apuntesDebe: number; totalDebe: number; apuntesHaber: number; totalHaber: number },
): string[] {
  const avisos: string[] = []
  const cola = cuenta.cuenta.slice(-4)

  const gastos = cuenta.movimientos.filter(m => m.kind === 'gasto')
  const ingresos = cuenta.movimientos.filter(m => m.kind === 'ingreso')
  const suma = (movimientos: MovimientoN43[]) => movimientos.reduce((total, m) => total + m.amountCents, 0)

  if (gastos.length !== final.apuntesDebe || ingresos.length !== final.apuntesHaber) {
    avisos.push(`En la cuenta terminada en ${cola} el banco dice que hay ${final.apuntesDebe + final.apuntesHaber} movimientos y se han leído ${cuenta.movimientos.length}`)
  }
  if (suma(gastos) !== final.totalDebe || suma(ingresos) !== final.totalHaber) {
    avisos.push(`En la cuenta terminada en ${cola} las sumas no coinciden con las del banco`)
  }

  const esperado = cuenta.saldoInicialCents + suma(ingresos) - suma(gastos)
  if (cuenta.saldoFinalCents !== null && esperado !== cuenta.saldoFinalCents) {
    avisos.push(`En la cuenta terminada en ${cola} el saldo final no sale de sumar los movimientos al inicial`)
  }

  return avisos
}

/**
 * La huella de un movimiento, para no apuntarlo dos veces.
 *
 * Hace falta porque nadie descarga rangos de fechas que encajen: se pide «del 1
 * al 30» y al mes siguiente «del 25 al 25», y los cinco días de en medio llegan
 * repetidos. La norma **no da un identificador único** —el número de documento
 * y las referencias son opcionales y hay bancos que los dejan a ceros—, así que
 * la huella se compone de lo que siempre hay.
 *
 * Y por eso lleva `orden`, la posición del movimiento dentro de su día: dos
 * cafés de 1,50 € el mismo martes son dos apuntes distintos con todo lo demás
 * idéntico, y sin esto el segundo se tomaría por un duplicado del primero.
 *
 * **De la cuenta solo entran los cuatro últimos dígitos**, y eso no es un
 * detalle: la huella se guarda en `expenses.import_ref`, y Farpi promete —en
 * `docs/architecture.md` y en `/privacidad`— que no guarda números de cuenta. Con
 * cuatro dígitos basta para lo que hace falta aquí, que es distinguir dos cuentas
 * de la misma casa; es además cómo nombra el banco una cuenta en cualquier
 * pantalla. Si dos cuentas terminaran igual, lo peor que pasa es que un
 * movimiento llegue desmarcado por parecerse a otro, no que se pierda nada.
 */
export function huellaDeMovimiento(cuenta: string, movimiento: MovimientoN43, orden: number): string {
  const propio = movimiento.referencia.replace(/[\s0]/g, '')
  return [
    cuenta.slice(-4),
    movimiento.fecha,
    movimiento.kind,
    movimiento.amountCents,
    // Con referencia de verdad, la huella es estable aunque el movimiento cambie
    // de sitio en el fichero; sin ella, el orden del día es lo único que queda.
    propio ? movimiento.referencia.replace(/\s+/g, ' ') : `#${orden}`,
  ].join('|')
}

/** Numera los movimientos de un día, que es lo que pide `huellaDeMovimiento`. */
export function ordenEnSuDia(movimientos: MovimientoN43[]): number[] {
  const vistos = new Map<string, number>()
  return movimientos.map(m => {
    const cuantos = (vistos.get(m.fecha) ?? 0) + 1
    vistos.set(m.fecha, cuantos)
    return cuantos
  })
}

/** Un campo por sus posiciones de la norma, que se cuentan **desde 1**. */
function campo(linea: string, desde: number, hasta: number): string {
  return crudo(linea, desde, hasta).trim()
}

/** Lo mismo pero con su relleno, para los campos que son mitades de un texto. */
function crudo(linea: string, desde: number, hasta: number): string {
  return linea.slice(desde - 1, hasta)
}

/** Catorce dígitos con dos decimales que no se escriben: eso ya son céntimos. */
function importe(crudo: string): number {
  const digitos = crudo.replace(/\D/g, '')
  return digitos ? Number(digitos) : 0
}

/** La clave de signo de la norma: 1 es deudor y 2 acreedor. */
function conSigno(clave: string, centimos: number): number {
  return clave === '1' ? -centimos : centimos
}

/**
 * `AAMMDD` a `YYYY-MM-DD`.
 *
 * El año va en dos cifras y la norma no dice de qué siglo. El corte en 80 es el
 * de siempre y aquí sobra de largo: un extracto que se importa en una app
 * familiar es de este mes o del pasado, no de 1994.
 *
 * Se arma como texto y no con `Date` a propósito, que es la regla de las fechas
 * de esta casa: pasar por `Date` y volver mueve el día según la zona horaria.
 */
function fecha(crudo: string): string {
  if (!/^\d{6}$/.test(crudo)) return ''
  const aa = Number(crudo.slice(0, 2))
  const siglo = aa < 80 ? 2000 : 1900
  return `${siglo + aa}-${crudo.slice(2, 4)}-${crudo.slice(4, 6)}`
}

/** Los bancos rellenan con espacios y parten palabras: se deja un texto legible. */
function limpiar(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim()
}
