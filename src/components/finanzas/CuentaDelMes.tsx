'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCents, formatCentsCorto } from '@/lib/finanzas'
import type { Aportacion, CuentaDelMes as Cuenta } from '@/lib/budgets'

interface CuentaDelMesProps {
  cuenta: Cuenta
  nombreDelMes: string
  esMesActual: boolean
  onAnterior: () => void
  onSiguiente: () => void
  onVolverAHoy: () => void
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

/** Una línea del desglose. El signo va en la etiqueta y en el importe. */
function Linea({ etiqueta, importe, tono = 'normal' }: {
  etiqueta: string
  importe: number
  tono?: 'normal' | 'entra' | 'sale'
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[11px]">
      <dt className="truncate text-muted">{etiqueta}</dt>
      <dd className={`flex-shrink-0 font-semibold tabular-nums ${
        tono === 'entra' ? 'text-primary-strong' : tono === 'sale' ? 'text-muted' : 'text-ink'
      }`}>
        {formatCentsCorto(tono === 'sale' ? -importe : importe)}
      </dd>
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
 * **Un mes que aún no ha llegado sale en cero** (03-09-2026). Hasta ese día
 * enseñaba directamente la previsión —las cifras de la plantilla de hoy— con un
 * aviso debajo, y el aviso no bastaba: una cifra puesta donde el resto de los
 * meses llevan un saldo se lee como un saldo, por mucho que la letra pequeña diga
 * que no lo es. Ahora octubre está a cero, que es lo que hay en un mes en el que
 * no ha pasado nada, y la previsión se **pide**: un enlace la abre y entonces sí
 * habla en condicional. Sigue habiendo respuesta a «¿cuadra el mes que viene?»,
 * pero hay que preguntarla.
 *
 * **Cerrar el mes no se ofrece aquí.** Estuvo un rato y quedaba mal: esta tarjeta
 * es la conclusión de la pantalla —una cifra grande y su desglose— y colgarle
 * debajo dos acciones la convertía en un panel de mandos. Se fue al pie de «El
 * mes», que es donde se lee como «he terminado con esto» (ver `CierreDelMes`).
 */
export function CuentaDelMes({
  cuenta, nombreDelMes, esMesActual, onAnterior, onSiguiente, onVolverAHoy, reparto,
  copiaVacia, previsionAbierta, onVerPrevision, onPonerFijos,
}: CuentaDelMesProps) {
  const { hayFijos, queda, gastosApuntados, ingresosApuntados } = cuenta
  const enNumerosRojos = hayFijos && queda < 0
  // Un mes por venir sin previsión: no hay fijos que enseñar, pero tampoco es el
  // caso de «no has puesto fijos» —que ofrece ponerlos—, así que se separa.
  const porVenirEnCero = cuenta.origen === 'por-venir' && !previsionAbierta

  return (
    <section aria-label="Resumen del mes" className="rounded-2xl border border-surface bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onAnterior}
          aria-label="Mes anterior"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-canvas"
        >
          <ChevronLeft size={18} strokeWidth={2.4} />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xs font-bold uppercase tracking-widest text-muted">{nombreDelMes}</p>
          <p className={`text-xl font-extrabold leading-tight ${enNumerosRojos ? 'text-danger-strong' : 'text-ink'}`}>
            {/* En rojo se enseña el importe **en positivo**: la etiqueta ya
                dice "de más este mes", y un "−120 € de más" obliga a deshacer
                una doble negación para entender que se han gastado 120 de más. */}
            {formatCents(hayFijos ? Math.abs(queda) : cuenta.origen === 'por-venir' ? 0 : gastosApuntados)}
          </p>
          {/* En un mes que aún no ha llegado se habla en condicional: «queda
              este mes» sobre octubre, leído en septiembre, suena a que octubre
              ya está en marcha. */}
          <p className="text-[11px] text-muted">
            {/* Sin fijos que enseñar, un mes por venir dice lo suyo y no
                «gastado este mes», que hablaría de un mes que no ha llegado. */}
            {cuenta.origen === 'por-venir' && !hayFijos
              ? 'aún no ha empezado'
              : !hayFijos
                ? 'gastado este mes'
                : cuenta.origen === 'por-venir'
                  ? (queda < 0 ? 'de más ese mes' : 'quedaría ese mes')
                  : (queda < 0 ? 'de más este mes' : 'queda este mes')}
          </p>
        </div>

        <button
          type="button"
          onClick={onSiguiente}
          aria-label="Mes siguiente"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-canvas"
        >
          <ChevronRight size={18} strokeWidth={2.4} />
        </button>
      </div>

      {cuenta.origen !== 'plantilla' && (
        <p className="mt-1 text-center text-[11px] text-faint">
          {cuenta.origen === 'copia'
            ? copiaVacia
              ? 'De este mes no se guardó ningún fijo ni ninguna partida.'
              : 'Mes cerrado: los fijos y las partidas son los que había entonces.'
            : cuenta.origen === 'por-venir'
              ? porVenirEnCero
                ? 'Este mes aún no ha empezado, así que está en cero.'
                : 'Previsión: es lo que quedaría si nada cambia.'
              : 'De este mes no se guardó el plan, así que no se puede decir qué quedó.'}
        </p>
      )}

      {/* La previsión se pide. El enlace es la única pista de que se puede
          preguntar «¿cuadra el mes que viene?», y por eso está aquí y no en la
          letra pequeña de más abajo. */}
      {cuenta.origen === 'por-venir' && (
        <button
          type="button"
          onClick={onVerPrevision}
          className="mt-1 min-h-6 w-full py-1 text-center text-[11px] font-semibold text-primary-strong"
        >
          {previsionAbierta ? 'Ocultar la previsión' : 'Ver qué quedaría con lo fijo de hoy'}
        </button>
      )}
      {!esMesActual && (
        <button
          type="button"
          onClick={onVolverAHoy}
          className="mt-1 min-h-6 w-full py-1 text-center text-[11px] font-semibold text-primary-strong"
        >
          Volver a este mes
        </button>
      )}

      {hayFijos ? (
        <dl className="mt-3 space-y-1 border-t border-hairline pt-2.5">
          <Linea etiqueta="Ingresos fijos" importe={cuenta.ingresosFijos} tono="entra" />
          <Linea etiqueta="Gastos fijos" importe={cuenta.gastosFijos} tono="sale" />
          <div className="flex items-baseline justify-between gap-3 border-t border-hairline pt-1 text-[11px]">
            <dt className="truncate font-semibold text-muted">Para el mes</dt>
            <dd className="flex-shrink-0 font-bold tabular-nums text-ink">{formatCentsCorto(cuenta.paraElMes)}</dd>
          </div>
          {ingresosApuntados > 0 && (
            <Linea etiqueta="Ingresos apuntados" importe={ingresosApuntados} tono="entra" />
          )}
          <Linea etiqueta="Gastos apuntados" importe={gastosApuntados} tono="sale" />
        </dl>
      ) : cuenta.origen === 'plantilla' ? (
        <button
          type="button"
          onClick={onPonerFijos}
          className="mt-2 min-h-6 w-full border-t border-hairline pt-2.5 text-left text-[11px] text-muted"
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
            <li key={a.key} className="flex items-center gap-1.5 text-[11px] text-muted">
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
