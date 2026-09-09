import { Button } from './Button'
import { DeleteButton } from './DeleteButton'

interface SheetFooterProps {
  /** Id del `<form>` al que envía el botón principal. */
  form: string
  submitLabel: string
  disabled?: boolean
  /** Mensaje de validación, encima del botón principal. */
  error?: string | null
  /**
   * Botón de borrado al pie. Omitir en modo crear o cuando va en la cabecera.
   * `confirming` y `confirmLabel` son del doble toque; los borrados que
   * preguntan en el paso de `ConfirmDelete` mandan solo `onClick` e `idleLabel`.
   */
  onDelete?: { confirming?: boolean; onClick: () => void; idleLabel: string; confirmLabel?: string }
}

/** Pie fijo de los sheets: error de validación, acción principal y borrado opcional. */
export function SheetFooter({ form, submitLabel, disabled, error, onDelete }: SheetFooterProps) {
  return (
    <div className="px-5 pb-8 pt-3 space-y-2">
      {/* `role="alert"` porque aparece **después** de pulsar Guardar: sin él, un
          lector de pantalla deja a quien lo usa esperando a un formulario que
          no se ha enviado y no dice por qué. Y a 12 px y no a 10: es lo único
          que hay que leer en ese momento, y era el texto más pequeño del sheet. */}
      {error && <p role="alert" className="text-xs font-semibold text-danger-strong">{error}</p>}
      <Button type="submit" form={form} fullWidth size="lg" disabled={disabled}>
        {submitLabel}
      </Button>
      {onDelete && (
        <DeleteButton
          confirming={onDelete.confirming}
          onClick={onDelete.onClick}
          idleLabel={onDelete.idleLabel}
          confirmLabel={onDelete.confirmLabel}
        />
      )}
    </div>
  )
}
