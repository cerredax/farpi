'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ListItem, ListItemDraft } from '@/types'

interface ItemSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: ListItem | null
  onClose: () => void
  onCreate: (draft: ListItemDraft) => void
  onUpdate: (id: string, draft: ListItemDraft) => void
  onDelete: (id: string) => void
}

function initDraft(mode: 'create' | 'edit', initial: ListItem | null | undefined): ListItemDraft {
  if (mode === 'edit' && initial) return { text: initial.text }
  return { text: '' }
}

export function ItemSheet({ open, mode, initial, onClose, onCreate, onUpdate, onDelete }: ItemSheetProps) {
  const [draft, setDraft]           = useState<ListItemDraft>(() => initDraft(mode, initial))
  const [confirmDelete, setConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.text.trim()) return
    if (mode === 'create') onCreate(draft)
    else if (initial) onUpdate(initial.id, draft)
    onClose()
  }

  function handleDelete() {
    if (!initial) return
    if (!confirmDelete) { setConfirm(true); return }
    onDelete(initial.id)
    onClose()
  }

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-[#E0DDD8]" /></div>
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="font-extrabold text-[#252525] text-base">{mode === 'create' ? 'Añadir ítem' : 'Editar ítem'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-[#77716A] hover:bg-[#F0EDE8] transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 pb-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Ítem</label>
            <input
              ref={inputRef}
              type="text"
              value={draft.text}
              onChange={e => setDraft({ text: e.target.value })}
              placeholder="Ej: Leche entera"
              required
              className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
            />
          </div>
          <div className="space-y-2 pt-1">
            <Button type="submit" fullWidth size="lg" disabled={!draft.text.trim()}>
              {mode === 'create' ? 'Añadir' : 'Guardar'}
            </Button>
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${confirmDelete ? 'bg-[#D96C6C] text-white' : 'text-[#D96C6C] hover:bg-[#FDE8E8]'}`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Trash2 size={15} />
                  {confirmDelete ? 'Confirmar' : 'Eliminar ítem'}
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  )
}
