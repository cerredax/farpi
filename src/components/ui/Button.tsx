import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'warn' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

/**
 * `warn` es para una acción con consecuencias que **no destruye nada** —cerrar el
 * mes, y poco más—. Va en el ámbar de marca, que `globals.css` ya reserva para los
 * avisos suaves, y **no en rojo a propósito**: el rojo es de lo que borra, y si lo
 * llevan las dos cosas la que borra deja de distinguirse. El texto va en tinta
 * porque el blanco no llega al contraste sobre ese amarillo; en tinta da 9:1.
 */
const variantClasses: Record<Variant, string> = {
  primary:   'bg-primary-strong text-white hover:bg-primary-deep active:bg-primary-deepest shadow-sm',
  secondary: 'bg-canvas text-ink border border-line hover:bg-surface active:bg-line',
  ghost:     'text-muted hover:text-ink hover:bg-surface active:bg-line active:text-ink',
  warn:      'bg-sand text-ink hover:bg-sand-hover active:bg-sand-hover shadow-sm',
  danger:    'bg-danger text-white hover:bg-danger-hover active:bg-danger-strong',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-xl',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-2xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        font-semibold select-none touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed
        transition-[background-color,color,transform] duration-150
        active:scale-[0.97] active:duration-0
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}
