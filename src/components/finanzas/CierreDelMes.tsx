'use client'

import { Eraser, Lock, LockOpen } from 'lucide-react'
import { useConfirmAction } from '@/hooks/useConfirmAction'

interface CierreDelMesProps {
  /** Aún no está cerrado y ya ha empezado, así que se puede dar por cerrado. */
  sePuedeCerrar: boolean
  /** Se cerró antes de tiempo y el mes sigue siendo el de hoy: se puede deshacer. */
  sePuedeReabrir: boolean
  /** Es un mes pasado con copia: se puede quitar y dejarlo en cero. */
  sePuedePonerACero: boolean
  onCerrar: () => void
  onReabrir: () => void
  onPonerACero: () => void
}

/**
 * Qué se puede hacer con el mes que se está mirando: darlo por cerrado,
 * deshacerlo o ponerlo a cero.
 *
 * **Va justo debajo de la tarjeta del mes** (03-09-2026), no al pie de la
 * pantalla. Estuvo abajo desde el 02-09-2026 y la razón era buena —después del
 * día a día se lee como «he terminado con este mes»—, pero en la práctica había
 * que recorrer las partidas y todos los apuntes del mes para encontrarlo, y lo
 * que hay aquí no es un remate: es lo que se hace **con** el mes que la tarjeta
 * acaba de resumir. Sigue **fuera** de la tarjeta y separado por su línea, que es
 * lo que la salvó de convertirse en un panel de mandos.
 *
 * Tres cosas, nunca dos a la vez:
 *
 * 1. **Dar el mes por cerrado.** Un atajo, no una tarea: si nadie lo toca, el mes
 *    se cierra solo el día 1. Sirve para lo único que no se podía hacer de otra
 *    manera —preparar un cambio de la plantilla que valga a partir del mes que
 *    viene, porque el mes en curso es espejo de ella— y por eso el texto habla de
 *    eso y no de «cerrar el mes» a secas, que no explica para qué sirve.
 * 2. **Volver a seguir la plantilla**, mientras el mes cerrado siga siendo el de
 *    hoy. No pide confirmación: no pierde nada.
 * 3. **Poner el mes a cero** (03-09-2026), en un mes pasado. Borra la copia y lo
 *    deja como el mes que nunca se cerró: en cero y diciéndolo. Existe porque el
 *    cierre automático llegó a guardar meses que no se vivieron —agosto, con unas
 *    nóminas creadas el 1 de septiembre— y no había forma de quitarlos. **Los
 *    apuntes no se borran**, y el texto lo dice antes de que nadie lo pregunte.
 *
 * Cerrar y poner a cero piden confirmación con el patrón de siempre, y la de
 * poner a cero avisa de lo que se pierde: los fijos y las partidas guardados.
 */
export function CierreDelMes({
  sePuedeCerrar, sePuedeReabrir, sePuedePonerACero, onCerrar, onReabrir, onPonerACero,
}: CierreDelMesProps) {
  const { confirming, requestConfirm } = useConfirmAction()

  if (!sePuedeCerrar && !sePuedeReabrir && !sePuedePonerACero) return null

  return (
    <section aria-label="Cierre del mes" className="border-t border-hairline pt-3">
      {sePuedePonerACero ? (
        <>
          <button
            type="button"
            onClick={() => requestConfirm(onPonerACero)}
            className={`flex min-h-6 w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold transition-colors ${
              confirming ? 'text-danger-strong' : 'text-primary-strong'
            }`}
          >
            <Eraser size={13} strokeWidth={2.4} aria-hidden />
            {confirming ? '¿Seguro? Se borran los fijos y las partidas de ese mes' : 'Poner este mes a cero'}
          </button>
          <p className="mt-1 px-1 text-center text-[10px] leading-relaxed text-faint">
            Para un mes que no llevasteis: quita los fijos y las partidas que se le
            guardaron y lo deja como si no se hubiera cerrado. Lo apuntado no se toca.
          </p>
        </>
      ) : sePuedeCerrar ? (
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
