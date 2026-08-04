'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import type { List, ListItem } from '@/types'

interface MoveItemSheetProps {
  open: boolean
  item: ListItem | null
  lists: List[]
  onClose: () => void
  onMove: (listId: string) => void
}

/**
 * Elegir a qué lista se va un ítem, en un toque.
 *
 * Mover ya se podía desde "Editar ítem", pero escondido tras dos gestos que
 * nadie adivina: saber que el texto es pulsable y que ese formulario, además
 * de renombrar, mueve. Aquí no hay formulario ni botón de guardar: se toca la
 * lista destino y ya está.
 */
export function MoveItemSheet({ open, item, lists, onClose, onMove }: MoveItemSheetProps) {
  // La lista actual no se ofrece: mover algo a donde ya está no es una opción.
  const destinos = lists.filter(list => list.id !== item?.list_id)

  return (
    <BottomSheet
      open={open}
      title={item ? `Mover «${item.text}»` : 'Mover ítem'}
      onClose={onClose}
      footer={
        <div className="px-5 py-4">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-muted transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
        </div>
      }
    >
      <div className="px-5 pb-2">
        {destinos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No hay otra lista a la que moverlo. Crea una desde la pantalla de listas.
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {destinos.map(list => (
              <li key={list.id}>
                <button
                  onClick={() => { onMove(list.id); onClose() }}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-canvas"
                >
                  <span className="w-8 text-center text-xl flex-shrink-0">{list.emoji ?? '📋'}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{list.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  )
}
