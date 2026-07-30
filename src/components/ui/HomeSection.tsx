import { CardSection } from './Card'

interface HomeSectionProps {
  label: string
  isEmpty: boolean
  emptyState: React.ReactNode
  footer: React.ReactNode
  children: React.ReactNode
}

export function HomeSection({ label, isEmpty, emptyState, footer, children }: HomeSectionProps) {
  return (
    <CardSection label={label}>
      <div className="bg-white rounded-2xl border border-surface shadow-sm overflow-hidden">
        {isEmpty ? emptyState : children}
        <div className="border-t border-hairline px-4 py-2.5">
          {footer}
        </div>
      </div>
    </CardSection>
  )
}
