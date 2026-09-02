'use client'

import { Card } from '@/components/ui/Card'
import { MEAL_SLOTS } from '@/lib/constants'
import { canHideMealSlot, toggleMealSlot } from '@/lib/meal-slots'
import type { MealSlot } from '@/types'

interface MealSlotsCardProps {
  slots: MealSlot[]
  onChange: (slots: MealSlot[]) => void
}

/**
 * Qué franjas de comida ve la familia.
 *
 * Salen siempre todas, encendidas o apagadas: es la lista de lo que hay,
 * no la de lo que queda. La que está sola no se puede apagar —con cero franjas
 * la pantalla de comidas se queda sin filas y sin manera de volver— y lo dice en
 * la propia fila en vez de dejar un botón que no hace nada.
 *
 * Se guarda al toque, sin botón de guardar: es un interruptor, y la familia
 * entera lo comparte, así que el cambio va a la base igual que el nombre.
 */
export function MealSlotsCard({ slots, onChange }: MealSlotsCardProps) {
  return (
    <Card padded={false}>
      {/* Solo la parte que no es obvia: que son las de Comidas ya lo dice el
          rótulo de la sección, y decirlo aquí gastaba tres líneas a 390 px. */}
      <p className="px-4 pt-3 pb-2 text-xs text-muted">
        Quitar una no borra lo apuntado en ella: vuelve si la activas.
      </p>

      <ul className="border-t border-hairline divide-y divide-hairline">
        {MEAL_SLOTS.map(slot => {
          const activa = slots.includes(slot.key)
          const esLaUltima = activa && !canHideMealSlot(slots, slot.key)

          return (
            <li key={slot.key}>
              <button
                type="button"
                role="switch"
                aria-checked={activa}
                aria-label={slot.label}
                disabled={esLaUltima}
                onClick={() => onChange(toggleMealSlot(slots, slot.key))}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <span className="w-6 flex-shrink-0 text-center text-base" aria-hidden="true">
                  {slot.emoji}
                </span>

                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${activa ? 'text-ink' : 'text-muted'}`}>
                    {slot.label}
                  </span>
                  {esLaUltima && (
                    <span className="mt-0.5 block text-[11px] leading-snug text-faint">
                      Tiene que quedar al menos una franja
                    </span>
                  )}
                </span>

                {/* El interruptor es decorativo: quien manda es el `aria-checked`
                    del botón, y el lector de pantalla lo lee de ahí. */}
                <span
                  aria-hidden="true"
                  className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${activa ? 'bg-primary' : 'bg-line-strong'}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${activa ? 'left-[1.375rem]' : 'left-0.5'}`}
                  />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
