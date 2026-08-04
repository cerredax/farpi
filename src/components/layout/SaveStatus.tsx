'use client'

import { useEffect } from 'react'
import { AlertTriangle, Check, Loader2, X } from 'lucide-react'
import { useStore } from '@/lib/store-context'

/** Lo que dura el aviso de deshacer. Suficiente para caer en la cuenta. */
const SEGUNDOS_PARA_DESHACER = 6

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

  // El aviso se va solo: es una confirmación, no algo que haya que cerrar.
  useEffect(() => {
    if (!undoLabel) return
    const timer = window.setTimeout(clearUndo, SEGUNDOS_PARA_DESHACER * 1000)
    return () => window.clearTimeout(timer)
  }, [undoLabel, clearUndo])

  if (error) {
    return (
      <div
        role="alert"
        className="fixed inset-x-4 bottom-20 z-[70] mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-danger-line bg-danger-soft px-4 py-3 shadow-lg"
      >
        <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-danger" strokeWidth={2.3} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">No se ha guardado el cambio</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted break-words">{error}</p>
        </div>
        <button
          type="button"
          onClick={clearError}
          aria-label="Cerrar aviso"
          className="flex-shrink-0 rounded-full p-1 text-muted transition-colors hover:bg-white/60 hover:text-ink"
        >
          <X size={16} strokeWidth={2.4} />
        </button>
      </div>
    )
  }

  if (isSaving) {
    return (
      <div
        role="status"
        className="fixed inset-x-0 bottom-20 z-[70] mx-auto flex w-fit items-center gap-2 rounded-full bg-ink/85 px-4 py-2 text-xs font-bold text-white shadow-lg"
      >
        <Loader2 size={13} className="animate-spin" strokeWidth={2.5} />
        Guardando…
      </div>
    )
  }

  // Marcar una tarea es la acción que más se hace sin querer, y la que peor se
  // devolvía: la que se repite no se completa, salta al día siguiente, así que
  // no quedaba nada que desmarcar. Por eso el aviso dice las dos cosas: que se
  // ha hecho y cómo volver atrás.
  if (undoLabel) {
    return (
      <div
        role="status"
        className="fixed inset-x-0 bottom-20 z-[70] mx-auto flex w-fit items-center gap-3 rounded-full bg-ink/85 py-1.5 pl-4 pr-1.5 text-xs font-bold text-white shadow-lg"
      >
        <span className="flex items-center gap-1.5">
          <Check size={13} strokeWidth={3} />
          {undoLabel}
        </span>
        <button
          type="button"
          onClick={() => { void undo() }}
          className="rounded-full bg-white/20 px-3 py-1.5 font-bold text-white transition-colors hover:bg-white/30"
        >
          Deshacer
        </button>
      </div>
    )
  }

  return null
}
