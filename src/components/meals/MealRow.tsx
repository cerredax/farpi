'use client'

import { Pencil } from 'lucide-react'
import { MEAL_SLOT_META } from '@/lib/constants'
import type { MealPlan } from '@/types'

/** Fila de una comida en la lista de "Hoy". */
export function MealRow({ meal, onEdit }: { meal: MealPlan; onEdit: (meal: MealPlan) => void }) {
  const meta = MEAL_SLOT_META[meal.slot]
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-xl w-8 text-center flex-shrink-0">{meta.emoji}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wide">{meta.label}</span>
        <p className="font-semibold text-ink text-sm leading-snug">{meal.name}</p>
        {meal.notes && <p className="text-xs text-muted mt-0.5">{meal.notes}</p>}
      </div>
      <button
        onClick={() => onEdit(meal)}
        aria-label={`Editar ${meal.name}`}
        className="w-7 h-7 flex items-center justify-center rounded-full text-faint hover:text-muted hover:bg-surface transition-colors flex-shrink-0"
      >
        <Pencil size={13} strokeWidth={1.8} />
      </button>
    </div>
  )
}
