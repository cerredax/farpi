'use client'

import { useMemo, useState } from 'react'
import { addDays, addWeeks, format, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { useStore } from '@/lib/store-context'
import { selectMealsByCell, selectOccupiedMealSlots, selectSortedMeals } from '@/lib/selectors'
import type { MealPlan, MealSlot } from '@/types'

type ViewMode = 'today' | 'week'

function weekFrom(start: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Estado de la pantalla de comidas: pestañas, semana visible y sheets. */
export function useMealsState() {
  const { todayMeals, meals, createMeal, copyMealDay, updateMeal, deleteMeal } = useStore()

  const [viewMode, setViewMode] = useState<ViewMode>('today')
  const [desktopWeekOffset, setDesktopWeekOffset] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<MealPlan | null>(null)
  const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create')
  const [sheetDate, setSheetDate] = useState<string | undefined>()
  const [sheetSlot, setSheetSlot] = useState<MealSlot | undefined>()
  const [copySheetOpen, setCopySheetOpen] = useState(false)
  const [copySourceDate, setCopySourceDate] = useState<string | null>(null)

  const sheetKey = editingMeal
    ? `edit-${editingMeal.id}`
    : `create-${sheetDate ?? 'default'}-${sheetSlot ?? 'default'}`
  const copySheetKey = `copy-${copySheetOpen ? 'open' : 'closed'}-${copySourceDate ?? 'none'}`

  const sortedTodayMeals = selectSortedMeals(todayMeals)
  const mealsByCell = selectMealsByCell(meals)
  const occupiedSlots = selectOccupiedMealSlots(meals, sheetDate)
  const mealDates = useMemo(() => new Set(meals.map(meal => meal.date)), [meals])
  const copySourceMeals = useMemo(
    () => copySourceDate ? meals.filter(meal => meal.date === copySourceDate) : [],
    [copySourceDate, meals],
  )

  function openCreate(date?: string, slot?: MealSlot) {
    setEditingMeal(null)
    setSheetDate(date)
    setSheetSlot(slot)
    setSheetMode('create')
    setSheetOpen(true)
  }

  function openEdit(meal: MealPlan) {
    setEditingMeal(meal)
    setSheetDate(undefined)
    setSheetSlot(undefined)
    setSheetMode('edit')
    setSheetOpen(true)
  }

  function openCopyDay(date: string) {
    setCopySourceDate(date)
    setCopySheetOpen(true)
  }

  // Semana móvil (siempre la actual)
  const mobileWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const mobileWeekEnd = addDays(mobileWeekStart, 6)
  const mobileWeek = {
    days: weekFrom(mobileWeekStart),
    label: `${format(mobileWeekStart, "d 'de' MMMM", { locale: es })} - ${format(mobileWeekEnd, "d 'de' MMMM", { locale: es })}`,
  }

  // Semana desktop (navega con offset)
  const desktopWeekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), desktopWeekOffset)
  const desktopWeekEnd = addDays(desktopWeekStart, 6)
  const desktopWeek = {
    start: desktopWeekStart,
    days: weekFrom(desktopWeekStart),
    label: `${format(desktopWeekStart, "d 'de' MMMM", { locale: es })} – ${format(desktopWeekEnd, "d 'de' MMMM yyyy", { locale: es })}`,
    isCurrent: desktopWeekOffset === 0,
  }

  return {
    todayMeals, sortedTodayMeals, mealsByCell, occupiedSlots,
    hasMealsForDate: (date: string) => mealDates.has(date),
    viewMode, setViewMode,
    setDesktopWeekOffset,
    mobileWeek, desktopWeek,
    sheetOpen, setSheetOpen, sheetMode, sheetKey, sheetDate, sheetSlot, editingMeal,
    copySheetOpen, setCopySheetOpen, copySheetKey, copySourceDate, copySourceMeals,
    openCreate, openEdit, openCopyDay,
    createMeal, updateMeal, deleteMeal, copyMealDay,
  }
}
