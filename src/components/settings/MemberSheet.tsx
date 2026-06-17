'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { isValidEmail } from '@/lib/validators'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import type { FamilyMember } from '@/types'

type Mode = 'invite' | 'edit'

interface MemberSheetProps {
  open: boolean
  mode: Mode
  initial?: FamilyMember | null
  onClose: () => void
  onInvite: (email: string) => void
  onUpdate: (id: string, name: string) => void
  onRemove: (id: string) => void
}

function initDraft(mode: Mode, initial: FamilyMember | null | undefined) {
  return {
    name:  mode === 'edit' ? (initial?.display_name ?? '') : '',
    email: '',
  }
}

export function MemberSheet({ open, mode, initial, onClose, onInvite, onUpdate, onRemove }: MemberSheetProps) {
  const [draft, setDraft] = useState(() => initDraft(mode, initial))
  const { confirming: confirmRemove, requestConfirm } = useConfirmAction()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'invite') {
      if (!isValidEmail(draft.email)) return
      onInvite(draft.email.trim())
    } else {
      if (!draft.name.trim() || !initial) return
      onUpdate(initial.id, draft.name.trim())
    }
    onClose()
  }

  function handleRemove() {
    if (!initial) return
    requestConfirm(() => { onRemove(initial.id); onClose() })
  }

  const footer = (
    <div className="px-5 pb-8 pt-3 space-y-2">
      <Button
        type="submit"
        form="member-form"
        fullWidth
        size="lg"
        disabled={mode === 'invite' ? !isValidEmail(draft.email) : !draft.name.trim()}
      >
        {mode === 'invite' ? 'Enviar invitación' : 'Guardar'}
      </Button>
      {mode === 'edit' && (
        <button
          type="button"
          onClick={handleRemove}
          className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${confirmRemove ? 'bg-[#D96C6C] text-white' : 'text-[#D96C6C] hover:bg-[#FDE8E8]'}`}
        >
          <span className="flex items-center justify-center gap-2">
            <Trash2 size={15} />
            {confirmRemove ? 'Confirmar eliminación' : 'Quitar miembro'}
          </span>
        </button>
      )}
    </div>
  )

  return (
    <BottomSheet
      open={open}
      title={mode === 'invite' ? 'Invitar persona' : 'Editar miembro'}
      onClose={onClose}
      footer={footer}
    >
      <form id="member-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-4">
        {mode === 'invite' ? (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Email</label>
            <input
              ref={inputRef}
              type="email"
              value={draft.email}
              onChange={e => setDraft(d => ({ ...d, email: e.target.value }))}
              placeholder="correo@ejemplo.com"
              required
              className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
            />
            <p className="text-[10px] text-[#C4BFB9]">
              En modo demo, la invitación no se envía. El email queda guardado como referencia.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Nombre</label>
            <input
              ref={inputRef}
              type="text"
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Nombre visible"
              required
              className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
            />
          </div>
        )}
      </form>
    </BottomSheet>
  )
}
