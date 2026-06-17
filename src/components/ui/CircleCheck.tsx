import { Check } from 'lucide-react'

interface CircleCheckProps {
  checked: boolean
  onClick: () => void
  ariaLabel?: string
  /** sm = w-5 h-5 (compact rows), md = w-6 h-6 (default) */
  size?: 'sm' | 'md'
  /** Extra classes for the outer button (tap area) */
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
      className={`flex-shrink-0 flex items-center justify-center w-12 min-h-[44px] active:bg-[#F0F7F0] transition-colors group ${className}`}
    >
      <span
        className={`rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
        } ${
          checked
            ? 'bg-[#8BA888] border-[#8BA888]'
            : 'border-[#C4BFB9] group-hover:border-[#8BA888] group-active:border-[#8BA888]'
        }`}
      >
        <Check
          size={iconSize}
          strokeWidth={3}
          className={checked ? 'text-white' : 'text-[#C4BFB9] group-hover:text-[#8BA888] transition-colors'}
        />
      </span>
    </button>
  )
}
