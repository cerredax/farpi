import { ChevronRight } from 'lucide-react'
import { CircleCheck } from '@/components/ui/CircleCheck'
import { CirclePlus } from '@/components/ui/CirclePlus'
import type { ItemMatch } from '@/types'

interface ItemMatchCardProps {
  match: ItemMatch
  onToggle: () => void
  onOpenList: () => void
}

/**
 * Un ítem encontrado en la búsqueda global, con la lista de la que sale.
 *
 * Se puede marcar aquí mismo: buscas "pilas" para apuntar que hacen falta, no
 * para navegar. Entrar en la lista sigue a un toque, en el resto de la tarjeta.
 */
export function ItemMatchCard({ match, onToggle, onOpenList }: ItemMatchCardProps) {
  return (
    <div className="w-full bg-white rounded-2xl border border-surface shadow-sm flex items-center gap-2 pl-2 pr-3 py-2.5">
      {match.completed ? (
        <CirclePlus onClick={onToggle} ariaLabel={`Apuntar que hace falta ${match.text}`} />
      ) : (
        <CircleCheck
          checked={false}
          onClick={onToggle}
          ariaLabel={`Ya tenéis ${match.text}, quitar de lo que falta`}
        />
      )}
      <button
        onClick={onOpenList}
        aria-label={`Abrir ${match.list_name}`}
        className="flex flex-1 items-center gap-2 min-w-0 text-left"
      >
        <span className="flex-1 min-w-0">
          {/* Sin tachar: lo marcado no es historial, es lo que ya tenéis. */}
          <span className={`block text-sm font-semibold leading-snug ${match.completed ? 'text-muted' : 'text-ink'}`}>
            {match.text}
          </span>
          <span className="block text-[11px] text-muted mt-0.5 truncate">
            {match.list_emoji ?? '📋'} {match.list_name}
          </span>
        </span>
        <ChevronRight size={16} className="text-faint flex-shrink-0" />
      </button>
    </div>
  )
}
