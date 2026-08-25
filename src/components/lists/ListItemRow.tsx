import { FolderInput, Minus, Plus, Trash2 } from 'lucide-react'
import { MAX_UNIDADES } from '@/lib/constants'
import { CircleCheck } from '@/components/ui/CircleCheck'
import { CirclePlus } from '@/components/ui/CirclePlus'
import type { ListItem } from '@/types'

interface ListItemRowProps {
  item: ListItem
  /** Con una sola lista no hay a dónde mover: el botón sobra. */
  puedeMover: boolean
  onToggle: () => void
  onQuantity: (quantity: number) => void
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
export function ListItemRow({ item, puedeMover, onToggle, onQuantity, onEdit, onMove, onDelete }: ListItemRowProps) {
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
      {/**
        * Las unidades, **solo en lo que hace falta**. En el catálogo no pintan
        * nada: "lo de siempre" es una lista de nombres para volver a pedir, y el
        * número es de esta compra, no del nombre.
        *
        * Van en la fila y no dentro del ítem porque se tocan en el súper, con una
        * mano y sin abrir nada. Los dos botones miden 28 px, por encima del
        * mínimo de toque de 24×24 que comprueba `movil.spec.ts`.
        *
        * El menos desaparece en 1 en vez de quedarse desactivado: un botón que no
        * hace nada ocupa el mismo sitio y encima invita a pulsarlo. Y en 1 el
        * número tampoco se escribe, que "×1" es decir lo que ya dice la fila.
        */}
      {!enCatalogo && (
        <div className="flex flex-shrink-0 items-center gap-0.5">
          {item.quantity > 1 && (
            <>
              <button
                onClick={() => onQuantity(item.quantity - 1)}
                aria-label={`Quitar una unidad de ${item.text}`}
                className="flex h-7 w-7 items-center justify-center rounded-full text-faint transition-colors hover:bg-surface hover:text-ink"
              >
                <Minus size={14} strokeWidth={2.6} />
              </button>
              <span className="min-w-4 text-center text-xs font-black tabular-nums text-ink">
                {item.quantity}
              </span>
            </>
          )}
          <button
            onClick={() => onQuantity(item.quantity + 1)}
            disabled={item.quantity >= MAX_UNIDADES}
            aria-label={`Añadir una unidad de ${item.text}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-faint transition-colors hover:bg-primary-tint hover:text-primary disabled:opacity-40"
          >
            <Plus size={14} strokeWidth={2.6} />
          </button>
        </div>
      )}

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
