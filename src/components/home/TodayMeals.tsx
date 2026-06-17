import Link from 'next/link'
import { memo } from 'react'
import { Card, CardSection } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
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
    <CardSection label="El menu de hoy">
      <Card padded={false}>
        {meals.length === 0 ? (
          <EmptyState emoji="🍽" title="Menu libre" description="Improvisar tambien cuenta" />
        ) : (
          <ul className="divide-y divide-[#F5F2EE]">
            {meals.map((meal) => {
              const { label, emoji } = SLOT_LABELS[meal.slot]
              return (
                <li key={meal.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl w-8 text-center">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-[#77716A] uppercase tracking-wide">{label}</span>
                    <p className="font-semibold text-[#252525] text-sm leading-snug">{meal.name}</p>
                    {meal.notes && (
                      <p className="text-xs text-[#77716A] mt-0.5">{meal.notes}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div className="border-t border-[#F5F2EE] px-4 py-2.5">
          <Link href="/meals" className="text-xs font-semibold text-[#8BA888] hover:underline">
            Ver menu semanal
          </Link>
        </div>
      </Card>
    </CardSection>
  )
})
