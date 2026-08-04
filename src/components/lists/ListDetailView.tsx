import { useState } from 'react'
import { Plus, ArrowLeft, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { CircleCheck } from '@/components/ui/CircleCheck'
import { SearchField } from '@/components/ui/SearchField'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import { selectListItemGroups } from '@/lib/selectors'
import { normalizaParaBuscar } from '@/lib/text'
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
  const [busqueda, setBusqueda] = useState('')
  // Lo hecho arranca plegado: una lista es lo que falta. Tachado y a la vista
  // crecía para siempre, y al mes había que pasar por encima de cuarenta cosas
  // resueltas para ver las tres que quedaban.
  const [verHechos, setVerHechos] = useState(false)

  const puedeBuscar = items.length >= MINIMO_PARA_BUSCAR
  const consulta = normalizaParaBuscar(busqueda.trim())
  const visibles = consulta
    ? items.filter(item => normalizaParaBuscar(item.text).includes(consulta))
    : items

  const { pending, completed } = selectListItemGroups(visibles)

  // Buscando se enseña todo: si lo único que coincide está hecho, esconderlo
  // detrás del plegado sería contestar "no hay nada" a una búsqueda que sí
  // encontró algo.
  const hechosVisibles = verHechos || consulta.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button onClick={onBack} aria-label="Volver a las listas" className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:bg-surface transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <span className="text-xl">{list.emoji ?? '📋'}</span>
        <h1 className="flex-1 font-extrabold text-ink text-lg leading-tight truncate">{list.name}</h1>
        <button onClick={onOpenEdit} className="w-8 h-8 flex items-center justify-center rounded-full text-faint hover:text-muted hover:bg-surface transition-colors flex-shrink-0">
          <Pencil size={15} />
        </button>
      </div>

      {puedeBuscar && (
        <div className="px-4 pb-2">
          <SearchField
            value={busqueda}
            onChange={setBusqueda}
            placeholder={`Buscar en ${items.length} ítems…`}
            ariaLabel="Buscar ítems en la lista"
          />
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {items.length === 0 && (
          <p className="text-center text-muted text-sm py-12">Lista vacía. ¡Añade el primer ítem!</p>
        )}

        {items.length > 0 && visibles.length === 0 && (
          <p className="text-center text-muted text-sm py-12">
            Ningún ítem coincide con «{busqueda.trim()}».
          </p>
        )}

        {pending.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-surface shadow-sm flex items-center gap-2 px-2 py-2">
            <CircleCheck checked={false} onClick={() => onToggle(item.id)} ariaLabel="Marcar como hecho" />
            <button onClick={() => onOpenEditItem(item)} className="flex-1 text-left text-sm font-medium text-ink leading-snug">
              {item.text}
            </button>
            <button onClick={() => onDeleteItem(item.id)} aria-label="Eliminar ítem" className="w-7 h-7 flex items-center justify-center rounded-full text-faint hover:text-danger hover:bg-danger-soft flex-shrink-0 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {completed.length > 0 && (
          <>
            {consulta ? (
              <p className="field-label pt-2 px-1">Hecho</p>
            ) : (
              <button
                type="button"
                onClick={() => setVerHechos(v => !v)}
                aria-expanded={verHechos}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                {verHechos ? 'Ocultar lo hecho' : 'Ver lo hecho'}
                <ChevronDown
                  size={14}
                  strokeWidth={2.6}
                  className={`transition-transform ${verHechos ? 'rotate-180' : ''}`}
                />
              </button>
            )}
            {hechosVisibles && completed.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-surface flex items-center gap-2 px-2 py-2 opacity-60">
                <CircleCheck checked={true} onClick={() => onToggle(item.id)} ariaLabel="Marcar como pendiente" />
                <button onClick={() => onOpenEditItem(item)} className="flex-1 text-left text-sm font-medium text-muted line-through leading-snug">
                  {item.text}
                </button>
                <button onClick={() => onDeleteItem(item.id)} aria-label="Eliminar ítem" className="w-7 h-7 flex items-center justify-center rounded-full text-faint hover:text-danger hover:bg-danger-soft flex-shrink-0 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Añadir ítem */}
      <div className="px-4 pb-6 pt-2 border-t border-hairline">
        <button
          onClick={onOpenAddItem}
          className="w-full flex items-center gap-2 py-3 px-4 rounded-2xl border-2 border-dashed border-line-strong text-primary hover:border-primary hover:bg-primary-tint transition-colors text-sm font-semibold"
        >
          <Plus size={16} />
          Añadir ítem
        </button>
      </div>
    </div>
  )
}
