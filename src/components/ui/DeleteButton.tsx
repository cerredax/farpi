'use client'

import { Trash2 } from 'lucide-react'

interface DeleteButtonProps {
  confirming: boolean
  onClick: () => void
  idleLabel: string
  confirmLabel: string
  /** `footer`: botón ancho al pie del sheet. `header`: píldora en la cabecera. */
  variant?: 'footer' | 'header'
}

/**
 * Botón de borrado con confirmación en dos pasos, compartido por los sheets.
 * El estado `confirming` lo gestiona el sheet con `useConfirmAction`.
 */
export function DeleteButton({ confirming, onClick, idleLabel, confirmLabel, variant = 'footer' }: DeleteButtonProps) {
  const danger = confirming ? 'bg-danger text-white' : 'text-danger hover:bg-danger-soft'

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${danger}`}
      >
        <Trash2 size={13} />
        {confirming ? confirmLabel : idleLabel}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${danger}`}
    >
      <span className="flex items-center justify-center gap-2">
        <Trash2 size={15} />
        {confirming ? confirmLabel : idleLabel}
      </span>
    </button>
  )
}
