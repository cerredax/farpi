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
import { useT } from '@/lib/i18n/contexto'
import type { Child, ChildDraft, PersonKind } from '@/types'

type Mode = 'create' | 'edit'

interface ChildSheetProps {
  open: boolean
  mode: Mode
  /** Un hijo o un adulto sin cuenta. Cambia los textos, no el formulario. */
  kind: PersonKind
  initial?: Child | null
  onClose: () => void
  onCreate: (draft: ChildDraft) => Promise<boolean>
  onUpdate: (id: string, draft: ChildDraft) => Promise<boolean>
  onDelete: (id: string) => void
}


function initDraft(mode: Mode, initial: Child | null | undefined, kind: PersonKind): ChildDraft {
  if (mode === 'edit' && initial) {
    return { name: initial.name, birth_date: initial.birth_date ?? '', color: initial.color, kind: initial.kind }
  }
  return { name: '', birth_date: '', color: PERSON_COLORS[0].value, kind }
}

export function ChildSheet({ open, mode, kind, initial, onClose, onCreate, onUpdate, onDelete }: ChildSheetProps) {
  const p = useT().ajustes.personasSinCuenta
  const textos = p[kind]
  const { draft, patch, formError, firstFieldRef, submitHandler, guardando } = useSheetForm<ChildDraft>({
    open,
    initialDraft: () => initDraft(mode, initial, kind),
    validate: validateChildDraft,
    autoFocus: mode === 'create',
  })
  // Quitar a una persona suelta su `child_id` en seis tablas —eventos, tareas,
  // documentos, gastos, fijos y las líneas de los meses cerrados—: no se borra
  // nada, pero lo que llevaba se queda sin dueño, y eso no se ve desde aquí.
  const { preguntando, preguntar, cancelar, confirmar } = useSheetDeleteDialog({ open, initial, onDelete, onClose })

  const handleSubmit = submitHandler(valid => mode === 'create'
    ? onCreate(valid)
    : initial ? onUpdate(initial.id, valid) : false, onClose)

  // Mientras el sheet pregunta, la píldora de la cabecera se va: ya se está
  // dentro de la pregunta y volver a pulsarla no diría nada nuevo.
  const deleteAction = mode === 'edit' && !preguntando ? (
    <DeleteButton variant="header" onClick={preguntar} idleLabel={p.eliminar} />
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
          disabled={guardando}
          submitLabel={mode === 'create' ? textos.anadir : p.guardarCambios}
          error={formError}
        />
      )}
    >
      {preguntando ? (
        <ConfirmDeleteBody>
          <p>
            <strong translate="no" className="text-ink">{initial?.name}</strong>{p.dejaDeEstar}
          </p>
          <p>
            {p.loAsignadoAntes}<strong className="text-ink">{p.noSeBorra}</strong>{p.loAsignadoDespues}
          </p>
        </ConfirmDeleteBody>
      ) : (
        <form id="child-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
          {kind === 'adulto' && (
            <p className="rounded-2xl bg-canvas px-4 py-3 text-xs text-muted leading-relaxed">
              {p.explicacionAdulto}
            </p>
          )}

          <Field label={p.nombre} htmlFor="child-name">
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

          <Field label={p.fechaDeNacimiento} htmlFor="child-birth">
            <input
              id="child-birth"
              type="date"
              value={draft.birth_date}
              onChange={e => patch({ birth_date: e.target.value })}
              className="field-input"
            />
          </Field>

          <Field label={p.color} spacing="group">
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
              <p translate={draft.name ? 'no' : undefined} className="font-bold text-ink text-sm">{draft.name || textos.sinNombre}</p>
              <p className="text-xs text-muted">{draft.birth_date || p.fechaDeNacimiento}</p>
            </div>
          </div>
        </form>
      )}
    </BottomSheet>
  )
}
