import { ChevronRight } from 'lucide-react'
import type { ItemMatch } from '@/types'

interface ItemMatchCardProps {
  match: ItemMatch
  onClick: () => void
}

/** Un ítem encontrado en la búsqueda global, con la lista de la que sale. */
export function ItemMatchCard({ match, onClick }: ItemMatchCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-surface shadow-sm px-4 py-3 flex items-center gap-3 hover:bg-canvas active:bg-canvas transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${match.completed ? 'text-muted line-through' : 'text-ink'}`}>
          {match.text}
        </p>
        <p className="text-[11px] text-muted mt-1 truncate">
          {match.list_emoji ?? '📋'} {match.list_name}
          {match.completed && ' · hecho'}
        </p>
      </div>
      <ChevronRight size={16} className="text-faint flex-shrink-0" />
    </button>
  )
}
