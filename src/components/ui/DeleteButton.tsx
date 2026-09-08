'use client'

import { Trash2 } from 'lucide-react'

interface DeleteButtonProps {
  /**
   * Si está pidiendo confirmación, en los borrados de doble toque. Los que
   * preguntan en un diálogo no lo pasan: ahí el botón es de un toque y quien
   * confirma es el sheet, que se convierte en la pregunta.
   */
  confirming?: boolean
  onClick: () => void
  idleLabel: string
  /** Rótulo del segundo toque. Solo hace falta si el botón usa `confirming`. */
  confirmLabel?: string
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
 * Botón de borrado, compartido por los sheets y por las filas que se pueden
 * borrar. Con `confirming` es el de dos toques —el estado lo lleva el sheet con
 * `useConfirmAction`—; sin él es de un toque, y la confirmación la da el paso de
 * `ConfirmDelete`.
 *
 * **El rojo es `danger-strong` y no `danger` a secas** (08-09-2026). Es la misma
 * razón que ya llevaba escrita `BudgetBar`: aquí todo es texto pequeño —12 y 14
 * px— y `danger` sobre blanco se queda en 3,3:1, por debajo del 4,5:1 que pide
 * WCAG AA; sobre el fondo del hover, en 2,8:1. Y falla justo donde más importa,
 * en el «Borrar» blanco sobre rojo relleno del segundo toque, que es el rótulo
 * que hay que leer **antes** de tocar. `danger-strong` da 5,2:1 en las dos
 * direcciones. `danger` se queda para lo que no es texto: bordes, fondos suaves,
 * barras y puntos.
 */
export function DeleteButton({ confirming = false, onClick, idleLabel, confirmLabel, variant = 'footer', ariaLabel, confirmAriaLabel }: DeleteButtonProps) {
  const danger = confirming ? 'bg-danger-strong text-white' : 'text-danger-strong hover:bg-danger-soft'

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
          confirming ? 'bg-danger-strong px-2 text-white' : 'w-7 text-faint hover:bg-danger-soft hover:text-danger-strong'
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
