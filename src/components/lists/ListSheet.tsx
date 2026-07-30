'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import type { List, ListDraft } from '@/types'

const EMOJIS = ['🛒', '🍎', '💊', '🎒', '🏠', '📚', '🎮', '🐾', '✈️', '🎁', '📋', '🧺', '🔧', '💡', '🌿', '🎨']

interface ListSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: List | null
  onClose: () => void
  onCreate: (draft: ListDraft) => void
  onUpdate: (id: string, draft: ListDraft) => void
  onDelete: (id: string) => void
}

function initDraft(mode: 'create' | 'edit', initial: List | null | undefined): ListDraft {
  if (mode === 'edit' && initial) return { name: initial.name, emoji: initial.emoji ?? '📋' }
  return { name: '', emoji: '📋' }
}

export function ListSheet({ open, mode, initial, onClose, onCreate, onUpdate, onDelete }: ListSheetProps) {
  const [draft, setDraft] = useState<ListDraft>(() => initDraft(mode, initial))
  const { confirming: confirmDelete, requestConfirm } = useConfirmAction()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) return
    if (mode === 'create') onCreate(draft)
    else if (initial) onUpdate(initial.id, draft)
    onClose()
  }

  function handleDelete() {
    if (!initial) return
    requestConfirm(() => { onDelete(initial.id); onClose() })
  }

  const footer = (
    <div className="px-5 pb-8 pt-3 space-y-2">
      <Button type="submit" form="list-form" fullWidth size="lg" disabled={!draft.name.trim()}>
        {mode === 'create' ? 'Crear lista' : 'Guardar'}
      </Button>
      {mode === 'edit' && (
        <button
          type="button"
          onClick={handleDelete}
          className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${confirmDelete ? 'bg-[#D96C6C] text-white' : 'text-[#D96C6C] hover:bg-[#FDE8E8]'}`}
        >
          <span className="flex items-center justify-center gap-2">
            <Trash2 size={15} />
            {confirmDelete ? 'Confirmar eliminación' : 'Eliminar lista'}
          </span>
        </button>
      )}
    </div>
  )

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? 'Nueva lista' : 'Editar lista'}
      onClose={onClose}
      footer={footer}
    >
      <form id="list-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        {/* Nombre */}
        <div className="space-y-1.5">
          <label htmlFor="list-name" className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Nombre</label>
          <input
            id="list-name"
            ref={inputRef}
            type="text"
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="Ej: Compra del fin de semana"
            required
            className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
          />
        </div>

        {/* Emoji */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Icono</label>
          <div className="grid grid-cols-8 gap-2">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => setDraft(d => ({ ...d, emoji }))}
                className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-colors ${draft.emoji === emoji ? 'bg-[#8BA888]/20 ring-2 ring-[#8BA888]' : 'bg-[#FAF7F2] hover:bg-[#F0EDE8]'}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </form>
    </BottomSheet>
  )
}
