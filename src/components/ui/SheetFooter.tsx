import { Button } from './Button'
import { DeleteButton } from './DeleteButton'

interface SheetFooterProps {
  /** Id del `<form>` al que envía el botón principal. */
  form: string
  submitLabel: string
  disabled?: boolean
  /** Mensaje de validación, encima del botón principal. */
  error?: string | null
  /** Botón de borrado al pie. Omitir en modo crear o cuando va en la cabecera. */
  onDelete?: { confirming: boolean; onClick: () => void; idleLabel: string; confirmLabel: string }
}

/** Pie fijo de los sheets: error de validación, acción principal y borrado opcional. */
export function SheetFooter({ form, submitLabel, disabled, error, onDelete }: SheetFooterProps) {
  return (
    <div className="px-5 pb-8 pt-3 space-y-2">
      {error && <p className="text-[10px] text-danger font-semibold">{error}</p>}
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
