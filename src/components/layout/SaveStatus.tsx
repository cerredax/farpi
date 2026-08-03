'use client'

import { AlertTriangle, Loader2, X } from 'lucide-react'
import { useStore } from '@/lib/store-context'

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
  const { isSaving, error, clearError } = useStore()

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

  return null
}
