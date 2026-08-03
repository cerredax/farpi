'use client'

import { Copy, Pencil, Plus } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '@/components/ui/Card'
import { MEAL_SLOTS } from '@/lib/constants'
import { capitalize } from '@/lib/text'
import type { MealPlan, MealSlot } from '@/types'

interface WeekListProps {
  weekDays: Date[]
  mealsByCell: Map<string, MealPlan>
  onCreate: (date: string, slot: MealSlot) => void
  onEdit: (meal: MealPlan) => void
  onCopyDay: (date: string) => void
  hasMealsForDate: (date: string) => boolean
}

/**
 * La semana en vertical, un día detrás de otro.
 *
 * Es la versión de móvil de `WeekGrid`: la rejilla necesita 860 px de ancho, así
 * que en un teléfono solo se veían dos días de siete y había que arrastrar en
 * horizontal sin ninguna pista de que se podía. Aquí caben los siete, y las
 * acciones son las mismas: tocar una comida la edita, tocar un hueco la añade.
 */
export function WeekList({ weekDays, mealsByCell, onCreate, onEdit, onCopyDay, hasMealsForDate }: WeekListProps) {
  const today = new Date()

  return (
    <div className="space-y-3">
      {weekDays.map(day => {
        const dayKey = format(day, 'yyyy-MM-dd')
        const esHoy = isSameDay(day, today)
        const tieneComidas = hasMealsForDate(dayKey)

        return (
          <Card key={dayKey} padded={false} className={esHoy ? 'ring-1 ring-primary/30' : undefined}>
            <div className={`flex items-center justify-between px-4 py-2.5 border-b border-hairline ${esHoy ? 'bg-primary-tint' : ''}`}>
              <p className={`text-sm font-extrabold ${esHoy ? 'text-primary-strong' : 'text-ink'}`}>
                {capitalize(format(day, "EEEE d", { locale: es }))}
                {esHoy && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-primary">Hoy</span>}
              </p>
              <button
                type="button"
                onClick={() => onCopyDay(dayKey)}
                disabled={!tieneComidas}
                aria-label={`Copiar menú del ${format(day, 'd MMM', { locale: es })}`}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  tieneComidas ? 'text-primary hover:bg-primary-tint' : 'text-faint cursor-not-allowed'
                }`}
              >
                <Copy size={11} strokeWidth={2.4} />
                Copiar
              </button>
            </div>

            <ul className="divide-y divide-hairline">
              {MEAL_SLOTS.map(slot => {
                const meal = mealsByCell.get(`${dayKey}:${slot.key}`)
                return (
                  <li key={slot.key}>
                    {meal ? (
                      <button
                        type="button"
                        onClick={() => onEdit(meal)}
                        aria-label={`Editar ${slot.label.toLowerCase()} del ${format(day, 'd MMM', { locale: es })}`}
                        className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-canvas"
                      >
                        <span className="w-6 flex-shrink-0 text-center text-base">{slot.emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-muted">{slot.label}</span>
                          <span className="block truncate text-sm font-semibold text-ink">{meal.name}</span>
                        </span>
                        <Pencil size={13} className="flex-shrink-0 text-faint transition-colors group-hover:text-primary" strokeWidth={1.9} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCreate(dayKey, slot.key)}
                        aria-label={`Añadir ${slot.label.toLowerCase()} para ${format(day, 'd MMM', { locale: es })}`}
                        className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-primary-tint"
                      >
                        <span className="w-6 flex-shrink-0 text-center text-base opacity-40">{slot.emoji}</span>
                        <span className="min-w-0 flex-1 text-sm text-faint transition-colors group-hover:text-primary">
                          {slot.label}
                        </span>
                        <Plus size={14} className="flex-shrink-0 text-faint transition-colors group-hover:text-primary" strokeWidth={2.4} />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}
