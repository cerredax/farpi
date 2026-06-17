import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-[#5C7A59] text-white hover:bg-[#4e6b4c] active:bg-[#426040] shadow-sm',
  secondary: 'bg-[#FAF7F2] text-[#252525] border border-[#EDE9E3] hover:bg-[#F0EDE8]',
  ghost:     'text-[#77716A] hover:text-[#252525] hover:bg-[#F0EDE8]',
  danger:    'bg-[#D96C6C] text-white hover:bg-[#c45f5f]',
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
        font-semibold transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed
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
