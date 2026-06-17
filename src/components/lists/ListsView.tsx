'use client'

import { useState } from 'react'
import { Plus, ChevronRight, ArrowLeft, Pencil, Check, Trash2 } from 'lucide-react'
import { useStore } from '@/lib/store-context'
import { ListSheet } from './ListSheet'
import { ItemSheet } from './ItemSheet'
import type { List, ListItem, ListDraft, ListItemDraft } from '@/types'

// ─── Lista de listas ──────────────────────────────────────────────────────────

function ListCard({ list, total, done, onClick }: { list: List; total: number; done: number; onClick: () => void }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-[#F0EDE8] shadow-sm px-4 py-4 flex items-center gap-3 hover:bg-[#FDFBF8] active:bg-[#FAF7F2] transition-colors text-left"
    >
      <span className="text-2xl w-10 text-center flex-shrink-0">{list.emoji ?? '📋'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#252525] text-sm leading-tight">{list.name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
            <div className="h-full bg-[#8BA888] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-[#77716A] font-semibold flex-shrink-0">
            {done}/{total}
          </span>
        </div>
      </div>
      <ChevronRight size={16} className="text-[#C4BFB9] flex-shrink-0" />
    </button>
  )
}

// ─── Detalle de lista ─────────────────────────────────────────────────────────

function ListDetailView({
  list,
  items,
  onBack,
  onToggle,
  onOpenEdit,
  onOpenAddItem,
  onOpenEditItem,
  onDeleteItem,
}: {
  list: List
  items: ListItem[]
  onBack: () => void
  onToggle: (id: string) => void
  onOpenEdit: () => void
  onOpenAddItem: () => void
  onOpenEditItem: (item: ListItem) => void
  onDeleteItem: (id: string) => void
}) {
  const pending   = items.filter(i => !i.completed).sort((a, b) => a.sort_order - b.sort_order)
  const completed = items.filter(i => i.completed).sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full text-[#77716A] hover:bg-[#F0EDE8] transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <span className="text-xl">{list.emoji ?? '📋'}</span>
        <h1 className="flex-1 font-extrabold text-[#252525] text-lg leading-tight truncate">{list.name}</h1>
        <button onClick={onOpenEdit} className="w-8 h-8 flex items-center justify-center rounded-full text-[#C4BFB9] hover:text-[#77716A] hover:bg-[#F0EDE8] transition-colors flex-shrink-0">
          <Pencil size={15} />
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {pending.length === 0 && completed.length === 0 && (
          <p className="text-center text-[#77716A] text-sm py-12">Lista vacía. ¡Añade el primer ítem!</p>
        )}

        {pending.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-[#F0EDE8] shadow-sm flex items-center gap-2 px-2 py-2">
            <button
              onClick={() => onToggle(item.id)}
              aria-label="Marcar como hecho"
              className="flex-shrink-0 flex items-center justify-center w-12 min-h-[44px] active:bg-[#F0F7F0] transition-colors group"
            >
              <span className="w-6 h-6 rounded-full border-2 border-[#C4BFB9] group-hover:border-[#8BA888] group-active:border-[#8BA888] flex items-center justify-center transition-all duration-200">
                <Check size={13} strokeWidth={3} className="text-[#C4BFB9] group-hover:text-[#8BA888] transition-colors" />
              </span>
            </button>
            <button
              onClick={() => onOpenEditItem(item)}
              className="flex-1 text-left text-sm font-medium text-[#252525] leading-snug"
            >
              {item.text}
            </button>
            <button
              onClick={() => onDeleteItem(item.id)}
              aria-label="Eliminar ítem"
              className="w-7 h-7 flex items-center justify-center rounded-full text-[#C4BFB9] hover:text-[#D96C6C] hover:bg-[#FDE8E8] flex-shrink-0 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {completed.length > 0 && (
          <>
            <p className="text-xs font-bold text-[#77716A] uppercase tracking-widest pt-2 px-1">Hecho</p>
            {completed.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-[#F0EDE8] flex items-center gap-2 px-2 py-2 opacity-60">
                <button
                  onClick={() => onToggle(item.id)}
                  aria-label="Marcar como pendiente"
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 active:bg-[#F0F7F0] transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-[#8BA888] border-2 border-[#8BA888] flex items-center justify-center">
                    <Check size={13} strokeWidth={3} className="text-white" />
                  </span>
                </button>
                <button
                  onClick={() => onOpenEditItem(item)}
                  className="flex-1 text-left text-sm font-medium text-[#77716A] line-through leading-snug"
                >
                  {item.text}
                </button>
                <button
                  onClick={() => onDeleteItem(item.id)}
                  aria-label="Eliminar ítem"
                  className="w-7 h-7 flex items-center justify-center rounded-full text-[#C4BFB9] hover:text-[#D96C6C] hover:bg-[#FDE8E8] flex-shrink-0 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Añadir ítem */}
      <div className="px-4 pb-6 pt-2 border-t border-[#F5F2EE]">
        <button
          onClick={onOpenAddItem}
          className="w-full flex items-center gap-2 py-3 px-4 rounded-2xl border-2 border-dashed border-[#D8D4CE] text-[#8BA888] hover:border-[#8BA888] hover:bg-[#F5F9F5] transition-colors text-sm font-semibold"
        >
          <Plus size={16} />
          Añadir ítem
        </button>
      </div>
    </div>
  )
}

// ─── Vista principal ──────────────────────────────────────────────────────────

export function ListsView() {
  const { lists, allListItems, createList, updateList, deleteList, createListItem, updateListItem, deleteListItem, toggleListItem } = useStore()

  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [listSheetOpen,  setListSheetOpen]  = useState(false)
  const [itemSheetOpen,  setItemSheetOpen]  = useState(false)
  const [editingList,    setEditingList]    = useState<List | null>(null)
  const [editingItem,    setEditingItem]    = useState<ListItem | null>(null)
  const [listMode,       setListMode]       = useState<'create' | 'edit'>('create')
  const [itemMode,       setItemMode]       = useState<'create' | 'edit'>('create')

  const listSheetKey = editingList ? `edit-${editingList.id}` : 'create'
  const itemSheetKey = editingItem ? `edit-${editingItem.id}` : 'create'

  function openCreateList() { setEditingList(null); setListMode('create'); setListSheetOpen(true) }
  function openEditList(list: List) { setEditingList(list); setListMode('edit'); setListSheetOpen(true) }
  function openAddItem() { setEditingItem(null); setItemMode('create'); setItemSheetOpen(true) }
  function openEditItem(item: ListItem) { setEditingItem(item); setItemMode('edit'); setItemSheetOpen(true) }

  const handleCreateList = (draft: ListDraft) => createList(draft)
  const handleUpdateList = (id: string, draft: ListDraft) => updateList(id, draft)
  const handleDeleteList = (id: string) => { deleteList(id); setSelectedListId(null) }

  const handleCreateItem = (draft: ListItemDraft) => { if (selectedListId) createListItem(selectedListId, draft) }
  const handleUpdateItem = (id: string, draft: ListItemDraft) => updateListItem(id, draft)
  const handleDeleteItem = (id: string) => deleteListItem(id)

  const selectedList = selectedListId ? lists.find(l => l.id === selectedListId) : null
  const selectedItems = selectedListId ? allListItems.filter(i => i.list_id === selectedListId) : []

  if (selectedList) {
    return (
      <div className="max-w-lg mx-auto h-full flex flex-col">
        <ListDetailView
          list={selectedList}
          items={selectedItems}
          onBack={() => setSelectedListId(null)}
          onToggle={toggleListItem}
          onOpenEdit={() => openEditList(selectedList)}
          onOpenAddItem={openAddItem}
          onOpenEditItem={openEditItem}
          onDeleteItem={handleDeleteItem}
        />

        <ListSheet
          key={listSheetKey}
          open={listSheetOpen}
          mode={listMode}
          initial={editingList}
          onClose={() => setListSheetOpen(false)}
          onCreate={handleCreateList}
          onUpdate={handleUpdateList}
          onDelete={handleDeleteList}
        />

        <ItemSheet
          key={itemSheetKey}
          open={itemSheetOpen}
          mode={itemMode}
          initial={editingItem}
          onClose={() => setItemSheetOpen(false)}
          onCreate={handleCreateItem}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
        />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#252525] leading-tight">Listas</h1>
          <p className="text-xs text-[#77716A] mt-0.5">{lists.length} lista{lists.length !== 1 ? 's' : ''} de la familia</p>
        </div>
        <button
          onClick={openCreateList}
          aria-label="Nueva lista"
          className="w-10 h-10 bg-[#8BA888] text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#7a9877] transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Lista de listas */}
      {lists.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-bold text-[#252525]">Sin listas todavía</p>
          <p className="text-sm text-[#77716A] mt-1">Crea la primera lista de la familia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lists.map(list => {
            const items = allListItems.filter(i => i.list_id === list.id)
            const done  = items.filter(i => i.completed).length
            return (
              <ListCard
                key={list.id}
                list={list}
                total={items.length}
                done={done}
                onClick={() => setSelectedListId(list.id)}
              />
            )
          })}
        </div>
      )}

      <ListSheet
        key={listSheetKey}
        open={listSheetOpen}
        mode={listMode}
        initial={editingList}
        onClose={() => setListSheetOpen(false)}
        onCreate={handleCreateList}
        onUpdate={handleUpdateList}
        onDelete={handleDeleteList}
      />
    </div>
  )
}
