import { useState } from 'react'
import { useStore } from '@/lib/store-context'
import type { List, ListItem, ListDraft, ListItemDraft } from '@/types'

export function useListsState() {
  const {
    lists, allListItems,
    createList, updateList, deleteList,
    createListItem, updateListItem, deleteListItem, toggleListItem,
  } = useStore()

  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [listSheetOpen,  setListSheetOpen]  = useState(false)
  const [itemSheetOpen,  setItemSheetOpen]  = useState(false)
  const [editingList,    setEditingList]    = useState<List | null>(null)
  const [editingItem,    setEditingItem]    = useState<ListItem | null>(null)
  const [listMode,       setListMode]       = useState<'create' | 'edit'>('create')
  const [itemMode,       setItemMode]       = useState<'create' | 'edit'>('create')

  const listSheetKey = editingList ? `edit-${editingList.id}` : 'create'
  const itemSheetKey = editingItem ? `edit-${editingItem.id}` : 'create'

  function openCreateList()         { setEditingList(null);  setListMode('create'); setListSheetOpen(true) }
  function openEditList(l: List)    { setEditingList(l);     setListMode('edit');   setListSheetOpen(true) }
  function openAddItem()            { setEditingItem(null);  setItemMode('create'); setItemSheetOpen(true) }
  function openEditItem(i: ListItem){ setEditingItem(i);     setItemMode('edit');   setItemSheetOpen(true) }

  function handleCreateList(draft: ListDraft)                  { createList(draft) }
  function handleUpdateList(id: string, draft: ListDraft)      { updateList(id, draft) }
  function handleDeleteList(id: string)                        { deleteList(id); setSelectedListId(null) }
  function handleCreateItem(draft: ListItemDraft)              { if (selectedListId) createListItem(selectedListId, draft) }
  function handleUpdateItem(id: string, draft: ListItemDraft)  { updateListItem(id, draft) }
  function handleDeleteItem(id: string)                        { deleteListItem(id) }

  const listItemsByListId = new Map<string, ListItem[]>()
  const listStatsById = new Map<string, { total: number; done: number }>()

  for (const item of allListItems) {
    const items = listItemsByListId.get(item.list_id)
    if (items) items.push(item)
    else listItemsByListId.set(item.list_id, [item])

    const stats = listStatsById.get(item.list_id) ?? { total: 0, done: 0 }
    stats.total += 1
    if (item.completed) stats.done += 1
    listStatsById.set(item.list_id, stats)
  }

  const selectedList  = selectedListId ? lists.find(l => l.id === selectedListId) ?? null : null
  const selectedItems = selectedListId ? listItemsByListId.get(selectedListId) ?? [] : []

  return {
    lists, allListItems, listStatsById,
    selectedList, selectedItems,
    selectedListId, setSelectedListId,
    listSheetOpen, setListSheetOpen,
    itemSheetOpen, setItemSheetOpen,
    editingList, editingItem,
    listMode, itemMode,
    listSheetKey, itemSheetKey,
    openCreateList, openEditList, openAddItem, openEditItem,
    handleCreateList, handleUpdateList, handleDeleteList,
    handleCreateItem, handleUpdateItem, handleDeleteItem,
    toggleListItem,
  }
}
