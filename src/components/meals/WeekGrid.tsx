'use client'

import { Plus, Pencil, Copy } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '@/components/ui/Card'
import { MEAL_SLOTS } from '@/lib/constants'
import { capitalize } from '@/lib/text'
import type { MealPlan, MealSlot } from '@/types'

interface WeekGridProps {
  weekDays: Date[]
  mealsByCell: Map<string, MealPlan>
  onCreate: (date: string, slot: MealSlot) => void
  onEdit: (meal: MealPlan) => void
  onCopyDay: (date: string) => void
  hasMealsForDate: (date: string) => boolean
  cellMinHeight?: number
}

/**
 * Las columnas, en clases y no en `style`, para poder apretarlas en escritorio:
 * un `style` en línea gana a cualquier clase y no se puede sobreescribir por
 * ancho de pantalla.
 *
 * El valor base es exactamente el de antes —132 px de etiqueta y siete columnas
 * de 104 mínimo, o sea 860 en total—, así que de `md` a `lg` esto se ve igual
 * que siempre y sigue arrastrándose en horizontal. Desde `lg` aparece
 * `SideNav`, que se lleva 224 px del ancho: con el mínimo de antes la rejilla
 * pasaba a tener scroll justo donde hay sitio de sobra, así que ahí las
 * columnas se aprietan a 112 + 7×84 = 700 y entran enteras.
 */
const COLUMNAS = 'grid-cols-[132px_repeat(7,minmax(104px,1fr))] lg:grid-cols-[112px_repeat(7,minmax(84px,1fr))]'

/** Rejilla semanal de comidas (franjas × días), con scroll horizontal en móvil. */
export function WeekGrid({
  weekDays,
  mealsByCell,
  onCreate,
  onEdit,
  onCopyDay,
  hasMealsForDate,
  cellMinHeight = 118,
}: WeekGridProps) {
  const today = new Date()

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[860px] lg:min-w-0">
          <div className={`grid border-b border-surface bg-canvas ${COLUMNAS}`}>
            <div className="sticky left-0 z-20 bg-canvas border-r border-surface px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Franja</p>
            </div>
            {weekDays.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const todayColumn = isSameDay(day, today)
              const hasMeals = hasMealsForDate(dayKey)
              return (
                <div
                  key={dayKey}
                  className={`px-3 py-3 text-center border-r last:border-r-0 border-surface ${
                    todayColumn ? 'bg-primary-tint' : 'bg-canvas'
                  }`}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${todayColumn ? 'text-primary-strong' : 'text-muted'}`}>
                    {capitalize(format(day, 'EEE', { locale: es }))}
                  </p>
                  <p className="text-sm font-extrabold mt-0.5 text-ink">
                    {format(day, 'd')}
                  </p>
                  <button
                    type="button"
                    onClick={() => onCopyDay(dayKey)}
                    disabled={!hasMeals}
                    className={`mx-auto mt-2 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold transition-colors ${
                      hasMeals
                        ? 'bg-white text-primary shadow-sm hover:bg-primary-tint'
                        : 'bg-white/50 text-faint cursor-not-allowed'
                    }`}
                    aria-label={`Copiar menú del ${format(day, 'd MMM', { locale: es })}`}
                  >
                    <Copy size={10} strokeWidth={2.4} />
                    Copiar
                  </button>
                  {todayColumn && (
                    <span className="inline-block w-1 h-1 rounded-full bg-primary mt-1" />
                  )}
                </div>
              )
            })}
          </div>

          {MEAL_SLOTS.map(slot => (
            <div
              key={slot.key}
              className={`grid border-b border-hairline last:border-b-0 ${COLUMNAS}`}
            >
              <div className="sticky left-0 z-10 bg-white border-r border-surface px-4 py-4 flex items-center gap-2">
                <span className="text-lg flex-shrink-0">{slot.emoji}</span>
                <p className="text-sm font-bold text-ink leading-tight">{slot.label}</p>
              </div>

              {weekDays.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const cellKey = `${dateKey}:${slot.key}`
                const meal = mealsByCell.get(cellKey)
                const todayColumn = isSameDay(day, today)

                return (
                  <div
                    key={cellKey}
                    style={{ minHeight: cellMinHeight }}
                    className={`border-r last:border-r-0 border-surface ${
                      todayColumn ? 'bg-primary-tint' : 'bg-white'
                    }`}
                  >
                    {meal ? (
                      <button
                        type="button"
                        onClick={() => onEdit(meal)}
                        className="group h-full w-full p-2 text-left"
                      >
                        <div className="h-full rounded-2xl border border-line bg-white/90 px-3 py-2 shadow-sm transition-colors group-hover:border-primary group-hover:bg-white">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                              {slot.emoji} {slot.label}
                            </p>
                            <Pencil size={11} className="text-faint group-hover:text-primary transition-colors flex-shrink-0" />
                          </div>
                          <p className="mt-1 text-sm font-semibold text-ink leading-snug">
                            {meal.name}
                          </p>
                          {meal.notes && (
                            <p className="mt-1 text-[11px] text-muted leading-snug">
                              {meal.notes}
                            </p>
                          )}
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCreate(dateKey, slot.key)}
                        className="group flex h-full w-full items-center justify-center p-2"
                        aria-label={`Añadir ${slot.label.toLowerCase()} para ${format(day, 'd MMM', { locale: es })}`}
                      >
                        <div className="flex w-full items-center justify-center rounded-2xl border border-dashed border-line-strong text-faint transition-colors group-hover:border-primary group-hover:bg-primary-tint group-hover:text-primary" style={{ minHeight: cellMinHeight - 32 }}>
                          <div className="flex flex-col items-center gap-1">
                            <Plus size={14} strokeWidth={2.5} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Añadir</span>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
