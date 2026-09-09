'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Loader2, X } from 'lucide-react'
import { useStore } from '@/lib/store-context'

/** Lo que dura el aviso de deshacer. Suficiente para caer en la cuenta. */
const SEGUNDOS_PARA_DESHACER = 6

/**
 * Lo que dura el "Guardado". Corto a propósito: es un acuse de recibo, no una
 * noticia, y en la lista de la compra se marcan diez cosas seguidas.
 */
const MS_GUARDADO = 1500

/**
 * Avisa de lo que está pasando con los datos: si hay algo guardándose y, sobre
 * todo, si algo ha fallado.
 *
 * Hasta ahora el store registraba los errores pero nadie los mostraba: si se
 * caía la red o Supabase rechazaba una operación, el cambio no se guardaba y la
 * app no decía nada. Este es el único sitio que lo cuenta, y por eso vive en el
 * armazón: cubre todas las pantallas sin repetirlo en cada una.
 */
export function SaveStatus() {
  const { isSaving, error, clearError, undoLabel, undo, clearUndo } = useStore()

  /**
   * "Guardado", cuando una escritura termina bien.
   *
   * Sale de mirar `isSaving` pasar de `true` a `false` sin error, y por eso no
   * hace falta tocar el store ni las cuarenta escrituras que hay: donde ya se
   * decía "Guardando…" ahora se dice también cómo acabó. Antes el aviso
   * desaparecía sin más y guardar un gasto, un documento o una nota no confirmaba
   * nada —el sheet se cerraba y ya—, así que con la red floja no había forma de
   * saber si el cambio había llegado.
   *
   * Es el último de los cuatro: si hay error manda el error, y si la acción trae
   * su propio "Hecho · Deshacer" manda ese, que dice lo mismo y además ofrece
   * volver atrás.
   */
  const [guardado, setGuardado] = useState(false)
  // El mismo ajuste de estado en render que usa `useSheetForm`, y por lo mismo:
  // es un cambio derivado de una prop que cambia, no un efecto. Un `setState`
  // dentro del cuerpo de un `useEffect` lo prohíbe además la propia regla de
  // lint (`react-hooks/set-state-in-effect`).
  const [guardandoAntes, setGuardandoAntes] = useState(isSaving)
  if (isSaving !== guardandoAntes) {
    setGuardandoAntes(isSaving)
    setGuardado(!isSaving && !error)
  }

  useEffect(() => {
    if (!guardado) return
    const timer = window.setTimeout(() => setGuardado(false), MS_GUARDADO)
    return () => window.clearTimeout(timer)
  }, [guardado])

  // El aviso se va solo: es una confirmación, no algo que haya que cerrar.
  useEffect(() => {
    if (!undoLabel) return
    const timer = window.setTimeout(clearUndo, SEGUNDOS_PARA_DESHACER * 1000)
    return () => window.clearTimeout(timer)
  }, [undoLabel, clearUndo])

  /**
   * **Los dos contenedores están siempre en el DOM**, y lo que cambia es lo que
   * hay dentro.
   *
   * Antes el aviso entero se montaba al aparecer, con su `role` incluido, y una
   * región viva insertada de golpe no se anuncia de forma fiable: hay
   * combinaciones de navegador y lector que solo leen los cambios de una región
   * que ya estaba. Medido el 09-09-2026: cero elementos con `aria-live` en
   * reposo en las nueve rutas.
   *
   * Son dos porque no piden lo mismo: guardar, guardado y deshacer son `polite`
   * —esperan a que termine de leerse lo que haya— y un cambio que no se ha
   * guardado es `assertive`, que interrumpe.
   *
   * Y **son los mismos nodos que se ven**, no una copia escondida para el lector
   * de pantalla: con dos, el mismo texto estaría dos veces en la página. Vacíos
   * no ocupan nada, porque las clases de la tarjeta solo se ponen cuando hay algo
   * que enseñar.
   */
  const CAJA = 'fixed bottom-20 z-[70] mx-auto shadow-lg'

  return (
    <>
      <div
        role="alert"
        aria-live="assertive"
        className={error ? `${CAJA} inset-x-4 flex max-w-md items-start gap-3 rounded-2xl border border-danger-line bg-danger-soft px-4 py-3` : undefined}
      >
        {error && (
          <>
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-danger-strong" strokeWidth={2.3} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">No se ha guardado el cambio</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted break-words">{error}</p>
            </div>
            <button
              type="button"
              onClick={clearError}
              aria-label="Cerrar aviso"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/60 hover:text-ink"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </>
        )}
      </div>

      <div
        role="status"
        aria-live="polite"
        className={!error && (isSaving || undoLabel || guardado)
          ? `${CAJA} inset-x-0 flex w-fit items-center gap-3 rounded-full bg-ink/85 text-xs font-bold text-white`
          : undefined}
      >
        {!error && isSaving && (
          <span className="flex items-center gap-2 px-4 py-2">
            <Loader2 size={13} className="animate-spin" strokeWidth={2.5} />
            Guardando…
          </span>
        )}

        {/* Marcar una tarea es la acción que más se hace sin querer, y la que
            peor se devolvía: la que se repite no se completa, salta al día
            siguiente, así que no quedaba nada que desmarcar. Por eso el aviso
            dice las dos cosas: que se ha hecho y cómo volver atrás. */}
        {!error && !isSaving && undoLabel && (
          <>
            <span className="flex items-center gap-1.5 py-1.5 pl-4">
              <Check size={13} strokeWidth={3} />
              {undoLabel}
            </span>
            <button
              type="button"
              onClick={() => { void undo() }}
              className="my-1 mr-1.5 flex min-h-9 items-center rounded-full bg-white/20 px-3 font-bold text-white transition-colors hover:bg-white/30"
            >
              Deshacer
            </button>
          </>
        )}

        {!error && !isSaving && !undoLabel && guardado && (
          <span className="flex items-center gap-2 px-4 py-2">
            <Check size={13} strokeWidth={3} />
            Guardado
          </span>
        )}
      </div>
    </>
  )
}
