interface EmptyStateProps {
  emoji?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ emoji = '✨', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <span className="text-4xl mb-3">{emoji}</span>
      <p className="font-bold text-[#252525] text-base mb-1">{title}</p>
      {description && (
        <p className="text-sm text-[#77716A] mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}
