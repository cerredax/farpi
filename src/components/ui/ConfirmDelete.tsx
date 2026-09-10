'use client'

/**
 * El paso de confirmación de un borrado, dentro del sheet que lo pide.
 *
 * **Es el mismo sheet y no uno encima** (08-09-2026). Dos `BottomSheet` a la vez
 * no se sostienen: el overlay del segundo va a `z-50` y el panel del primero a
 * `z-[60]`, así que el sheet de debajo se quedaría a la vista y pulsable
 * alrededor de la pregunta, con dos `aria-modal` abiertos. Así que el sheet no se
 * duplica: se convierte en la pregunta —cambia el título, el formulario deja el
 * sitio a lo que se va a perder y el pie pasa a «Sí, eliminar» y «Cancelar»— y al
 * cancelar vuelve al formulario tal como estaba.
 *
 * Cuándo usar esto y cuándo el doble toque de `DeleteButton`: *el doble toque vale
 * para lo que se ve*. Borrar una nota, una tarea o una fila de la compra se
 * entiende sin explicación y se nota al momento. Estos cuatro no —una lista se
 * lleva sus ítems, una partida suelta sus gastos, quitar a alguien deja papeles
 * sin abrir, cerrar una familia lo borra todo—, y lo que cambia no está en
 * pantalla. Es la misma excepción que ya se hizo para el cierre del mes.
 */
export function ConfirmDeleteBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2 px-5 pt-1 pb-4 text-sm leading-relaxed text-muted">
      {children}
    </div>
  )
}

interface ConfirmDeleteFooterProps {
  /** Lo que se va a hacer, dicho entero: «Sí, eliminar la lista». */
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * El pie del paso de confirmación, en el sitio de `SheetFooter`.
 *
 * Botones a mano y no `Button variant="danger"`, igual que en el diálogo del
 * cierre del mes. Cuando esto se escribió la razón era el contraste —la variante
 * iba en `bg-danger`, 3,3:1 con texto blanco— y esa razón ya no vale: el repaso
 * del 09-09-2026 pasó la variante a `danger-strong`. Lo que queda es la forma:
 * estos dos botones son el **pie de un sheet**, a lo ancho y apilados, y no la
 * pastilla que devuelve `Button`. El rojo es el mismo (`danger-strong`, 5,2:1) que
 * `DeleteButton` y que la variante.
 *
 * «Cancelar» va debajo y sin color: es lo que se pulsa por descuido, y el orden
 * pone primero lo que se vino a hacer.
 */
export function ConfirmDeleteFooter({ confirmLabel, onConfirm, onCancel }: ConfirmDeleteFooterProps) {
  return (
    <div className="space-y-2 px-5 pb-8 pt-3">
      <button
        type="button"
        onClick={onConfirm}
        className="w-full rounded-2xl bg-danger-strong py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="w-full rounded-2xl py-3 text-sm font-semibold text-muted transition-colors hover:bg-surface"
      >
        Cancelar
      </button>
    </div>
  )
}
