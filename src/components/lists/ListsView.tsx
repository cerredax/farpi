'use client'

import { ViewHeader } from '@/components/ui/ViewHeader'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import { ItemMatchCard } from './ItemMatchCard'
import { ListCard } from './ListCard'
import { ListDetailView } from './ListDetailView'
import { ListSheet } from './ListSheet'
import { ItemSheet } from './ItemSheet'
import { MoveItemSheet } from './MoveItemSheet'
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
      onCreate={s.createList}
      onUpdate={s.updateList}
      onDelete={s.handleDeleteList}
    />
  )

  if (s.selectedList) {
    return (
      // Una lista abierta es una columna de ítems: no gana nada por ser más
      // ancha que el ojo, pero 512 px en un monitor es angosto. `3xl` es el
      // término medio.
      <div className="max-w-lg mx-auto h-full flex flex-col lg:max-w-3xl">
        <ListDetailView
          list={s.selectedList}
          items={s.selectedItems}
          onBack={() => s.setSelectedListId(null)}
          onToggle={s.toggleListItem}
          onQuantity={s.setListItemQuantity}
          onOpenEdit={() => s.openEditList(s.selectedList!)}
          onOpenAddItem={s.openAddItem}
          onOpenEditItem={s.openEditItem}
          onOpenMoveItem={s.openMoveItem}
          onDeleteItem={s.deleteListItem}
          puedeMover={s.lists.length > 1}
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
          onUpdate={s.updateListItem}
          onDelete={s.deleteListItem}
        />
        <MoveItemSheet
          open={s.moveSheetOpen}
          item={s.movingItem}
          lists={s.lists}
          onClose={s.closeMoveItem}
          onMove={s.handleMoveItem}
        />
      </div>
    )
  }

  // Con cuatro ítems en total no hay nada que buscar: se ven de un vistazo.
  const puedeBuscar = s.allListItems.length >= MINIMO_PARA_BUSCAR
  const buscando = puedeBuscar && s.busqueda.trim().length > 0

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4 lg:max-w-5xl lg:px-6">
      <ViewHeader
        resumen={`${s.lists.length} lista${s.lists.length !== 1 ? 's' : ''} de la familia`}
        buscador={puedeBuscar ? {
          value: s.busqueda,
          onChange: s.setBusqueda,
          placeholder: `Buscar en ${s.allListItems.length} ítems de todas las listas…`,
          ariaLabel: 'Buscar ítems en todas las listas',
        } : null}
        onAdd={s.openCreateList}
        addLabel="Nueva lista"
      />

      {buscando ? (
        s.coincidencias.length === 0 ? (
          <p className="text-center text-muted text-sm py-12">
            Ningún ítem coincide con «{s.busqueda.trim()}».
          </p>
        ) : (
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start xl:grid-cols-3">
            <p className="field-label px-1 lg:col-span-2 xl:col-span-3">
              {s.coincidencias.length} resultado{s.coincidencias.length !== 1 ? 's' : ''}
            </p>
            {s.coincidencias.map(match => (
              <ItemMatchCard
                key={match.id}
                match={match}
                onToggle={() => s.toggleListItem(match.id)}
                onOpenList={() => s.abrirLista(match.list_id)}
              />
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
        <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start xl:grid-cols-3">
          {s.lists.map(list => (
            <ListCard
              key={list.id}
              list={list}
              pendientes={s.pendingByListId.get(list.id) ?? []}
              onClick={() => s.abrirLista(list.id)}
            />
          ))}
        </div>
      )}

      {listSheet}
    </div>
  )
}
