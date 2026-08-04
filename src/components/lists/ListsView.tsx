'use client'

import { Plus } from 'lucide-react'
import { SearchField } from '@/components/ui/SearchField'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import { ItemMatchCard } from './ItemMatchCard'
import { ListCard } from './ListCard'
import { ListDetailView } from './ListDetailView'
import { ListSheet } from './ListSheet'
import { ItemSheet } from './ItemSheet'
import { useListsState } from './useListsState'

export function ListsView() {
  const s = useListsState()

  const listSheet = (
    <ListSheet
      key={s.listSheetKey}
      open={s.listSheetOpen}
      mode={s.listMode}
      initial={s.editingList}
      onClose={() => s.setListSheetOpen(false)}
      onCreate={s.handleCreateList}
      onUpdate={s.handleUpdateList}
      onDelete={s.handleDeleteList}
    />
  )

  if (s.selectedList) {
    return (
      <div className="max-w-lg mx-auto h-full flex flex-col">
        <ListDetailView
          list={s.selectedList}
          items={s.selectedItems}
          onBack={() => s.setSelectedListId(null)}
          onToggle={s.toggleListItem}
          onOpenEdit={() => s.openEditList(s.selectedList!)}
          onOpenAddItem={s.openAddItem}
          onOpenEditItem={s.openEditItem}
          onDeleteItem={s.handleDeleteItem}
        />
        {listSheet}
        <ItemSheet
          key={s.itemSheetKey}
          open={s.itemSheetOpen}
          mode={s.itemMode}
          initial={s.editingItem}
          historial={s.historialItems}
          onClose={() => s.setItemSheetOpen(false)}
          onCreate={s.handleCreateItem}
          onUpdate={s.handleUpdateItem}
          onDelete={s.handleDeleteItem}
        />
      </div>
    )
  }

  // Con cuatro ítems en total no hay nada que buscar: se ven de un vistazo.
  const puedeBuscar = s.allListItems.length >= MINIMO_PARA_BUSCAR
  const buscando = puedeBuscar && s.busqueda.trim().length > 0

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink leading-tight">Listas</h1>
          <p className="text-xs text-muted mt-0.5">{s.lists.length} lista{s.lists.length !== 1 ? 's' : ''} de la familia</p>
        </div>
        <button
          onClick={s.openCreateList}
          aria-label="Nueva lista"
          className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-hover transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {puedeBuscar && (
        <SearchField
          value={s.busqueda}
          onChange={s.setBusqueda}
          placeholder={`Buscar en ${s.allListItems.length} ítems de todas las listas…`}
          ariaLabel="Buscar ítems en todas las listas"
        />
      )}

      {buscando ? (
        s.coincidencias.length === 0 ? (
          <p className="text-center text-muted text-sm py-12">
            Ningún ítem coincide con «{s.busqueda.trim()}».
          </p>
        ) : (
          <div className="space-y-3">
            <p className="field-label px-1">
              {s.coincidencias.length} resultado{s.coincidencias.length !== 1 ? 's' : ''}
            </p>
            {s.coincidencias.map(match => (
              <ItemMatchCard key={match.id} match={match} onClick={() => s.abrirLista(match.list_id)} />
            ))}
          </div>
        )
      ) : s.lists.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-bold text-ink">Sin listas todavía</p>
          <p className="text-sm text-muted mt-1">Crea la primera lista de la familia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {s.lists.map(list => {
            const stats = s.listStatsById.get(list.id) ?? { total: 0, done: 0 }
            return (
              <ListCard
                key={list.id}
                list={list}
                total={stats.total}
                done={stats.done}
                onClick={() => s.abrirLista(list.id)}
              />
            )
          })}
        </div>
      )}

      {listSheet}
    </div>
  )
}
