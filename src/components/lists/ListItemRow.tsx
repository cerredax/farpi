import { FolderInput, Trash2 } from 'lucide-react'
import { CircleCheck } from '@/components/ui/CircleCheck'
import { CirclePlus } from '@/components/ui/CirclePlus'
import type { ListItem } from '@/types'

interface ListItemRowProps {
  item: ListItem
  /** Con una sola lista no hay a dónde mover: el botón sobra. */
  puedeMover: boolean
  onToggle: () => void
  onEdit: () => void
  onMove: () => void
  onDelete: () => void
}

/**
 * Una fila de la lista: marcar, renombrar, mover y borrar.
 *
 * Lo marcado no se tacha ni se atenúa hasta desaparecer: no es historial de lo
 * hecho, es el catálogo de lo que compráis. Está a un toque de volver a hacer
 * falta, así que solo cambia de fondo y pierde la sombra. El tic tampoco se
 * queda: en el catálogo la acción es sumar a la lista, no dar nada por hecho.
 */
export function ListItemRow({ item, puedeMover, onToggle, onEdit, onMove, onDelete }: ListItemRowProps) {
  return (
    <div className={`rounded-2xl border border-surface flex items-center gap-2 px-2 py-2 ${
      item.completed ? 'bg-canvas' : 'bg-white shadow-sm'
    }`}>
      {item.completed ? (
        <CirclePlus onClick={onToggle} ariaLabel={`Apuntar que hace falta ${item.text}`} />
      ) : (
        <CircleCheck
          checked={false}
          onClick={onToggle}
          ariaLabel={`Ya tenéis ${item.text}, quitar de lo que falta`}
        />
      )}
      <button
        onClick={onEdit}
        className={`flex-1 text-left text-sm font-medium leading-snug ${item.completed ? 'text-muted' : 'text-ink'}`}
      >
        {item.text}
      </button>
      {puedeMover && (
        <button
          onClick={onMove}
          aria-label={`Mover ${item.text} a otra lista`}
          className="w-7 h-7 flex items-center justify-center rounded-full text-faint hover:text-primary hover:bg-primary-tint flex-shrink-0 transition-colors"
        >
          <FolderInput size={14} />
        </button>
      )}
      <button
        onClick={onDelete}
        aria-label={`Eliminar ${item.text} de la lista`}
        className="w-7 h-7 flex items-center justify-center rounded-full text-faint hover:text-danger hover:bg-danger-soft flex-shrink-0 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
