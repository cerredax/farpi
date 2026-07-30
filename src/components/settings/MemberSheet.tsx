'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { Trash2, ShieldCheck, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { isValidEmail } from '@/lib/validators'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import type { FamilyMember } from '@/types'

type Mode = 'invite' | 'edit'
type Role = 'admin' | 'member'

interface MemberSheetProps {
  open: boolean
  mode: Mode
  initial?: FamilyMember | null
  isOnlyAdmin?: boolean
  onClose: () => void
  onInvite: (email: string) => Promise<void>
  onUpdate: (id: string, name: string) => void
  onChangeRole?: (id: string, role: Role) => Promise<void>
  onRemove: (id: string) => void
}

function initDraft(mode: Mode, initial: FamilyMember | null | undefined) {
  return {
    name:  mode === 'edit' ? (initial?.display_name ?? '') : '',
    email: '',
  }
}

export function MemberSheet({ open, mode, initial, isOnlyAdmin = false, onClose, onInvite, onUpdate, onChangeRole, onRemove }: MemberSheetProps) {
  const [draft, setDraft] = useState(() => initDraft(mode, initial))
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [role, setRole] = useState<Role>(initial?.role ?? 'member')
  const [roleError, setRoleError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { confirming: confirmRemove, requestConfirm } = useConfirmAction()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleRoleChange(next: Role) {
    if (!initial || !onChangeRole || next === role) return
    if (next === 'member' && isOnlyAdmin) {
      setRoleError('La familia debe tener al menos un administrador.')
      return
    }
    const previous = role
    setRole(next)
    setRoleError(null)
    try {
      await onChangeRole(initial.id, next)
    } catch (err) {
      setRole(previous)
      setRoleError(err instanceof Error ? err.message : 'No se pudo cambiar el rol.')
    }
  }

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'invite') {
      if (!isValidEmail(draft.email)) return
      setInviteError(null)
      startTransition(async () => {
        try {
          await onInvite(draft.email.trim())
          onClose()
        } catch (err) {
          setInviteError(err instanceof Error ? err.message : 'Error al enviar la invitación')
        }
      })
    } else {
      if (!draft.name.trim() || !initial) return
      onUpdate(initial.id, draft.name.trim())
      onClose()
    }
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
        disabled={isPending || (mode === 'invite' ? !isValidEmail(draft.email) : !draft.name.trim())}
      >
        {isPending ? 'Enviando…' : mode === 'invite' ? 'Enviar invitación' : 'Guardar'}
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
            <label htmlFor="member-email" className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Email</label>
            <input
              id="member-email"
              ref={inputRef}
              type="email"
              value={draft.email}
              onChange={e => { setDraft(d => ({ ...d, email: e.target.value })); setInviteError(null) }}
              placeholder="correo@ejemplo.com"
              required
              className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
            />
            {inviteError ? (
              <p className="text-[11px] text-[#D96C6C] font-medium">{inviteError}</p>
            ) : (
              <p className="text-[10px] text-[#C4BFB9]">
                En modo demo, la invitación no se envía. El email queda guardado como referencia.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="member-name" className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Nombre</label>
            <input
              id="member-name"
              ref={inputRef}
              type="text"
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Nombre visible"
              required
              className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
            />

            {onChangeRole && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Rol</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'admin' as Role, label: 'Administrador', icon: ShieldCheck },
                    { value: 'member' as Role, label: 'Miembro', icon: User },
                  ]).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRoleChange(value)}
                      aria-pressed={role === value}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${role === value ? 'border-[#8BA888] bg-[#F5F9F5] text-[#5C7A59]' : 'border-[#EDE9E3] bg-[#FAF7F2] text-[#77716A] hover:bg-[#F0EDE8]'}`}
                    >
                      <Icon size={15} strokeWidth={2.3} />
                      {label}
                    </button>
                  ))}
                </div>
                {roleError
                  ? <p className="text-[11px] text-[#D96C6C] font-medium">{roleError}</p>
                  : <p className="text-[10px] text-[#C4BFB9]">Los administradores gestionan miembros, invitaciones y ajustes de la familia.</p>
                }
              </div>
            )}
          </div>
        )}
      </form>
    </BottomSheet>
  )
}
