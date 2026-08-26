import { Plus } from 'lucide-react'

interface CirclePlusProps {
  onClick: () => void
  ariaLabel?: string
  /** sm = w-5 h-5, para filas apretadas; md = w-6 h-6, el normal. */
  size?: 'sm' | 'md'
  /** Clases extra para el botón de fuera, que es el área de toque. */
  className?: string
}

/**
 * Hermano de `CircleCheck` para lo que no está pendiente: no se marca, se suma.
 *
 * En una lista, lo que ya tenéis en casa no es una tarea hecha —un tic ahí diría
 * "leche hecha"—, es catálogo esperando a volver a hacer falta. La acción es la
 * misma que la de «Añadir ítem», así que lleva el mismo `+`. Comparte medidas y
 * área de toque con `CircleCheck` para que las filas no se descuadren.
 */
export function CirclePlus({ onClick, ariaLabel, size = 'md', className = '' }: CirclePlusProps) {
  const iconSize = size === 'sm' ? 10 : 13

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? 'Apuntar que hace falta'}
      className={`flex-shrink-0 flex items-center justify-center w-12 min-h-[44px] active:bg-primary-tint transition-colors group ${className}`}
    >
      <span
        className={`rounded-full border-2 border-faint flex items-center justify-center transition-all duration-200 group-hover:border-primary group-active:border-primary ${
          size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
        }`}
      >
        <Plus
          size={iconSize}
          strokeWidth={3}
          className="text-faint group-hover:text-primary transition-colors"
        />
      </span>
    </button>
  )
}
