'use client'

import { EmptyState } from '@/components/ui/EmptyState'
import { ViewHeader } from '@/components/ui/ViewHeader'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import { useT } from '@/lib/i18n/contexto'
import { ItemMatchCard } from './ItemMatchCard'
import { ListCard } from './ListCard'
import { ListDetailView } from './ListDetailView'
import { ListSheet } from './ListSheet'
import { ItemSheet } from './ItemSheet'
import { MoveItemSheet } from './MoveItemSheet'
import { useListsState } from './useListsState'

export function ListsView() {
  const s = useListsState()
  const t = useT().listas.vista

  const listSheet = (
    <ListSheet
      key={s.listSheetKey}
      open={s.listSheetOpen}
      mode={s.listMode}
      initial={s.editingList}
      itemsCount={s.itemsDeListaEditada}
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
          historial={s.historialItems}
          onOpenEdit={() => s.openEditList(s.selectedList!)}
          onQuickAdd={text => s.handleCreateItem({ text })}
          onOpenEditItem={s.openEditItem}
        />
        {listSheet}
        {/* Solo para editar: apuntar se hace en la barra de abajo de la lista
            desde el 14-09-2026. `onCreate` va porque el contrato lo pide, pero
            aquí no hay camino que llegue a él. */}
        <ItemSheet
          key={s.itemSheetKey}
          open={s.itemSheetOpen}
          mode="edit"
          initial={s.editingItem}
          historial={s.historialItems}
          onMove={s.lists.length > 1 && s.editingItem
            // Se cierra el de editar antes de abrir el de mover: son dos sheets
            // hermanos y dos `fixed` a la vez, uno encima del otro, no se leen
            // como un paso siguiente sino como una avería.
            ? () => { s.setItemSheetOpen(false); s.openMoveItem(s.editingItem!) }
            : undefined}
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

  // El sheet va **fuera** del contenedor con `space-y-*`, como hermano suyo: ahí
  // dentro, `space-y` le pone `margin-bottom` a todos los hijos menos al último,
  // y a una caja `fixed bottom-0` ese margen le sube el ancla —el
  // `translate-y-full` deja de bastar y el sheet cerrado asoma sobre las
  // etiquetas de la barra de abajo—. Estaba dentro, y lo salvaba solo ser el
  // último hijo: cualquier cosa añadida detrás lo rompía sin tocarlo.
  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 lg:max-w-5xl lg:px-6">
        <ViewHeader
          resumen={t.resumen(s.lists.length)}
          buscador={puedeBuscar ? {
            value: s.busqueda,
            onChange: s.setBusqueda,
            placeholder: t.buscarEnTodas(s.allListItems.length),
            ariaLabel: t.buscarEnTodasAria,
          } : null}
          onAdd={s.openCreateList}
          addLabel={t.nuevaLista}
        />

        {buscando ? (
          s.coincidencias.length === 0 ? (
            <EmptyState
              emoji="🔍"
              title={t.sinCoincidencias}
              description={t.ningunItem(s.busqueda.trim())}
            />
          ) : (
            <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start xl:grid-cols-3">
              <p className="field-label px-1 lg:col-span-2 xl:col-span-3">
                {t.resultados(s.coincidencias.length)}
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
          /* El emoji es el mismo 📋 con el que nace una lista sin el suyo, no el ✅
             que había: un tic aquí dice "hecho", que es justo lo contrario de lo
             que cuenta una lista. */
          <EmptyState
            emoji="📋"
            title={t.sinListas}
          />
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
      </div>

      {listSheet}
    </>
  )
}
