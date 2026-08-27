'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useSheetForm } from '@/hooks/useSheetForm'
import { validateFamilyName } from '@/lib/validators'
import type { Family } from '@/types'

interface FamilySheetProps {
  open: boolean
  family: Family
  /** Qué se lleva por delante cerrarla: "3 personas y 12 eventos". `null` si está vacía. */
  contenido: string | null
  /** Si hay otra familia a la que saltar. La última no se cierra. */
  puedeEliminar: boolean
  /** Si la familia tiene documentos, para avisar de que los archivos se quedan en Drive. */
  hayDocumentos: boolean
  onClose: () => void
  onSave: (name: string) => void
  onDelete: () => void
}

export function FamilySheet({ open, family, contenido, puedeEliminar, hayDocumentos, onClose, onSave, onDelete }: FamilySheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<{ name: string }>({
    open,
    initialDraft: () => ({ name: family.name }),
    validate: d => validateFamilyName(d.name),
  })
  const { confirming, requestConfirm } = useConfirmAction()

  const handleSubmit = submitHandler(valid => {
    onSave(valid.name.trim())
    onClose()
  })

  function handleDelete() {
    requestConfirm(() => {
      onDelete()
      onClose()
    })
  }

  return (
    <BottomSheet
      open={open}
      title="Editar familia"
      onClose={onClose}
      footer={
        <SheetFooter
          form="family-form"
          submitLabel="Guardar"
          disabled={!draft.name.trim()}
          onDelete={puedeEliminar
            ? { confirming, onClick: handleDelete, idleLabel: 'Eliminar familia', confirmLabel: 'Confirmar: se borra todo' }
            : undefined}
        />
      }
    >
      <form id="family-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-4">
        <Field label="Nombre" htmlFor="family-name">
          <input
            id="family-name"
            ref={firstFieldRef}
            type="text"
            value={draft.name}
            onChange={e => patch({ name: e.target.value })}
            placeholder="Ej: Familia de Omar, Sofía y Ana"
            required
            className="field-input"
          />
          {formError && <p className="text-[10px] text-danger font-semibold">{formError}</p>}
        </Field>

        {/* El aviso aparece al pedir el borrado y no antes: es lo único de Ajustes
            que no tiene vuelta atrás, pero tampoco hay por qué recibir a quien
            solo viene a cambiar el nombre con una caja roja. Dice lo que se lleva
            por delante, en vez del genérico "se borrará todo". */}
        {puedeEliminar && confirming && (
          <div className="rounded-xl border border-danger-line bg-danger-soft px-3 py-2.5 space-y-1.5">
            <p className="text-[11px] font-semibold leading-relaxed text-ink">
              {contenido
                ? <>Se borra «{family.name}» con todo lo suyo: {contenido}. No se puede deshacer.</>
                : <>Se borra «{family.name}». No se puede deshacer.</>}
            </p>
            {/* Solo si los hay: en una familia sin documentos, hablar de Drive es
                una pregunta que nadie se ha hecho. */}
            {hayDocumentos && (
              <p className="text-[10px] leading-relaxed text-muted">
                Los archivos siguen en el Google Drive de quien los subió: lo que se borra aquí
                es su ficha.
              </p>
            )}
          </div>
        )}

        {/* Y si no se puede, se dice por qué. La ausencia del botón sin más era
            justo lo que no se entendía. */}
        {!puedeEliminar && (
          <p className="text-[10px] leading-relaxed text-faint">
            Esta es tu única familia, así que no se puede eliminar: Nido siempre trabaja dentro de
            una. Crea otra antes, o borra tu cuenta para dejarlo todo.
          </p>
        )}
      </form>
    </BottomSheet>
  )
}
