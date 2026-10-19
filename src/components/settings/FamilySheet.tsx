'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmDeleteBody, ConfirmDeleteFooter } from '@/components/ui/ConfirmDelete'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetDeleteDialog, useSheetForm } from '@/hooks/useSheetForm'
import { validateFamilyName } from '@/lib/validators'
import { useT } from '@/lib/i18n/contexto'
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
  onSave: (name: string) => Promise<boolean>
  onDelete: () => void
}

export function FamilySheet({ open, family, contenido, puedeEliminar, hayDocumentos, onClose, onSave, onDelete }: FamilySheetProps) {
  const f = useT().ajustes.familia
  const { draft, patch, formError, firstFieldRef, submitHandler, guardando } = useSheetForm<{ name: string }>({
    open,
    initialDraft: () => ({ name: family.name }),
    validate: d => validateFamilyName(d.name),
  })
  // Es lo único de Ajustes que no tiene vuelta atrás: se lleva por delante la
  // familia entera y todo lo que hay dentro. `family` hace de `initial` —el hook
  // solo le pide un `id`— y `onDelete` no necesita el suyo porque la familia que
  // se borra es la que se está editando.
  const { preguntando, preguntar, cancelar, confirmar } = useSheetDeleteDialog({
    open,
    initial: family,
    onDelete,
    onClose,
  })

  const handleSubmit = submitHandler(valid => onSave(valid.name.trim()), onClose)

  return (
    <BottomSheet
      open={open}
      title={preguntando ? f.eliminar : f.editar}
      onClose={preguntando ? cancelar : onClose}
      footer={preguntando ? (
        <ConfirmDeleteFooter confirmLabel={f.confirmarEliminar} onConfirm={confirmar} onCancel={cancelar} />
      ) : (
        <SheetFooter
          form="family-form"
          disabled={guardando}
          submitLabel={f.guardar}
          onDelete={puedeEliminar ? { onClick: preguntar, idleLabel: f.eliminar } : undefined}
        />
      )}
    >
      {/* El aviso vivía dentro del formulario y solo al armarse el doble toque, en
          una caja roja a 11 px. Ahora es la pregunta entera: dice lo que se lleva
          por delante —en vez del genérico "se borrará todo"— y quien solo viene a
          cambiar el nombre no ve nada de esto. */}
      {preguntando ? (
        <ConfirmDeleteBody>
          <p>
            {f.seBorra}<strong translate="no" className="text-ink">{f.nombreEntreComillas(family.name)}</strong>
            {contenido ? f.conTodoLoSuyo(contenido) : f.queEstaVacia}{' '}
            <strong className="text-ink">{f.noSePuedeDeshacer}</strong>
          </p>
          {/* Solo si los hay: en una familia sin documentos, hablar de Drive es
              una pregunta que nadie se ha hecho. */}
          {hayDocumentos && (
            <p>
              {f.archivosEnDrive}
            </p>
          )}
        </ConfirmDeleteBody>
      ) : (
        <form id="family-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-4">
          <Field label={f.nombre} htmlFor="family-name">
            <input
              id="family-name"
              ref={firstFieldRef}
              type="text"
              value={draft.name}
              onChange={e => patch({ name: e.target.value })}
              placeholder={f.nombreEjemplo}
              required
              className="field-input"
            />
            {formError && <p className="text-[10px] text-danger-strong font-semibold">{formError}</p>}
          </Field>

          {/* Y si no se puede, se dice por qué. La ausencia del botón sin más era
              justo lo que no se entendía. */}
          {!puedeEliminar && (
            <p className="text-[10px] leading-relaxed text-muted">
              {f.unicaFamilia}
            </p>
          )}
        </form>
      )}
    </BottomSheet>
  )
}
