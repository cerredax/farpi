import { ElementType } from 'react'
import { CardSection } from './Card'

interface HomeSectionProps {
  label: string
  /** Icono + color que identifican la sección entre las cuatro de Inicio,
   *  tanto en la etiqueta como en el borde de la tarjeta. */
  icon?: ElementType
  accentColor?: string
  /** Con `emptyState`, para las secciones que se quedan diciendo qué pasa. Una
   *  sección que preferiría desaparecer no los pasa: devuelve `null` y ya. */
  isEmpty?: boolean
  emptyState?: React.ReactNode
  footer: React.ReactNode
  children: React.ReactNode
}

export function HomeSection({ label, icon, accentColor, isEmpty = false, emptyState = null, footer, children }: HomeSectionProps) {
  return (
    <CardSection label={label} icon={icon} accentColor={accentColor}>
      <div
        className="bg-white rounded-2xl border border-surface shadow-sm overflow-hidden"
        style={accentColor ? { borderLeft: `3px solid ${accentColor}` } : undefined}
      >
        {isEmpty ? emptyState : children}
        <div className="border-t border-hairline px-4 py-2.5">
          {footer}
        </div>
      </div>
    </CardSection>
  )
}
