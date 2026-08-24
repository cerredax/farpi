import { memo } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { HomeSection } from '@/components/ui/HomeSection'
import { SectionLink } from '@/components/ui/SectionLink'
import type { MealPlan, MealSlot } from '@/types'

const SLOT_LABELS: Record<MealSlot, { label: string; emoji: string }> = {
  breakfast: { label: 'Desayuno', emoji: '☀️' },
  lunch:     { label: 'Comida',   emoji: '🍽' },
  dinner:    { label: 'Cena',     emoji: '🌙' },
  snack:     { label: 'Merienda', emoji: '🍎' },
}

interface TodayMealsProps {
  meals: MealPlan[]
}

export const TodayMeals = memo(function TodayMeals({ meals }: TodayMealsProps) {
  return (
    <HomeSection
      label="El menú de hoy"
      isEmpty={meals.length === 0}
      emptyState={<EmptyState compact emoji="🍽" title="Menú libre, improvisar también cuenta" />}
      footer={<SectionLink href="/meals">Ver menú semanal</SectionLink>}
    >
      <ul className="divide-y divide-hairline">
        {meals.map((meal) => {
          const { label, emoji } = SLOT_LABELS[meal.slot]
          return (
            <li key={meal.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl w-8 text-center">{emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-muted uppercase tracking-wide">{label}</span>
                <p className="font-semibold text-ink text-sm leading-snug">{meal.name}</p>
                {meal.notes && (
                  <p className="text-xs text-muted mt-0.5">{meal.notes}</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </HomeSection>
  )
})
