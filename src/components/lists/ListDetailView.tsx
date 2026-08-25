import { useState } from 'react'
import { Plus, ArrowLeft, ChevronDown, Pencil } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchField } from '@/components/ui/SearchField'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import { selectListItemGroups } from '@/lib/selectors'
import { normalizaParaBuscar } from '@/lib/text'
import type { List, ListItem } from '@/types'
import { ListItemRow } from './ListItemRow'

interface ListDetailViewProps {
  list: List
  items: ListItem[]
  onBack: () => void
  onToggle: (id: string) => void
  onQuantity: (id: string, quantity: number) => void
  onOpenEdit: () => void
  onOpenAddItem: () => void
  onOpenEditItem: (item: ListItem) => void
  onOpenMoveItem: (item: ListItem) => void
  onDeleteItem: (id: string) => void
  /** Con una sola lista no hay a dónde mover: el botón sobra. */
  puedeMover: boolean
}

/**
 * El título de un grupo de la lista, con lo que le toque a la derecha: la cuenta
 * de lo que falta, o el botón de plegar el catálogo.
 *
 * La cuenta solo va en los pendientes. Cuántas cosas faltan **ahora** es la
 * pregunta de la pantalla; el tamaño del catálogo no se cuenta a propósito, que
 * eso sería medir lo hecho.
 *
 * El botón va en esta misma fila y no debajo: suelto entre el título y las filas
 * quedaba flotando, y "LO DE SIEMPRE" con "Ocultar lo de siempre" debajo decía
 * dos veces lo mismo en dos renglones.
 */
function GrupoTitulo({ titulo, cuenta, accion }: { titulo: string; cuenta?: number; accion?: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-2 px-1 pt-1">
      <h2 className="min-w-0 truncate text-xs font-bold uppercase tracking-widest text-muted">{titulo}</h2>
      {cuenta !== undefined && cuenta > 0 && (
        <span className="flex-shrink-0 rounded-full bg-line px-2 py-0.5 text-xs font-bold text-muted">{cuenta}</span>
      )}
      {accion}
    </div>
  )
}

export function ListDetailView({
  list, items, onBack, onToggle, onQuantity, onOpenEdit, onOpenAddItem, onOpenEditItem, onOpenMoveItem, onDeleteItem, puedeMover,
}: ListDetailViewProps) {
  const [busqueda, setBusqueda] = useState('')
  // Una lista es lo que falta. Lo demás —lo de siempre, lo que ya tenéis— es el
  // catálogo del que se tira para apuntar, y **arranca abierto**: entrar en una
  // lista es casi siempre ir a apuntar de ahí, y plegado costaba un toque de más
  // cada vez. Sigue plegándose a mano cuando estorba, pero el estado no se
  // guarda: cada vez que se abre la lista vuelve a estar abierto.

  const [verHechos, setVerHechos] = useState(true)

  const puedeBuscar = items.length >= MINIMO_PARA_BUSCAR
  const consulta = normalizaParaBuscar(busqueda.trim())
  const buscando = consulta.length > 0
  const visibles = buscando
    ? items.filter(item => normalizaParaBuscar(item.text).includes(consulta))
    : items

  const { pending, completed } = selectListItemGroups(visibles)

  // Buscando se enseña todo: si lo único que coincide está en el catálogo,
  // esconderlo detrás del plegado sería contestar "no hay nada" a una búsqueda
  // que sí encontró algo.
  const hechosVisibles = verHechos || buscando

  // Los dos grupos van siempre bajo su título, que es lo que hacía falta: antes
  // los pendientes y el catálogo se sucedían sin nada que dijera dónde acababa
  // uno, y se distinguían solo por el fondo de la fila. Buscando, el grupo sin
  // coincidencias se calla en vez de decir "no falta nada": no es que no falte,
  // es que no ha aparecido en esta búsqueda.
  const verPendientes = pending.length > 0 || !buscando
  const verCatalogo = completed.length > 0

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
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {items.length === 0 ? (
          <EmptyState
            emoji="📝"
            title="Esta lista está vacía"
            description="Apunta lo primero que haga falta"
          />
        ) : visibles.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            Ningún ítem coincide con «{busqueda.trim()}».
          </p>
        ) : (
          <>
            {verPendientes && (
              <section className="space-y-2">
                <GrupoTitulo titulo="Hace falta ahora" cuenta={pending.length} />
                {pending.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-muted">No falta nada de esta lista</p>
                ) : (
                  pending.map(item => (
                    <ListItemRow
                      key={item.id}
                      item={item}
                      puedeMover={puedeMover}
                      onToggle={() => onToggle(item.id)}
                      onQuantity={q => onQuantity(item.id, q)}
                      onEdit={() => onOpenEditItem(item)}
                      onMove={() => onOpenMoveItem(item)}
                      onDelete={() => onDeleteItem(item.id)}
                    />
                  ))
                )}
              </section>
            )}

            {verCatalogo && (
              <section className="space-y-2">
                <GrupoTitulo
                  titulo="Lo de siempre"
                  /* Buscando no se ofrece plegar: lo que coincide se enseña. */
                  accion={!buscando && (
                    <button
                      type="button"
                      onClick={() => setVerHechos(v => !v)}
                      aria-expanded={verHechos}
                      className="flex min-h-8 flex-shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-bold text-muted transition-colors hover:bg-surface hover:text-ink"
                    >
                      {verHechos ? 'Ocultar lo de siempre' : 'Ver lo de siempre'}
                      <ChevronDown
                        size={14}
                        strokeWidth={2.6}
                        className={`transition-transform ${verHechos ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                />
                {hechosVisibles && completed.map(item => (
                  <ListItemRow
                    key={item.id}
                    item={item}
                    puedeMover={puedeMover}
                    onToggle={() => onToggle(item.id)}
                    onQuantity={q => onQuantity(item.id, q)}
                    onEdit={() => onOpenEditItem(item)}
                    onMove={() => onOpenMoveItem(item)}
                    onDelete={() => onDeleteItem(item.id)}
                  />
                ))}
              </section>
            )}
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
