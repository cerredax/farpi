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
 * Lo marcado no se tacha ni desaparece: no es historial de lo hecho, es el
 * catálogo de lo que compráis, a un toque de volver a hacer falta. Lo que cambia
 * entre los dos estados es la **presencia**, no la vida: lo que hace falta es una
 * tarjeta blanca con sombra y la letra fuerte; lo del catálogo va plano sobre el
 * fondo, sin sombra y con la letra más suave.
 *
 * Son tres señales y no una: la forma (tarjeta contra plano), el peso del texto y
 * el círculo (tic contra `+`). Quien no distinga un gris de un blanco tiene las
 * otras dos, y encima cada grupo va bajo su propio título.
 *
 * El nombre parte por palabras en vez de recortarse: en una lista de casa el
 * texto **es** el dato, y "Leche entera sin lac…" no sirve de nada. Con
 * `min-w-0` no puede empujar la fila a lo ancho por larga que sea.
 */
export function ListItemRow({ item, puedeMover, onToggle, onEdit, onMove, onDelete }: ListItemRowProps) {
  const enCatalogo = item.completed

  return (
    <div className={`flex items-center gap-2 rounded-2xl border px-2 py-2 transition-colors ${
      enCatalogo ? 'border-hairline bg-canvas' : 'border-surface bg-white shadow-sm'
    }`}>
      {enCatalogo ? (
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
        className={`min-w-0 flex-1 break-words text-left text-sm leading-snug ${
          enCatalogo ? 'font-medium text-muted' : 'font-semibold text-ink'
        }`}
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
