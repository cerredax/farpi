import { ChevronRight } from 'lucide-react'
import type { List } from '@/types'

interface ListCardProps {
  list: List
  total: number
  done: number
  onClick: () => void
}

export function ListCard({ list, total, done, onClick }: ListCardProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-surface shadow-sm px-4 py-4 flex items-center gap-3 hover:bg-canvas active:bg-canvas transition-colors text-left"
    >
      <span className="text-2xl w-10 text-center flex-shrink-0">{list.emoji ?? '📋'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-ink text-sm leading-tight">{list.name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-muted font-semibold flex-shrink-0">{done}/{total}</span>
        </div>
      </div>
      <ChevronRight size={16} className="text-faint flex-shrink-0" />
    </button>
  )
}
