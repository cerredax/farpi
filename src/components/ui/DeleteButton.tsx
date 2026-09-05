'use client'

import { Trash2 } from 'lucide-react'

interface DeleteButtonProps {
  confirming: boolean
  onClick: () => void
  idleLabel: string
  confirmLabel: string
  /**
   * `footer`: botón ancho al pie del sheet. `header`: píldora en la cabecera.
   * `inline`: la papelera de una fila, que en reposo es solo el icono.
   */
  variant?: 'footer' | 'header' | 'inline'
  /**
   * Nombre accesible en reposo, para la variante `inline`: ahí no hay texto que
   * leer y "Eliminar" a secas no dice qué se elimina. Las otras dos no lo
   * necesitan, que ya enseñan su etiqueta.
   */
  ariaLabel?: string
  /** Nombre accesible mientras pide confirmación, para la variante `inline`. */
  confirmAriaLabel?: string
}

/**
 * Botón de borrado con confirmación en dos pasos, compartido por los sheets.
 * El estado `confirming` lo gestiona el sheet con `useConfirmAction`.
 */
export function DeleteButton({ confirming, onClick, idleLabel, confirmLabel, variant = 'footer', ariaLabel, confirmAriaLabel }: DeleteButtonProps) {
  const danger = confirming ? 'bg-danger text-white' : 'text-danger hover:bg-danger-soft'

  /**
   * En una fila el borrado no puede ocupar sitio hasta que hace falta: en reposo
   * es la papelera de 28 px de siempre, y al pedir confirmación crece hasta
   * llevar la palabra dentro, en rojo relleno. Que **cambie de forma** es lo que
   * avisa de que el siguiente toque va en serio; un icono que se pone rojo sin
   * moverse se confunde con el estado normal de una papelera.
   */
  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={confirming ? confirmAriaLabel ?? confirmLabel : ariaLabel ?? idleLabel}
        className={`flex h-7 flex-shrink-0 items-center justify-center gap-1 rounded-full text-xs font-bold transition-colors ${
          confirming ? 'bg-danger px-2 text-white' : 'w-7 text-faint hover:bg-danger-soft hover:text-danger'
        }`}
      >
        <Trash2 size={14} />
        {confirming && confirmLabel}
      </button>
    )
  }

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
