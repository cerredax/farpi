interface BadgeProps {
  children: React.ReactNode
  color?: string
  className?: string
}

export function Badge({ children, color = '#8BA888', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white ${className}`}
      style={{ backgroundColor: color }}
    >
      {children}
    </span>
  )
}
