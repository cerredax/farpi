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
      className="w-full bg-white rounded-2xl border border-[#F0EDE8] shadow-sm px-4 py-4 flex items-center gap-3 hover:bg-[#FDFBF8] active:bg-[#FAF7F2] transition-colors text-left"
    >
      <span className="text-2xl w-10 text-center flex-shrink-0">{list.emoji ?? '📋'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#252525] text-sm leading-tight">{list.name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
            <div className="h-full bg-[#8BA888] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-[#77716A] font-semibold flex-shrink-0">{done}/{total}</span>
        </div>
      </div>
      <ChevronRight size={16} className="text-[#C4BFB9] flex-shrink-0" />
    </button>
  )
}
