'use client'

import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { SelectorDeMes } from './SelectorDeMes'
import { formatCents, formatCentsCorto } from '@/lib/finanzas'
import type { Aportacion, CuentaDelMes as Cuenta, FijoDelMes } from '@/lib/budgets'

interface CuentaDelMesProps {
  cuenta: Cuenta
  /**
   * Los fijos **de ese mes**, ya resueltos: la plantilla viva si el mes no ha
   * terminado y la copia congelada si terminó. Son las líneas que hay detrás de
   * los dos totales del desglose, y vienen de la misma `plantilla` que los suma
   * justamente para que no puedan decir cosas distintas.
   */
  fijos: FijoDelMes[]
  nombreDelMes: string
  /** Los meses que ofrece el desplegable, el que se mira y el de hoy. */
  meses: string[]
  mes: string
  mesActual: string
  onElegirMes: (mes: string) => void
  reparto: Aportacion[]
  /** Un mes cerrado del que no se guardó ningún fijo ni partida. */
  copiaVacia: boolean
  /** Si en un mes por venir se ha pedido ver la previsión. */
  previsionAbierta: boolean
  /** Pedirla, o volver a esconderla. Solo se ofrece en un mes por venir. */
  onVerPrevision: () => void
  /** Lleva a «Lo fijo». Solo se ofrece cuando no hay ningún fijo puesto. */
  onPonerFijos: () => void
}

type Tono = 'normal' | 'entra' | 'sale'

/** El color de un importe del desglose. Lo comparten las líneas y sus totales. */
const CLASE_IMPORTE: Record<Tono, string> = {
  normal: 'text-ink',
  entra: 'text-primary-strong',
  sale: 'text-muted',
}

/** Una línea del desglose. El signo va en la etiqueta y en el importe. */
function Linea({ etiqueta, importe, tono = 'normal' }: {
  etiqueta: string
  importe: number
  tono?: Tono
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px]">
      <span className="truncate text-muted">{etiqueta}</span>
      <span className={`flex-shrink-0 font-semibold tabular-nums ${CLASE_IMPORTE[tono]}`}>
        {formatCentsCorto(tono === 'sale' ? -importe : importe)}
      </span>
    </div>
  )
}

/**
 * Lo mismo, pero **se abre**: el total de arriba y, al tocarlo, de qué se compone.
 *
 * Es el patrón de `BudgetBar`, y por la misma razón: un total deja siempre la
 * pregunta de qué hay dentro, y la respuesta tiene que estar donde se pregunta.
 * Las líneas salen de la misma `plantilla` que suma el total, así que suman
 * exactamente lo que dice la cifra de arriba.
 *
 * **No se editan.** Lo que se está viendo son los fijos de ese mes: en uno cerrado
 * son una copia que no se toca, y en el mes en curso son el espejo de la
 * plantilla, que se edita en «Lo fijo». Es la misma regla que hace que una partida
 * de un mes pasado se abra pero no ofrezca editarse.
 *
 * El signo se hereda del total: si «Gastos fijos» va en negativo, sus líneas
 * también, o parecería que se están sumando al revés.
 */
function LineaDeFijos({ etiqueta, importe, tono, fijos }: {
  etiqueta: string
  importe: number
  tono: 'entra' | 'sale'
  fijos: FijoDelMes[]
}) {
  // **Plegado**, que es como entró y como se ha quedado. Estuvo abierto de mano un
  // rato el 04-09-2026 y se volvió atrás el mismo día: con los cuatro recibos y las
  // dos nóminas desplegados, la tarjeta se come media pantalla antes de llegar a las
  // partidas, y lo que la tarjeta tiene que dar de un vistazo es la cifra grande.
  const [abierta, setAbierta] = useState(false)
  const panelId = useId()
  const signo = (centimos: number) => formatCentsCorto(tono === 'sale' ? -centimos : centimos)

  return (
    <div>
      {/* `min-h-6`: es un control y le toca el mínimo de 24 px de la WCAG 2.5.8,
          que `movil.spec.ts` vigila. El `-mx-1 px-1` saca el fondo del hover un
          poco por fuera del texto sin mover la línea de su sitio. */}
      <button
        type="button"
        onClick={() => setAbierta(v => !v)}
        aria-expanded={abierta}
        aria-controls={panelId}
        className="-mx-1 flex min-h-6 w-full items-center justify-between gap-3 rounded-lg px-1 text-left text-[13px] transition-colors hover:bg-canvas active:bg-canvas"
      >
        <span className="flex min-w-0 items-center gap-1 text-muted">
          <span className="truncate">{etiqueta}</span>
          <ChevronDown
            size={12}
            strokeWidth={2.6}
            aria-hidden
            className={`flex-shrink-0 text-faint transition-transform ${abierta ? 'rotate-180' : ''}`}
          />
        </span>
        <span className={`flex-shrink-0 font-semibold tabular-nums ${CLASE_IMPORTE[tono]}`}>
          {signo(importe)}
        </span>
      </button>

      {/* El filete de la izquierda va en `line` y no en `hairline`: sobre blanco,
          el segundo no se ve, y sin nada que las agrupe cuatro recibos seguidos se
          leen al mismo nivel que «Para el mes». */}
      {abierta && (
        <ul id={panelId} className="mb-1 mt-0.5 space-y-1 border-l border-line pl-3">
          {fijos.map(fijo => (
            <li key={fijo.key} className="flex items-baseline gap-2 text-[13px]">
              {fijo.emoji && <span className="flex-shrink-0" aria-hidden>{fijo.emoji}</span>}
              <span className="min-w-0 flex-1 truncate text-muted">{fijo.name}</span>
              <span className="flex-shrink-0 font-semibold tabular-nums text-ink">
                {signo(fijo.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * La cuenta del mes: con cuánto se contaba, qué se ha ido y qué queda.
 *
 * **El número grande es "queda", no "gastado".** Es el cambio que trajo tener
 * ingresos: "llevas 180 de 300 en la compra" es una curiosidad de una categoría;
 * "quedan 758 €" es la pregunta que se hace en una casa a mitad de mes. El
 * desglose va debajo y en pequeño, que es el orden en que se lee —conclusión
 * primero, de dónde sale después— y además el único que cabe en un móvil.
 *
 * **Sin ningún fijo, la tarjeta enseña otra cosa.** "Queda" sería el gasto del
 * mes en negativo, que no significa nada y asusta. En ese caso el número grande
 * sigue siendo lo gastado, como antes de que existieran los fijos, y debajo se
 * ofrece ponerlos: es la única pista de que la cuenta existe.
 *
 * El reparto de abajo es **solo de gastos** y no lleva saldos: dice "Carlos 60 €,
 * María 20 €" y ahí se para. En cuanto una app de casa dice "María te debe 40 €"
 * deja de ser una app de casa.
 *
 * **De dónde salen los fijos se dice cuando no es obvio** (02-09-2026). En el mes
 * en curso sin cerrar no se dice nada: es lo normal y una etiqueta ahí sería ruido
 * en la primera pantalla que se mira. En un mes cerrado se avisa de que las cifras
 * son las de entonces, porque si no, ver un alquiler distinto del de hoy parece un
 * error. Y en un mes que nunca llegó a cerrarse se dice tal cual: la alternativa
 * —enseñar la plantilla de hoy— es justo el error que este cambio vino a quitar.
 *
 * **Un mes que aún no ha llegado sale en cero** (03-09-2026) **mientras esté
 * vacío** (04-09-2026). Hasta el 03-09 enseñaba directamente la previsión —las
 * cifras de la plantilla de hoy— con un aviso debajo, y el aviso no bastaba: una
 * cifra puesta donde el resto de los meses llevan un saldo se lee como un saldo,
 * por mucho que la letra pequeña diga que no lo es. Así que octubre pasó a estar a
 * cero, que es lo que hay en un mes en el que no ha pasado nada, y la previsión se
 * **pide**: un enlace la abre y entonces sí habla en condicional.
 *
 * Desde el 04-09 en octubre **se puede apuntar**, y el cero deja de decidirlo el
 * calendario para decidirlo el contenido: en cuanto hay algo dentro, la cifra
 * grande lo cuenta y dice «apuntado para ese mes». Un cero con trescientos euros
 * apuntados justo debajo sería peor que no dejar apuntarlos.
 *
 * **El mes se elige con las flechas y con el nombre** (04-09-2026), como en el
 * calendario: las flechas para el de al lado, y el nombre se toca y despliega la
 * lista para saltar a junio sin dar tres toques. Hubo una tira de meses unas horas
 * ese mismo día y se fue: resolvía el salto pero se comía una fila entera de una
 * pantalla de 390 px para un control que se toca poco. El detalle, en
 * `SelectorDeMes`.
 *
 * **Y no hay atajo de vuelta al mes de hoy** (03-09-2026). Hubo un «Volver a este
 * mes» debajo del nombre y no se entendía: puesto sobre «Junio 2026» parece que va
 * a hacerle algo a junio, no que sea la puerta de salida, y la palabra «este»
 * señala a dos meses a la vez —el que se mira y el de hoy—. Ya no hace falta: el
 * mes de hoy está en la tira, a un toque como todos.
 *
 * **Los dos totales de fijos se abren** (04-09-2026). «Gastos fijos −935,90 €»
 * dejaba detrás la misma pregunta que dejaba una partida antes de desplegarse
 * —«¿de qué?»— y contestarla obligaba a irse a «Lo fijo», que enseña la plantilla
 * de **hoy**: mirando junio, la respuesta que se encontraba allí era la de otro
 * mes. Ahora las líneas están dentro de su total y salen de la misma plantilla
 * resuelta que lo suma, así que un mes cerrado enseña los recibos que tuvo.
 *
 * Los apuntados no se abren, y no es un olvido: sus líneas son «El día a día», que
 * está entero y con todas las letras en esta misma pantalla, un poco más abajo.
 *
 * **Cerrar el mes no se ofrece aquí.** Estuvo un rato y quedaba mal: esta tarjeta
 * es la conclusión de la pantalla —una cifra grande y su desglose— y colgarle
 * debajo dos acciones la convertía en un panel de mandos. Se fue al pie de «El
 * mes», que es donde se lee como «he terminado con esto» (ver `CierreDelMes`).
 */
export function CuentaDelMes({
  cuenta, fijos, nombreDelMes, meses, mes, mesActual, onElegirMes, reparto,
  copiaVacia, previsionAbierta, onVerPrevision, onPonerFijos,
}: CuentaDelMesProps) {
  const { hayFijos, queda, gastosApuntados, ingresosApuntados } = cuenta
  const enNumerosRojos = hayFijos && queda < 0
  // Ya vienen ordenados de `plantillaDelMes`, primero los que entran: filtrar
  // conserva ese orden, que es el mismo con el que se leen en «Lo fijo».
  const ingresos = fijos.filter(f => f.kind === 'ingreso')
  const gastos = fijos.filter(f => f.kind === 'gasto')
  const porVenir = cuenta.origen === 'por-venir'
  // Un mes por venir al que nadie ha apuntado nada. **Con algo dentro ya no está
  // en cero**, y por eso el cero no se decide por el origen sino por el contenido:
  // enseñar 0 € con trescientos euros apuntados debajo sería peor que no dejar
  // apuntarlos, que es lo que pasaba hasta el 04-09-2026.
  const porVenirVacio = porVenir && gastosApuntados === 0 && ingresosApuntados === 0

  return (
    <section aria-label="Resumen del mes" className="rounded-2xl border border-surface bg-white px-4 py-3 shadow-sm">
      <SelectorDeMes mes={mes} mesActual={mesActual} meses={meses} onElegir={onElegirMes} />

      <div className="text-center">
        <p className={`text-xl font-extrabold leading-tight ${enNumerosRojos ? 'text-danger-strong' : 'text-ink'}`}>
          {/* En rojo se enseña el importe **en positivo**: la etiqueta ya
              dice "de más este mes", y un "−120 € de más" obliga a deshacer
              una doble negación para entender que se han gastado 120 de más. */}
          {formatCents(hayFijos ? Math.abs(queda) : gastosApuntados)}
        </p>
        {/* En un mes que aún no ha llegado se habla en condicional: «queda
            este mes» sobre octubre, leído en septiembre, suena a que octubre
            ya está en marcha. */}
        <p className="text-[13px] text-muted">
          {!hayFijos
            ? porVenirVacio
              ? 'aún no ha empezado'
              : porVenir
                // Ni «gastado este mes» —el mes no ha llegado— ni un cero: es lo
                // que ya sabes que va a salir de ahí.
                ? 'apuntado para ese mes'
                : 'gastado este mes'
            : porVenir
              ? (queda < 0 ? 'de más ese mes' : 'quedaría ese mes')
              : (queda < 0 ? 'de más este mes' : 'queda este mes')}
        </p>
      </div>

      {cuenta.origen !== 'plantilla' && !porVenirVacio && (
        <p className="mt-1 text-center text-[13px] text-faint">
          {cuenta.origen === 'copia'
            ? copiaVacia
              ? 'De este mes no se guardó ningún fijo ni ninguna partida.'
              : 'Mes cerrado: los fijos y las partidas son los que había entonces.'
            : porVenir
              ? previsionAbierta
                ? 'Es lo que quedaría si nada cambia.'
                : 'Lo que ya has apuntado para un mes que no ha llegado.'
              : 'De este mes no se guardó el plan, así que no se puede decir qué quedó.'}
        </p>
      )}

      {/* La previsión se pide. El enlace es la única pista de que se puede
          preguntar «¿cuadra el mes que viene?», y por eso está aquí y no en la
          letra pequeña de más abajo. Dice «las cuentas» y no «qué quedaría»
          (04-09-2026): «queda» ya nombra la cifra grande de esta misma tarjeta, y
          el enlace parecía preguntar por ella. */}
      {porVenir && (
        <button
          type="button"
          onClick={onVerPrevision}
          className="mt-1 min-h-6 w-full py-1 text-center text-[13px] font-semibold text-primary-strong"
        >
          {previsionAbierta ? 'Ocultar las cuentas' : `Ver las cuentas de ${nombreDelMes.split(' ')[0].toLowerCase()}`}
        </button>
      )}

      {/* Un `div` y no la `dl` que fue hasta el 04-09-2026: desde que las dos
          líneas de fijos se abren, la fila entera es el botón, y un `button` no
          cabe entre un `dt` y un `dd` sin romper el modelo de contenido de una
          lista de definiciones. La alternativa —hacer botón solo la etiqueta—
          dejaba media fila muerta para el dedo. */}
      {hayFijos ? (
        <div className="mt-3 space-y-1 border-t border-hairline pt-2.5">
          {/* Un tipo sin ninguna línea no se hace desplegable: se abriría vacío. */}
          {ingresos.length > 0 ? (
            <LineaDeFijos etiqueta="Ingresos fijos" importe={cuenta.ingresosFijos} tono="entra" fijos={ingresos} />
          ) : (
            <Linea etiqueta="Ingresos fijos" importe={cuenta.ingresosFijos} tono="entra" />
          )}
          {gastos.length > 0 ? (
            <LineaDeFijos etiqueta="Gastos fijos" importe={cuenta.gastosFijos} tono="sale" fijos={gastos} />
          ) : (
            <Linea etiqueta="Gastos fijos" importe={cuenta.gastosFijos} tono="sale" />
          )}
          <div className="flex items-baseline justify-between gap-3 border-t border-hairline pt-1 text-[13px]">
            <span className="truncate font-semibold text-muted">Para el mes</span>
            <span className="flex-shrink-0 font-bold tabular-nums text-ink">{formatCentsCorto(cuenta.paraElMes)}</span>
          </div>
          {ingresosApuntados > 0 && (
            <Linea etiqueta="Ingresos apuntados" importe={ingresosApuntados} tono="entra" />
          )}
          <Linea etiqueta="Gastos apuntados" importe={gastosApuntados} tono="sale" />
        </div>
      ) : cuenta.origen === 'plantilla' ? (
        <button
          type="button"
          onClick={onPonerFijos}
          className="mt-2 min-h-6 w-full border-t border-hairline pt-2.5 text-left text-[13px] text-muted"
        >
          Pon tus ingresos y gastos de todos los meses en{' '}
          <span className="font-semibold text-primary-strong">Lo fijo</span> y aquí
          verás cuánto queda.
        </button>
      ) : null}

      {/* Quién ha puesto el dinero. Una línea de nombres con su color y su
          parte, y nada más: ni saldos ni "te debe". */}
      {reparto.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-hairline pt-2.5">
          {reparto.map(a => (
            <li key={a.key} className="flex items-center gap-1.5 text-[13px] text-muted">
              {a.color && (
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} aria-hidden />
              )}
              <span>{a.nombre}</span>
              <span className="font-bold text-ink">{formatCentsCorto(a.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
