interface EmptyStateProps {
  emoji?: string
  title: string
  description?: string
  action?: React.ReactNode
  /**
   * Versión de una línea. En la pantalla de inicio, la versión grande hacía que
   * un día tranquilo ocupase lo mismo que un día lleno: dos secciones vacías se
   * comían 542 px de los 839 que tiene un móvil.
   */
  compact?: boolean
}

export function EmptyState({ emoji = '✨', title, description, action, compact = false }: EmptyStateProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3">
        <span className="text-base leading-none opacity-60">{emoji}</span>
        <p className="flex-1 text-sm text-muted">{title}</p>
        {action}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <span className="text-4xl mb-3">{emoji}</span>
      <p className="font-bold text-ink text-base mb-1">{title}</p>
      {description && (
        <p className="text-sm text-muted mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}
