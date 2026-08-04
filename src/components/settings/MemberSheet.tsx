'use client'

import { useState, useTransition } from 'react'
import { ShieldCheck, User } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { PERSON_COLORS } from '@/lib/constants'
import { isValidEmail } from '@/lib/validators'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import type { FamilyMember } from '@/types'

type Mode = 'invite' | 'edit'
type Role = 'admin' | 'member'

interface MemberSheetProps {
  open: boolean
  mode: Mode
  initial?: FamilyMember | null
  isOnlyAdmin?: boolean
  /** El color que se le está mostrando hoy, elegido o heredado de su posición. */
  defaultColor?: string
  onClose: () => void
  onInvite: (email: string) => Promise<void>
  onUpdate: (id: string, name: string, color: string | null) => void
  onChangeRole?: (id: string, role: Role) => Promise<void>
  onRemove: (id: string) => void
}

interface MemberDraft {
  name: string
  email: string
  color: string
}

function initDraft(mode: Mode, initial: FamilyMember | null | undefined, defaultColor: string): MemberDraft {
  return {
    name:  mode === 'edit' ? (initial?.display_name ?? '') : '',
    email: '',
    // Si nunca eligió color, el selector arranca marcando el que ya se le ve.
    color: initial?.color ?? defaultColor,
  }
}

export function MemberSheet({ open, mode, initial, isOnlyAdmin = false, defaultColor = PERSON_COLORS[0].value, onClose, onInvite, onUpdate, onChangeRole, onRemove }: MemberSheetProps) {
  const { draft, patch, formError, setFormError, firstFieldRef, submitHandler } = useSheetForm<MemberDraft>({
    open,
    initialDraft: () => initDraft(mode, initial, defaultColor),
    validate: d => mode === 'invite'
      ? (isValidEmail(d.email) ? null : 'Introduce un email válido.')
      : (d.name.trim() ? null : 'El nombre no puede estar vacío.'),
  })
  const { confirming: confirmRemove, handleDelete: handleRemove } = useSheetDelete({
    initial,
    onDelete: onRemove,
    onClose,
  })
  const [role, setRole] = useState<Role>(initial?.role ?? 'member')
  const [roleError, setRoleError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

  const handleSubmit = submitHandler(valid => {
    if (mode === 'invite') {
      startTransition(async () => {
        try {
          await onInvite(valid.email.trim())
          onClose()
        } catch (err) {
          setFormError(err instanceof Error ? err.message : 'Error al enviar la invitación')
        }
      })
      return
    }
    if (!initial) return
    onUpdate(initial.id, valid.name.trim(), valid.color)
    onClose()
  })

  return (
    <BottomSheet
      open={open}
      title={mode === 'invite' ? 'Invitar persona' : 'Editar miembro'}
      onClose={onClose}
      footer={
        <SheetFooter
          form="member-form"
          submitLabel={isPending ? 'Enviando…' : mode === 'invite' ? 'Enviar invitación' : 'Guardar'}
          disabled={isPending || (mode === 'invite' ? !isValidEmail(draft.email) : !draft.name.trim())}
          onDelete={mode === 'edit'
            ? { confirming: confirmRemove, onClick: handleRemove, idleLabel: 'Quitar miembro', confirmLabel: 'Confirmar eliminación' }
            : undefined}
        />
      }
    >
      <form id="member-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-4">
        {mode === 'invite' ? (
          <Field label="Email" htmlFor="member-email">
            <input
              id="member-email"
              ref={firstFieldRef}
              type="email"
              value={draft.email}
              onChange={e => { patch({ email: e.target.value }); setFormError(null) }}
              placeholder="correo@ejemplo.com"
              required
              className="field-input"
            />
            {formError ? (
              <p className="text-[11px] text-danger font-medium">{formError}</p>
            ) : (
              <p className="text-[10px] text-faint">
                En modo demo, la invitación no se envía. El email queda guardado como referencia.
              </p>
            )}
          </Field>
        ) : (
          <Field label="Nombre" htmlFor="member-name">
            <input
              id="member-name"
              ref={firstFieldRef}
              type="text"
              value={draft.name}
              onChange={e => patch({ name: e.target.value })}
              placeholder="Nombre visible"
              required
              className="field-input"
            />

            <div className="space-y-1.5 pt-2">
              <label className="field-label">Color</label>
              <ColorPicker value={draft.color} onChange={color => patch({ color })} />
              <p className="text-[10px] text-faint">
                Identifica a esta persona en el calendario y en los documentos.
              </p>
            </div>

            {onChangeRole && (
              <div className="space-y-1.5 pt-2">
                <label className="field-label">Rol</label>
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
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${role === value ? 'border-primary bg-primary-tint text-primary-strong' : 'border-line bg-canvas text-muted hover:bg-surface'}`}
                    >
                      <Icon size={15} strokeWidth={2.3} />
                      {label}
                    </button>
                  ))}
                </div>
                {roleError
                  ? <p className="text-[11px] text-danger font-medium">{roleError}</p>
                  : <p className="text-[10px] text-faint">Los administradores gestionan miembros, invitaciones y ajustes de la familia.</p>
                }
              </div>
            )}
          </Field>
        )}
      </form>
    </BottomSheet>
  )
}
