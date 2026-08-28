import { HTMLAttributes, ElementType } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean
}

export function Card({ className = '', padded = true, children, ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-surface ${padded ? 'p-4' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardSectionProps {
  label: string
  /** Icono de la sección, en un chip de color a juego con `accentColor`. Sin
   *  él las cuatro secciones de Inicio eran indistinguibles a simple vista. */
  icon?: ElementType
  accentColor?: string
  children: React.ReactNode
}

export function CardSection({ label, icon: Icon, accentColor, children }: CardSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-widest text-muted">
        {Icon && accentColor && (
          <span
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accentColor}26`, color: accentColor }}
            aria-hidden
          >
            <Icon size={12} strokeWidth={2.6} />
          </span>
        )}
        {label}
      </h2>
      {children}
    </section>
  )
}
