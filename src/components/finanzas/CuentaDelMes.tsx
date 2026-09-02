'use client'

import { ChevronLeft, ChevronRight, Lock, LockOpen } from 'lucide-react'
import { useConfirmAction } from '@/hooks/useConfirmAction'
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
  /** Lleva a «El mes tipo». Solo se ofrece cuando no hay ningún fijo puesto. */
  onPonerFijos: () => void
  /** Este mes se puede dar por cerrado a mano: aún no lo está y ya ha empezado. */
  sePuedeCerrarYa: boolean
  /** Y deshacerlo, mientras siga siendo el mes de hoy. */
  sePuedeReabrir: boolean
  onCerrarYa: () => void
  onReabrir: () => void
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
 * **Cerrar el mes antes de tiempo se ofrece aquí, y en pequeño.** Es un atajo, no
 * una tarea: si nadie lo toca, el mes se cierra solo el día 1. Sirve para lo que no
 * se podía hacer de otra manera —preparar un cambio de la plantilla que valga a
 * partir del mes que viene— y por eso el texto habla de eso y no de «cerrar».
 * Pide confirmación con el patrón de siempre, y mientras el mes siga siendo el de
 * hoy se puede deshacer: un mes terminado, nunca.
 */
export function CuentaDelMes({
  cuenta, nombreDelMes, esMesActual, onAnterior, onSiguiente, onVolverAHoy, reparto, onPonerFijos,
  sePuedeCerrarYa, sePuedeReabrir, onCerrarYa, onReabrir,
}: CuentaDelMesProps) {
  const { hayFijos, queda, gastosApuntados, ingresosApuntados } = cuenta
  const enNumerosRojos = hayFijos && queda < 0
  const { confirming, requestConfirm } = useConfirmAction()

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
            {formatCents(hayFijos ? Math.abs(queda) : gastosApuntados)}
          </p>
          <p className="text-[11px] text-muted">
            {hayFijos ? (queda < 0 ? 'de más este mes' : 'queda este mes') : 'gastado este mes'}
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
            ? 'Mes cerrado: los fijos y las partidas son los que había entonces.'
            : 'De este mes no se guardó el plan, así que no se puede decir qué quedó.'}
        </p>
      )}

      {/* El texto no dice «cerrar el mes» a secas porque eso no explica para qué
          sirve. Lo que se está ofreciendo es poder tocar la plantilla sin que el
          cambio caiga en este mes, y eso es lo que se escribe. */}
      {sePuedeCerrarYa && hayFijos && (
        <button
          type="button"
          onClick={() => requestConfirm(onCerrarYa)}
          className="mt-1 flex min-h-6 w-full items-center justify-center gap-1.5 py-1 text-[11px] text-faint transition-colors hover:text-muted"
        >
          <Lock size={11} strokeWidth={2.4} aria-hidden />
          {confirming
            ? '¿Seguro? Los fijos de hoy quedan guardados en este mes'
            : 'Dar el mes por cerrado y poder cambiar los fijos del que viene'}
        </button>
      )}

      {sePuedeReabrir && (
        <button
          type="button"
          onClick={onReabrir}
          className="mt-1 flex min-h-6 w-full items-center justify-center gap-1.5 py-1 text-[11px] text-faint transition-colors hover:text-muted"
        >
          <LockOpen size={11} strokeWidth={2.4} aria-hidden />
          Volver a seguir la plantilla este mes
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
          <span className="font-semibold text-primary-strong">El mes tipo</span> y aquí
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
