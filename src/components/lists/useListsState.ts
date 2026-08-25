import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store-context'
import { selectItemMatches, selectPendingTextsByList, selectSortedLists } from '@/lib/selectors'
import type { List, ListItem, ListItemDraft } from '@/types'

export function useListsState() {
  const {
    lists, allListItems,
    createList, updateList, deleteList,
    createListItem, updateListItem, deleteListItem, toggleListItem, setListItemQuantity,
  } = useStore()

  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [busqueda,       setBusqueda]       = useState('')
  const [listSheetOpen,  setListSheetOpen]  = useState(false)
  const [itemSheetOpen,  setItemSheetOpen]  = useState(false)
  const [moveSheetOpen,  setMoveSheetOpen]  = useState(false)
  const [editingList,    setEditingList]    = useState<List | null>(null)
  const [editingItem,    setEditingItem]    = useState<ListItem | null>(null)
  const [movingItem,     setMovingItem]     = useState<ListItem | null>(null)
  const [listMode,       setListMode]       = useState<'create' | 'edit'>('create')
  const [itemMode,       setItemMode]       = useState<'create' | 'edit'>('create')

  // Las claves llevan prefijo porque los dos sheets son hermanos: sin él, al
  // no haber nada en edición ambos valían 'create' y React avisaba de claves
  // duplicadas, con riesgo de confundir el estado de un formulario con el otro.
  const listSheetKey = editingList ? `list-edit-${editingList.id}` : 'list-create'
  const itemSheetKey = editingItem ? `item-edit-${editingItem.id}` : 'item-create'

  function openCreateList()         { setEditingList(null);  setListMode('create'); setListSheetOpen(true) }
  function openEditList(l: List)    { setEditingList(l);     setListMode('edit');   setListSheetOpen(true) }
  function openAddItem()            { setEditingItem(null);  setItemMode('create'); setItemSheetOpen(true) }
  function openEditItem(i: ListItem){ setEditingItem(i);     setItemMode('edit');   setItemSheetOpen(true) }

  function handleDeleteList(id: string)           { deleteList(id); setSelectedListId(null) }
  function handleCreateItem(draft: ListItemDraft) { if (selectedListId) createListItem(selectedListId, draft) }

  // Al cerrar solo se baja la persiana: el ítem sigue puesto hasta que se abra
  // otro. Si se borrara aquí, el sheet se quedaría sin título y sin lista de
  // origen que excluir durante los 300 ms que tarda en salir de pantalla.
  function openMoveItem(i: ListItem) { setMovingItem(i); setMoveSheetOpen(true) }
  function closeMoveItem()           { setMoveSheetOpen(false) }

  /** Mover conserva el texto: solo cambia de lista. */
  function handleMoveItem(listId: string) {
    if (movingItem) updateListItem(movingItem.id, { text: movingItem.text, list_id: listId })
  }

  const listItemsByListId = useMemo(() => {
    const porLista = new Map<string, ListItem[]>()
    for (const item of allListItems) {
      const items = porLista.get(item.list_id)
      if (items) items.push(item)
      else porLista.set(item.list_id, [item])
    }
    return porLista
  }, [allListItems])

  const pendingByListId = useMemo(() => selectPendingTextsByList(allListItems), [allListItems])

  const selectedList  = selectedListId ? lists.find(l => l.id === selectedListId) ?? null : null
  const selectedItems = selectedListId ? listItemsByListId.get(selectedListId) ?? [] : []

  // Las que tienen algo pendiente arriba, y cada grupo por orden alfabético.
  const listasOrdenadas = useMemo(() => selectSortedLists(lists, allListItems), [lists, allListItems])

  const coincidencias = selectItemMatches(allListItems, lists, busqueda)
  const historialItems = allListItems.map(item => item.text)

  /** Al entrar en una lista desde un resultado, la búsqueda ya sobra. */
  function abrirLista(id: string) {
    setSelectedListId(id)
    setBusqueda('')
  }

  return {
    lists: listasOrdenadas, allListItems, pendingByListId,
    selectedList, selectedItems,
    selectedListId, setSelectedListId,
    busqueda, setBusqueda, coincidencias, abrirLista, historialItems,
    listSheetOpen, setListSheetOpen,
    itemSheetOpen, setItemSheetOpen,
    editingList, editingItem,
    listMode, itemMode,
    listSheetKey, itemSheetKey,
    movingItem, moveSheetOpen, openMoveItem, closeMoveItem, handleMoveItem,
    openCreateList, openEditList, openAddItem, openEditItem,
    createList, updateList, handleDeleteList,
    handleCreateItem, updateListItem, deleteListItem,
    toggleListItem,
    setListItemQuantity,
  }
}
