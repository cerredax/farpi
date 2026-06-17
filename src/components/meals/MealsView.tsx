'use client'

import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { useStore } from '@/lib/store-context'
import { getLocalDateString } from '@/lib/date-utils'
import { MealSheet } from './MealSheet'
import { Card } from '@/components/ui/Card'
import { MEAL_SLOTS } from '@/lib/constants'
import type { MealPlan, MealSlot } from '@/types'

const SLOT_META = Object.fromEntries(
  MEAL_SLOTS.map(s => [s.key, { label: s.label, emoji: s.emoji, order: s.order }])
) as Record<MealSlot, { label: string; emoji: string; order: number }>

function sortMeals(meals: MealPlan[]) {
  return [...meals].sort((a, b) => SLOT_META[a.slot].order - SLOT_META[b.slot].order)
}

function MealRow({ meal, onEdit }: { meal: MealPlan; onEdit: (meal: MealPlan) => void }) {
  const meta = SLOT_META[meal.slot]
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-xl w-8 text-center flex-shrink-0">{meta.emoji}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold text-[#77716A] uppercase tracking-wide">{meta.label}</span>
        <p className="font-semibold text-[#252525] text-sm leading-snug">{meal.name}</p>
        {meal.notes && <p className="text-xs text-[#77716A] mt-0.5">{meal.notes}</p>}
      </div>
      <button
        onClick={() => onEdit(meal)}
        aria-label={`Editar ${meal.name}`}
        className="w-7 h-7 flex items-center justify-center rounded-full text-[#C4BFB9] hover:text-[#77716A] hover:bg-[#F0EDE8] transition-colors flex-shrink-0"
      >
        <Pencil size={13} strokeWidth={1.8} />
      </button>
    </div>
  )
}

type ViewMode = 'today' | 'week'

export function MealsView() {
  const { todayMeals, meals, createMeal, updateMeal, deleteMeal } = useStore()

  const [viewMode,     setViewMode]     = useState<ViewMode>('today')
  const [sheetOpen,    setSheetOpen]    = useState(false)
  const [editingMeal,  setEditingMeal]  = useState<MealPlan | null>(null)
  const [sheetMode,    setSheetMode]    = useState<'create' | 'edit'>('create')
  const [sheetDate,    setSheetDate]    = useState<string | undefined>()

  const sheetKey = editingMeal ? `edit-${editingMeal.id}` : `create-${sheetDate ?? 'default'}`

  function openCreate(date?: string) {
    setEditingMeal(null)
    setSheetDate(date)
    setSheetMode('create')
    setSheetOpen(true)
  }

  function openEdit(meal: MealPlan) {
    setEditingMeal(meal)
    setSheetMode('edit')
    setSheetOpen(true)
  }

  // Semana actual (lunes a domingo)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#252525] leading-tight">Comidas</h1>
          <p className="text-xs text-[#77716A] mt-0.5">Menú de la familia</p>
        </div>
        <button
          onClick={() => openCreate()}
          aria-label="Añadir comida"
          className="w-10 h-10 bg-[#8BA888] text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#7a9877] transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-[#F0EDE8] p-1 rounded-2xl">
        {(['today', 'week'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setViewMode(tab)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${viewMode === tab ? 'bg-white text-[#252525] shadow-sm' : 'text-[#77716A]'}`}
          >
            {tab === 'today' ? 'Hoy' : 'Esta semana'}
          </button>
        ))}
      </div>

      {/* Vista: Hoy */}
      {viewMode === 'today' && (
        <div>
          {todayMeals.length === 0 ? (
            <Card className="py-10 text-center">
              <p className="text-3xl mb-2">🍽️</p>
              <p className="font-bold text-[#252525] text-sm">Sin menú para hoy</p>
              <p className="text-xs text-[#77716A] mt-1">Planifica las comidas de hoy</p>
              <button
                onClick={() => openCreate(getLocalDateString())}
                className="mt-4 text-sm font-semibold text-[#8BA888] hover:underline"
              >
                + Añadir comida de hoy
              </button>
            </Card>
          ) : (
            <Card padded={false}>
              <ul className="divide-y divide-[#F5F2EE]">
                {sortMeals(todayMeals).map(meal => (
                  <MealRow key={meal.id} meal={meal} onEdit={openEdit} />
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Vista: Semana */}
      {viewMode === 'week' && (
        <div className="space-y-3">
          {weekDays.map(day => {
            const dayStr  = format(day, 'yyyy-MM-dd')
            const isToday = isSameDay(day, new Date())
            const dayMeals = sortMeals(meals.filter(m => m.date === dayStr))
            return (
              <div key={dayStr} className={`rounded-2xl border ${isToday ? 'border-[#8BA888] bg-[#F5FAF5]' : 'border-[#F0EDE8] bg-white'} shadow-sm overflow-hidden`}>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-extrabold ${isToday ? 'text-[#8BA888]' : 'text-[#252525]'}`}>
                      {format(day, 'EEE d', { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold bg-[#8BA888] text-white px-2 py-0.5 rounded-full">Hoy</span>
                    )}
                  </div>
                  <button
                    onClick={() => openCreate(dayStr)}
                    aria-label={`Añadir comida para ${dayStr}`}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-[#8BA888] hover:bg-[#8BA888]/10 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {dayMeals.length > 0 ? (
                  <ul className="divide-y divide-[#F5F2EE] border-t border-[#F0EDE8]">
                    {dayMeals.map(meal => (
                      <MealRow key={meal.id} meal={meal} onEdit={openEdit} />
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 pb-3 text-xs text-[#C4BFB9]">Sin menú planificado</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <MealSheet
        key={sheetKey}
        open={sheetOpen}
        mode={sheetMode}
        initial={editingMeal}
        defaultDate={sheetDate}
        occupiedSlots={meals.filter(m => m.date === sheetDate).map(m => m.slot)}
        onClose={() => setSheetOpen(false)}
        onCreate={createMeal}
        onUpdate={updateMeal}
        onDelete={deleteMeal}
      />
    </div>
  )
}
