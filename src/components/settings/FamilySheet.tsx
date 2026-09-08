'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmDeleteBody, ConfirmDeleteFooter } from '@/components/ui/ConfirmDelete'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetDeleteDialog, useSheetForm } from '@/hooks/useSheetForm'
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

  const handleSubmit = submitHandler(valid => {
    onSave(valid.name.trim())
    onClose()
  })

  return (
    <BottomSheet
      open={open}
      title={preguntando ? 'Eliminar familia' : 'Editar familia'}
      onClose={preguntando ? cancelar : onClose}
      footer={preguntando ? (
        <ConfirmDeleteFooter confirmLabel="Sí, borrarla con todo" onConfirm={confirmar} onCancel={cancelar} />
      ) : (
        <SheetFooter
          form="family-form"
          submitLabel="Guardar"
          disabled={!draft.name.trim()}
          onDelete={puedeEliminar ? { onClick: preguntar, idleLabel: 'Eliminar familia' } : undefined}
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
            {contenido
              ? <>Se borra <strong className="text-ink">«{family.name}»</strong> con todo lo suyo: {contenido}.</>
              : <>Se borra <strong className="text-ink">«{family.name}»</strong>, que está vacía.</>}{' '}
            <strong className="text-ink">No se puede deshacer.</strong>
          </p>
          {/* Solo si los hay: en una familia sin documentos, hablar de Drive es
              una pregunta que nadie se ha hecho. */}
          {hayDocumentos && (
            <p>
              Los archivos siguen en el Google Drive de quien los subió: lo que se borra aquí es su
              ficha.
            </p>
          )}
        </ConfirmDeleteBody>
      ) : (
        <form id="family-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-4">
          <Field label="Nombre" htmlFor="family-name">
            <input
              id="family-name"
              ref={firstFieldRef}
              type="text"
              value={draft.name}
              onChange={e => patch({ name: e.target.value })}
              placeholder="Ej: Familia de Omar, Sofía y Cris"
              required
              className="field-input"
            />
            {formError && <p className="text-[10px] text-danger font-semibold">{formError}</p>}
          </Field>

          {/* Y si no se puede, se dice por qué. La ausencia del botón sin más era
              justo lo que no se entendía. */}
          {!puedeEliminar && (
            <p className="text-[10px] leading-relaxed text-faint">
              Esta es tu única familia, así que no se puede eliminar: Farpi siempre trabaja dentro de
              una. Crea otra antes, o borra tu cuenta para dejarlo todo.
            </p>
          )}
        </form>
      )}
    </BottomSheet>
  )
}
