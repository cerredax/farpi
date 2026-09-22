import { formatCents } from './finanzas'
import { huellaDeMovimiento, ordenEnSuDia, type CuentaN43, type ExtractoN43, type MovimientoN43 } from './n43'
import { capitalize, normalizaParaBuscar } from './text'
import type { FijoDelMes } from './budgets'
import type { Budget, Expense } from '@/types'

/**
 * Qué del extracto es un apunte de la casa y qué no.
 *
 * **El problema entero está aquí y no en leer el fichero.** La cuenta del mes es
 * `(ingresos fijos − gastos fijos) + ingresos apuntados − gastos apuntados`, y un
 * extracto trae las dos mitades revueltas: la nómina y el alquiler, que ya están
 * en la plantilla, y la compra del martes, que no. Apuntarlo todo cuenta dos
 * veces lo que ya estaba y deja «queda» a miles de euros de la verdad.
 *
 * Así que esto **no importa nada**: prepara una lista donde cada fila viene ya
 * marcada o sin marcar, con el motivo escrito en castellano, y quien revisa
 * decide. Las tres razones para no marcar una fila son las tres formas que hay
 * de contar dos veces el mismo dinero:
 *
 * - **Ya apuntado**: vino en otra importación, o alguien lo tecleó a mano.
 * - **Cubierto por un fijo**: el recibo de la luz que ya está en la plantilla.
 * - **Traspaso**: mover dinero de una cuenta tuya a otra tuya no es un gasto, y
 *   en un extracto de dos cuentas sale dos veces, una por cada lado.
 *
 * Ninguna de las tres desaparece de la lista: se ven, con su explicación, porque
 * repasar que la luz de este mes fueron 34,12 € es la mitad de para qué se abre
 * esta pantalla. Lo que no hacen es entrar solas.
 */

/** Por qué una fila no viene marcada. `null` es «esto es un apunte normal». */
export type MotivoDeFila = 'ya-apuntado' | 'cubierto-por-fijo' | 'traspaso'

export interface FilaDeRevision {
  /** Lo que identifica al movimiento para no volver a apuntarlo otro mes. */
  huella: string
  movimiento: MovimientoN43
  /** La cuenta de la que salió, para cuando el fichero trae más de una. */
  cuenta: string
  /** Si entra al confirmar. Quien revisa puede cambiarlo en cualquier fila. */
  marcada: boolean
  motivo: MotivoDeFila | null
  /** La línea que explica el motivo. `null` cuando la fila viene marcada. */
  explicacion: string | null
  /** Lo que se escribiría en «Qué fue», ya en cristiano y no a gritos. */
  descripcion: string
  /** La partida que se propone, si alguna se reconoce por el nombre. */
  budgetId: string | null
}

export interface ContextoDeRevision {
  /** Lo que ya está apuntado en la familia. Se mira la fecha y el importe. */
  apuntes: Expense[]
  /** Las huellas de lo que entró en importaciones anteriores. */
  huellasApuntadas?: Set<string>
  /** Los fijos **del mes que se está importando**, ya resueltos con su ajuste. */
  fijos: FijoDelMes[]
  /** Las partidas, para proponer una cuando el concepto la nombra. */
  partidas: Budget[]
}

/**
 * Conceptos comunes de la AEB que se pagan solos todos los meses, que son los
 * únicos que pueden estar cubiertos por un fijo: recibos domiciliados (03),
 * transferencias y traspasos (04, que es como se paga un alquiler), cuotas de
 * préstamo (05) y nóminas (15).
 *
 * Una compra con tarjeta o un reintegro de cajero nunca es un fijo, por mucho
 * que el importe se parezca, y sin esta lista un gasto de 120 € en el súper se
 * confundiría con la limpieza de 120 € y entraría desmarcado sin motivo real.
 */
const CONCEPTOS_DOMICILIABLES = new Set(['03', '04', '05', '15'])

/**
 * Cuánto se puede desviar un movimiento de su fijo y seguir siendo el mismo: el
 * 10 %, o cinco euros si el fijo es pequeño.
 *
 * No es cero porque los fijos que de verdad se domicilian son justo los que
 * bailan —la luz, el agua, el teléfono—, y un alquiler clavado también entra en
 * el margen. Y no es más ancho porque cada euro de margen de más es un gasto de
 * verdad que se queda fuera sin que nadie lo note.
 */
function margenDe(fijoCents: number): number {
  return Math.max(500, Math.round(fijoCents * 0.1))
}

/** Los días que pueden pasar entre las dos caras de un traspaso. */
const DIAS_DE_TRASPASO = 3

export function revisarExtracto(extracto: ExtractoN43, contexto: ContextoDeRevision): FilaDeRevision[] {
  const espejos = traspasosEntreCuentas(extracto.cuentas)
  // Los apuntes que ya ha tapado una fila. **Un apunte tapa a uno y no a los que
  // se le parezcan**: si el extracto trae dos bizums de 40 € del mismo día y en
  // casa se apuntó uno, el otro es dinero que entró de verdad y tiene que llegar
  // marcado. Es el mismo emparejamiento de uno en uno que hacen los traspasos.
  const gastados = new Set<string>()

  return extracto.cuentas.flatMap(cuenta => {
    const ordenes = ordenEnSuDia(cuenta.movimientos)

    return cuenta.movimientos.map((movimiento, indice) => {
      const huella = huellaDeMovimiento(cuenta.cuenta, movimiento, ordenes[indice])
      const descripcion = comoSeApunta(movimiento.concepto)
      const fila = {
        huella,
        movimiento,
        cuenta: cuenta.cuenta,
        descripcion,
        // Un ingreso no lleva partida nunca: la base lo rechaza
        // (`expenses_ingreso_sin_tope`), no solo el formulario.
        budgetId: movimiento.kind === 'gasto' ? partidaQueSuena(movimiento, contexto.partidas) : null,
      }

      // El orden de las tres razones es el de lo seguro a lo deducido, y manda la
      // primera: si un movimiento ya está apuntado, da igual que además parezca
      // un fijo, porque lo que hay que decir es que ya está.
      if (contexto.huellasApuntadas?.has(huella)) {
        return { ...fila, marcada: false, motivo: 'ya-apuntado' as const, explicacion: 'Ya se apuntó en una importación anterior' }
      }

      const aMano = apunteQueYaEsta(movimiento, contexto.apuntes, gastados)
      if (aMano) {
        gastados.add(aMano.id)
        return { ...fila, marcada: false, motivo: 'ya-apuntado' as const, explicacion: `Ya hay un apunte de ese día por ${formatCents(movimiento.amountCents)}${aMano.description ? `: «${aMano.description}»` : ''}` }
      }

      if (espejos.has(huella)) {
        return { ...fila, marcada: false, motivo: 'traspaso' as const, explicacion: 'Parece dinero movido entre dos cuentas tuyas, no un gasto' }
      }

      const fijo = fijoQueLoCubre(movimiento, contexto.fijos)
      if (fijo) {
        return { ...fila, marcada: false, motivo: 'cubierto-por-fijo' as const, explicacion: `Esto suele estar en «${fijo.name}» (${formatCents(fijo.amountCents)})` }
      }

      return { ...fila, marcada: true, motivo: null, explicacion: null }
    })
  })
}

/**
 * Las dos caras de un traspaso, por sus huellas.
 *
 * Se busca el espejo: el mismo importe con el signo cambiado, en **otra** cuenta
 * del mismo fichero y con pocos días de diferencia, porque el cargo y el abono
 * no siempre caen el mismo día. Con una sola cuenta en el extracto no se detecta
 * ninguno, y así tiene que ser: mandar dinero a una cuenta que no sale en el
 * fichero es indistinguible de pagar a alguien, y aquí no se adivina.
 *
 * **Se emparejan de uno en uno.** Sin eso, tres traspasos iguales de 200 € entre
 * las mismas dos cuentas se taparían unos a otros y saldrían seis filas
 * desmarcadas cuando solo había tres idas y tres vueltas.
 */
function traspasosEntreCuentas(cuentas: CuentaN43[]): Set<string> {
  const espejos = new Set<string>()
  if (cuentas.length < 2) return espejos

  const todos = cuentas.flatMap(cuenta => {
    const ordenes = ordenEnSuDia(cuenta.movimientos)
    return cuenta.movimientos.map((movimiento, indice) => ({
      cuenta: cuenta.cuenta,
      movimiento,
      huella: huellaDeMovimiento(cuenta.cuenta, movimiento, ordenes[indice]),
    }))
  })

  for (const salida of todos.filter(m => m.movimiento.kind === 'gasto')) {
    if (espejos.has(salida.huella)) continue

    const entrada = todos.find(otro =>
      otro.movimiento.kind === 'ingreso'
      && otro.cuenta !== salida.cuenta
      && !espejos.has(otro.huella)
      && otro.movimiento.amountCents === salida.movimiento.amountCents
      && diasEntre(otro.movimiento.fecha, salida.movimiento.fecha) <= DIAS_DE_TRASPASO)

    if (entrada) {
      espejos.add(salida.huella)
      espejos.add(entrada.huella)
    }
  }

  return espejos
}

/**
 * El apunte que ya está por ese importe y ese día, si lo hay.
 *
 * Es el caso de la casa que teclea la compra al salir del súper y dos semanas
 * después importa el mes: el mismo gasto, uno escrito a mano y otro del banco.
 * Se compara por día e importe exactos y nada más, porque el texto no se parece
 * en nada («Compra» contra «COMPRA TARJ. 5412»).
 *
 * Puede equivocarse —dos cafés de 1,50 € el mismo día— y por eso no borra nada:
 * deja la fila sin marcar diciendo cuál es el apunte que ya estaba, que es
 * exactamente lo que hace falta para decidir en un vistazo.
 *
 * `gastados` lleva los que ya ha tapado otra fila, y es lo que hace que un apunte
 * no valga por dos: con dos ingresos iguales en el extracto y uno solo apuntado,
 * el segundo entra.
 */
function apunteQueYaEsta(movimiento: MovimientoN43, apuntes: Expense[], gastados: Set<string>): Expense | null {
  return apuntes.find(apunte =>
    !gastados.has(apunte.id)
    && apunte.date === movimiento.fecha
    && apunte.kind === movimiento.kind
    && apunte.amount_cents === movimiento.amountCents) ?? null
}

/** El fijo del mes que explica este movimiento, si alguno lo hace. */
function fijoQueLoCubre(movimiento: MovimientoN43, fijos: FijoDelMes[]): FijoDelMes | null {
  if (!CONCEPTOS_DOMICILIABLES.has(movimiento.conceptoComun)) return null

  return fijos.find(fijo =>
    fijo.kind === movimiento.kind
    && Math.abs(fijo.amountCents - movimiento.amountCents) <= margenDe(fijo.amountCents)) ?? null
}

/**
 * La partida que el concepto nombra, si lo hace.
 *
 * Es deliberadamente tonta: mira si el texto del banco contiene el nombre de una
 * partida («Farmacia», «Gasolina»), sin tildes ni mayúsculas. No acierta con
 * «MERCADONA» para la partida «Compra» —para eso harían falta reglas guardadas,
 * que son otra cosa y van después—, pero lo que acierta lo acierta sin que nadie
 * haya configurado nada, y lo que no, se elige en la fila como en cualquier
 * apunte.
 */
function partidaQueSuena(movimiento: MovimientoN43, partidas: Budget[]): string | null {
  const concepto = normalizaParaBuscar(movimiento.concepto)
  // La más larga primero: con «Comida» y «Comida del cole», gana la que dice más.
  const ordenadas = [...partidas].sort((a, b) => b.name.length - a.name.length)
  return ordenadas.find(partida => {
    const nombre = normalizaParaBuscar(partida.name).trim()
    return nombre.length >= 4 && concepto.includes(nombre)
  })?.id ?? null
}

/**
 * El concepto del banco, escrito como se escribe en esta casa.
 *
 * Los bancos mandan «RECIBO IBERDROLA CLIENTES SAU» en mayúsculas, y una lista
 * de cuarenta filas a gritos no se lee. Se baja a minúsculas con la primera en
 * alta, que es una frase normal, y se recorta lo que no cabe: la columna de
 * «Qué fue» tiene el ancho de un móvil y el final de esos textos es siempre
 * relleno del banco.
 */
export function comoSeApunta(concepto: string): string {
  const limpio = concepto.replace(/\s+/g, ' ').trim()
  if (!limpio) return ''
  // Un texto que ya viene en minúsculas o mezclado se respeta: lo escribió
  // alguien y no la máquina.
  const frase = limpio === limpio.toUpperCase() ? limpio.toLowerCase() : limpio
  return recortar(capitalize(frase), 60)
}

function recortar(texto: string, tope: number): string {
  if (texto.length <= tope) return texto
  const corte = texto.lastIndexOf(' ', tope)
  return `${texto.slice(0, corte > tope / 2 ? corte : tope).trimEnd()}…`
}

/** Días entre dos fechas `YYYY-MM-DD`, en valor absoluto y sin pasar por `Date`. */
function diasEntre(a: string, b: string): number {
  const dia = (fecha: string) => Date.UTC(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)) - 1, Number(fecha.slice(8, 10)))
  return Math.abs(dia(a) - dia(b)) / 86_400_000
}

/** Lo que se va a apuntar de verdad: las filas marcadas, en el orden del banco. */
export function loQueEntra(filas: FilaDeRevision[]): FilaDeRevision[] {
  return filas.filter(fila => fila.marcada)
}

/**
 * El recuento para el pie de la pantalla: cuántas entran y cuántas no, y por qué.
 *
 * Va aparte de la lista porque es lo que se lee antes de confirmar —«entran 34 de
 * 112»— y porque contarlo en la pantalla obligaría a recorrer las filas dentro
 * del render cada vez que se marca una casilla.
 */
export function resumenDeRevision(filas: FilaDeRevision[]) {
  const por = (motivo: MotivoDeFila) => filas.filter(fila => fila.motivo === motivo).length
  return {
    total: filas.length,
    entran: filas.filter(fila => fila.marcada).length,
    yaApuntados: por('ya-apuntado'),
    cubiertosPorFijo: por('cubierto-por-fijo'),
    traspasos: por('traspaso'),
  }
}
