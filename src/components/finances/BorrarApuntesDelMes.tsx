'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { soloGastos, soloIngresos, sumaDe } from '@/lib/budgets'
import { formatCents } from '@/lib/finanzas'
import type { Expense } from '@/types'

interface BorrarApuntesDelMesProps {
  /** Los apuntes del mes que se está mirando. Sin ninguno, no se pinta nada. */
  apuntes: Expense[]
  /** «Septiembre 2026». El diálogo tiene que decir de qué mes se habla. */
  nombreDelMes: string
  onBorrar: (ids: string[]) => void
}

/**
 * Vaciar «El día a día» del mes que se está mirando.
 *
 * Nace el 22-09-2026, y lo que resuelve es lo que no tenía salida: deshacer de
 * una vez un mes que se llenó mal —una importación del banco que no era, un mes
 * de pruebas—. Borrar cuarenta apuntes de uno en uno no es una alternativa.
 *
 * **Solo toca los apuntes.** Ni los fijos, ni las partidas, ni la copia de un mes
 * cerrado: eso es el plan, vive en la plantilla y tiene su propio botón —«Poner
 * el mes a cero»—, que hace justo lo contrario que este. Los dos nombres se
 * parecen y por eso cada uno dice en su diálogo qué **no** se lleva.
 *
 * **Vale en cualquier mes, no solo en el de hoy.** Apuntar en un mes cerrado
 * siempre se ha podido —la vida llega tarde y los 40 € del 29 caben aunque se
 * escriban el 2—, así que corregirlo también: un mes cerrado congela el plan, no
 * el día a día.
 *
 * **Con diálogo y no con el doble toque** de `useConfirmAction`, por lo mismo que
 * el cierre del mes: el doble toque vale para deshacer algo que sigue a la vista,
 * y aquí desaparece la lista entera. El diálogo dice cuántos son y cuánto suman
 * —que es lo único que permite darse cuenta de que el mes abierto no era el que
 * uno creía— y avisa de que no hay vuelta atrás, porque no la hay.
 *
 * Va al pie de «El día a día», debajo de la lista que borra y junto a la que la
 * llena desde el banco. Arriba, en `ViewHeader`, estaría al lado del `+`, que es
 * el sitio donde menos gracia hace un botón de borrar.
 */
export function BorrarApuntesDelMes({ apuntes, nombreDelMes, onBorrar }: BorrarApuntesDelMesProps) {
  const [abierto, setAbierto] = useState(false)

  if (apuntes.length === 0) return null

  const gastado = sumaDe(soloGastos(apuntes))
  const ingresado = sumaDe(soloIngresos(apuntes))

  return (
    <>
      <div className="flex justify-center pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAbierto(true)}
          className="flex items-center gap-1.5"
        >
          <Trash2 size={13} strokeWidth={2.4} aria-hidden />
          Borrar los apuntes del mes
        </Button>
      </div>

      <BottomSheet
        open={abierto}
        title="Borrar los apuntes del mes"
        onClose={() => setAbierto(false)}
        footer={
          <div className="space-y-2 px-5 py-4">
            <button
              type="button"
              onClick={() => { onBorrar(apuntes.map(a => a.id)); setAbierto(false) }}
              className="w-full rounded-2xl bg-danger-strong py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
            >
              {apuntes.length === 1 ? 'Sí, borrar el apunte' : `Sí, borrar los ${apuntes.length}`}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="w-full rounded-2xl py-3 text-sm font-semibold text-muted transition-colors hover:bg-surface"
            >
              Cancelar
            </button>
          </div>
        }
      >
        <div className="space-y-2 px-5 pb-4 text-sm text-muted">
          {/* La cifra va aquí y no en el botón porque es lo que hace pararse a
              mirar: quien abre esto con el mes equivocado lo ve en el importe
              antes que en el nombre del mes. */}
          <p>
            Se borra{apuntes.length === 1 ? ' ' : 'n '}
            <strong className="text-ink">
              {apuntes.length === 1 ? 'el único apunte' : `los ${apuntes.length} apuntes`}
            </strong>{' '}
            de <strong className="text-ink">{nombreDelMes}</strong>:{' '}
            {gastado > 0 && <>{formatCents(gastado)} de gastos</>}
            {gastado > 0 && ingresado > 0 && ' y '}
            {ingresado > 0 && <>{formatCents(ingresado)} de ingresos</>}.
          </p>
          <p>
            Los fijos y las partidas <strong className="text-ink">no se tocan</strong>: esto
            vacía el día a día, no el plan del mes.
          </p>
          <p className="text-danger-strong">Esto no se puede deshacer.</p>
        </div>
      </BottomSheet>
    </>
  )
}
