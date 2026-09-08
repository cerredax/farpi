'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { ConfirmDeleteBody, ConfirmDeleteFooter } from '@/components/ui/ConfirmDelete'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetDeleteDialog, useSheetForm } from '@/hooks/useSheetForm'
import { textColorOn } from '@/lib/assignees'
import { PERSON_COLORS } from '@/lib/constants'
import { validateChildDraft } from '@/lib/validators'
import type { Child, ChildDraft, PersonKind } from '@/types'

type Mode = 'create' | 'edit'

interface ChildSheetProps {
  open: boolean
  mode: Mode
  /** Un hijo o un adulto sin cuenta. Cambia los textos, no el formulario. */
  kind: PersonKind
  initial?: Child | null
  onClose: () => void
  onCreate: (draft: ChildDraft) => void
  onUpdate: (id: string, draft: ChildDraft) => void
  onDelete: (id: string) => void
}


function initDraft(mode: Mode, initial: Child | null | undefined, kind: PersonKind): ChildDraft {
  if (mode === 'edit' && initial) {
    return { name: initial.name, birth_date: initial.birth_date ?? '', color: initial.color, kind: initial.kind }
  }
  return { name: '', birth_date: '', color: PERSON_COLORS[0].value, kind }
}

const TEXTOS: Record<PersonKind, { anadir: string; editar: string; eliminar: string; confirmar: string; placeholder: string; sinNombre: string }> = {
  hijo: {
    anadir: 'Añadir hijo',
    editar: 'Editar hijo',
    eliminar: 'Eliminar hijo',
    confirmar: 'Sí, eliminar al hijo',
    placeholder: 'Nombre del niño o niña',
    sinNombre: 'Nombre del hijo',
  },
  adulto: {
    anadir: 'Añadir adulto',
    editar: 'Editar adulto',
    eliminar: 'Eliminar adulto',
    confirmar: 'Sí, eliminar al adulto',
    placeholder: 'Abuela, tío, canguro…',
    sinNombre: 'Nombre del adulto',
  },
}

export function ChildSheet({ open, mode, kind, initial, onClose, onCreate, onUpdate, onDelete }: ChildSheetProps) {
  const textos = TEXTOS[kind]
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<ChildDraft>({
    open,
    initialDraft: () => initDraft(mode, initial, kind),
    validate: validateChildDraft,
    autoFocus: mode === 'create',
  })
  // Quitar a una persona suelta su `child_id` en seis tablas —eventos, tareas,
  // documentos, gastos, fijos y las líneas de los meses cerrados—: no se borra
  // nada, pero lo que llevaba se queda sin dueño, y eso no se ve desde aquí.
  const { preguntando, preguntar, cancelar, confirmar } = useSheetDeleteDialog({ open, initial, onDelete, onClose })

  const handleSubmit = submitHandler(valid => {
    if (mode === 'create') onCreate(valid)
    else if (initial) onUpdate(initial.id, valid)
    onClose()
  })

  // Mientras el sheet pregunta, la píldora de la cabecera se va: ya se está
  // dentro de la pregunta y volver a pulsarla no diría nada nuevo.
  const deleteAction = mode === 'edit' && !preguntando ? (
    <DeleteButton variant="header" onClick={preguntar} idleLabel="Eliminar" />
  ) : undefined

  return (
    <BottomSheet
      open={open}
      title={preguntando ? textos.eliminar : mode === 'create' ? textos.anadir : textos.editar}
      onClose={preguntando ? cancelar : onClose}
      headerActions={deleteAction}
      footer={preguntando ? (
        <ConfirmDeleteFooter confirmLabel={textos.confirmar} onConfirm={confirmar} onCancel={cancelar} />
      ) : (
        <SheetFooter
          form="child-form"
          submitLabel={mode === 'create' ? textos.anadir : 'Guardar cambios'}
          disabled={!draft.name.trim()}
          error={formError}
        />
      )}
    >
      {preguntando ? (
        <ConfirmDeleteBody>
          <p>
            <strong className="text-ink">{initial?.name}</strong> deja de estar en la familia y de
            poder elegirse al asignar nada.
          </p>
          <p>
            Lo que tuviera asignado —eventos, tareas, documentos y apuntes de Finanzas—{' '}
            <strong className="text-ink">no se borra</strong>: se queda en su sitio, sin nadie
            asignado.
          </p>
        </ConfirmDeleteBody>
      ) : (
        <form id="child-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
          {kind === 'adulto' && (
            <p className="rounded-2xl bg-canvas px-4 py-3 text-xs text-muted leading-relaxed">
              No entra en la app ni recibe invitación: sirve para asignarle eventos, tareas
              y documentos. Para dar acceso a alguien, invítalo por correo desde Adultos.
            </p>
          )}

          <Field label="Nombre" htmlFor="child-name">
            <input
              id="child-name"
              ref={firstFieldRef}
              type="text"
              value={draft.name}
              onChange={e => patch({ name: e.target.value })}
              placeholder={textos.placeholder}
              required
              className="field-input"
            />
          </Field>

          <Field label="Fecha de nacimiento" htmlFor="child-birth">
            <input
              id="child-birth"
              type="date"
              value={draft.birth_date}
              onChange={e => patch({ birth_date: e.target.value })}
              className="field-input"
            />
          </Field>

          <Field label="Color" spacing="group">
            <ColorPicker value={draft.color} onChange={color => patch({ color })} />
          </Field>

          <div className="flex items-center gap-3 bg-canvas rounded-2xl px-4 py-3">
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm flex-shrink-0"
              style={{ backgroundColor: draft.color, color: textColorOn(draft.color) }}
            >
              {draft.name ? draft.name.charAt(0).toUpperCase() : '?'}
            </span>
            <div>
              <p className="font-bold text-ink text-sm">{draft.name || textos.sinNombre}</p>
              <p className="text-xs text-muted">{draft.birth_date || 'Fecha de nacimiento'}</p>
            </div>
          </div>
        </form>
      )}
    </BottomSheet>
  )
}
