'use client'

import { Lock, LockOpen } from 'lucide-react'
import { useConfirmAction } from '@/hooks/useConfirmAction'

interface CierreDelMesProps {
  /** Aún no está cerrado y ya ha empezado, así que se puede dar por cerrado. */
  sePuedeCerrar: boolean
  /** Se cerró antes de tiempo y el mes sigue siendo el de hoy: se puede deshacer. */
  sePuedeReabrir: boolean
  onCerrar: () => void
  onReabrir: () => void
}

/**
 * El pie de «El mes»: dar el mes por cerrado, y deshacerlo.
 *
 * **Está al final y no en la tarjeta de arriba** (02-09-2026). Ahí estuvo un rato y
 * quedaba mal: la tarjeta es la conclusión de la pantalla —una cifra grande y su
 * desglose— y colgarle debajo dos acciones la convertía en un panel de mandos. Al
 * pie, después del día a día, se lee como lo que es: «he terminado con este mes».
 *
 * **Es un atajo, no una tarea.** Si nadie lo toca, el mes se cierra solo el día 1.
 * Sirve para lo único que no se podía hacer de otra manera —preparar un cambio de
 * la plantilla que valga a partir del mes que viene, porque el mes en curso es
 * espejo de ella— y por eso el texto habla de eso y no de «cerrar el mes» a secas,
 * que no explica para qué sirve.
 *
 * Pide confirmación con el patrón de siempre. Deshacerlo no la pide: reabrir no
 * pierde nada, solo devuelve el mes a seguir la plantilla, y un mes ya terminado
 * ni siquiera enseña el botón.
 */
export function CierreDelMes({ sePuedeCerrar, sePuedeReabrir, onCerrar, onReabrir }: CierreDelMesProps) {
  const { confirming, requestConfirm } = useConfirmAction()

  if (!sePuedeCerrar && !sePuedeReabrir) return null

  return (
    <section aria-label="Cierre del mes" className="border-t border-hairline pt-4">
      {sePuedeCerrar ? (
        <>
          <button
            type="button"
            onClick={() => requestConfirm(onCerrar)}
            className={`flex min-h-6 w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold transition-colors ${
              confirming ? 'text-danger-strong' : 'text-primary-strong'
            }`}
          >
            <Lock size={13} strokeWidth={2.4} aria-hidden />
            {confirming ? '¿Seguro? Se guardan los fijos y las partidas de hoy' : 'Dar el mes por cerrado'}
          </button>
          <p className="mt-1 px-1 text-center text-[10px] leading-relaxed text-faint">
            Guarda los fijos y las partidas de ahora mismo en este mes, para que puedas
            cambiarlos de cara al que viene sin que se muevan aquí. No hace falta: el
            día 1 se cierra solo.
          </p>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onReabrir}
            className="flex min-h-6 w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold text-primary-strong"
          >
            <LockOpen size={13} strokeWidth={2.4} aria-hidden />
            Volver a seguir la plantilla este mes
          </button>
          <p className="mt-1 px-1 text-center text-[10px] leading-relaxed text-faint">
            Este mes está cerrado a mano. Solo se puede deshacer mientras siga siendo el
            mes en curso.
          </p>
        </>
      )}
    </section>
  )
}
