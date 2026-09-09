import { Check } from 'lucide-react'

interface CircleCheckProps {
  checked: boolean
  onClick: () => void
  ariaLabel?: string
  /** sm = w-5 h-5, para filas apretadas; md = w-6 h-6, el normal. */
  size?: 'sm' | 'md'
  /** Clases extra para el botón de fuera, que es el área de toque. */
  className?: string
}

export function CircleCheck({ checked, onClick, ariaLabel, size = 'md', className = '' }: CircleCheckProps) {
  const defaultLabel = checked ? 'Marcar como pendiente' : 'Marcar como completado'
  const iconSize = size === 'sm' ? 10 : 13

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? defaultLabel}
      className={`flex-shrink-0 flex items-center justify-center w-12 min-h-[44px] active:bg-primary-tint transition-colors group ${className}`}
    >
      <span
        className={`rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
        } ${
          checked
            ? 'bg-primary-strong border-primary-strong'
            : 'border-muted group-hover:border-primary-strong group-active:border-primary-strong'
        }`}
      >
        <Check
          size={iconSize}
          strokeWidth={3}
          className={checked ? 'text-white' : 'text-muted group-hover:text-primary-strong transition-colors'}
        />
      </span>
    </button>
  )
}
