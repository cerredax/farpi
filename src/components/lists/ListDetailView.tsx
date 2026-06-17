import { Plus, ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { CircleCheck } from '@/components/ui/CircleCheck'
import type { List, ListItem } from '@/types'

interface ListDetailViewProps {
  list: List
  items: ListItem[]
  onBack: () => void
  onToggle: (id: string) => void
  onOpenEdit: () => void
  onOpenAddItem: () => void
  onOpenEditItem: (item: ListItem) => void
  onDeleteItem: (id: string) => void
}

export function ListDetailView({
  list, items, onBack, onToggle, onOpenEdit, onOpenAddItem, onOpenEditItem, onDeleteItem,
}: ListDetailViewProps) {
  const pending: ListItem[] = []
  const completed: ListItem[] = []

  for (const item of items) {
    if (item.completed) completed.push(item)
    else pending.push(item)
  }

  pending.sort((a, b) => a.sort_order - b.sort_order)
  completed.sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full text-[#77716A] hover:bg-[#F0EDE8] transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <span className="text-xl">{list.emoji ?? '📋'}</span>
        <h1 className="flex-1 font-extrabold text-[#252525] text-lg leading-tight truncate">{list.name}</h1>
        <button onClick={onOpenEdit} className="w-8 h-8 flex items-center justify-center rounded-full text-[#C4BFB9] hover:text-[#77716A] hover:bg-[#F0EDE8] transition-colors flex-shrink-0">
          <Pencil size={15} />
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {pending.length === 0 && completed.length === 0 && (
          <p className="text-center text-[#77716A] text-sm py-12">Lista vacía. ¡Añade el primer ítem!</p>
        )}

        {pending.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-[#F0EDE8] shadow-sm flex items-center gap-2 px-2 py-2">
            <CircleCheck checked={false} onClick={() => onToggle(item.id)} ariaLabel="Marcar como hecho" />
            <button onClick={() => onOpenEditItem(item)} className="flex-1 text-left text-sm font-medium text-[#252525] leading-snug">
              {item.text}
            </button>
            <button onClick={() => onDeleteItem(item.id)} aria-label="Eliminar ítem" className="w-7 h-7 flex items-center justify-center rounded-full text-[#C4BFB9] hover:text-[#D96C6C] hover:bg-[#FDE8E8] flex-shrink-0 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {completed.length > 0 && (
          <>
            <p className="text-xs font-bold text-[#77716A] uppercase tracking-widest pt-2 px-1">Hecho</p>
            {completed.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-[#F0EDE8] flex items-center gap-2 px-2 py-2 opacity-60">
                <CircleCheck checked={true} onClick={() => onToggle(item.id)} ariaLabel="Marcar como pendiente" />
                <button onClick={() => onOpenEditItem(item)} className="flex-1 text-left text-sm font-medium text-[#77716A] line-through leading-snug">
                  {item.text}
                </button>
                <button onClick={() => onDeleteItem(item.id)} aria-label="Eliminar ítem" className="w-7 h-7 flex items-center justify-center rounded-full text-[#C4BFB9] hover:text-[#D96C6C] hover:bg-[#FDE8E8] flex-shrink-0 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Añadir ítem */}
      <div className="px-4 pb-6 pt-2 border-t border-[#F5F2EE]">
        <button
          onClick={onOpenAddItem}
          className="w-full flex items-center gap-2 py-3 px-4 rounded-2xl border-2 border-dashed border-[#D8D4CE] text-[#8BA888] hover:border-[#8BA888] hover:bg-[#F5F9F5] transition-colors text-sm font-semibold"
        >
          <Plus size={16} />
          Añadir ítem
        </button>
      </div>
    </div>
  )
}
