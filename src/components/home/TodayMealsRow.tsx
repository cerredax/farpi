import { memo } from 'react'
import { SectionLink } from '@/components/ui/SectionLink'
import { mealCourses } from '@/lib/meal-slots'
import type { MealPlan, MealSlot } from '@/types'

const SLOT_LABELS: Record<MealSlot, { label: string; emoji: string }> = {
  breakfast: { label: 'Desayuno', emoji: '☀️' },
  lunch:     { label: 'Comida',   emoji: '🍽' },
  school:    { label: 'Comedor',  emoji: '🎒' },
  dinner:    { label: 'Cena',     emoji: '🌙' },
  snack:     { label: 'Merienda', emoji: '🍎' },
}

interface TodayMealsRowProps {
  meals: MealPlan[]
}

/**
 * El menú de hoy, dentro de la tarjeta del día: responde a la misma pregunta
 * que planes y tareas —"¿qué toca hoy?"— así que vive con ellos en vez de en
 * una tarjeta aparte al final de la pantalla.
 */
export const TodayMealsRow = memo(function TodayMealsRow({ meals }: TodayMealsRowProps) {
  if (meals.length === 0) return null

  return (
    <div className="rounded-3xl bg-white/80 border border-white shadow-sm overflow-hidden">
      <ul className="divide-y divide-hairline">
        {meals.map(meal => {
          const { label, emoji } = SLOT_LABELS[meal.slot]
          const [primero, ...siguientes] = mealCourses(meal)
          return (
            <li key={meal.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl w-8 text-center flex-shrink-0">{emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-muted uppercase tracking-wide">{label}</span>
                <p className="font-semibold text-ink text-sm leading-snug">{primero}</p>
                {siguientes.length > 0 && (
                  <p className="text-xs text-muted leading-snug">{siguientes.join(' · ')}</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="border-t border-hairline px-4 py-2.5">
        <SectionLink href="/meals">Ver menú semanal</SectionLink>
      </div>
    </div>
  )
})
