'use client'

import { useMemo, useState } from 'react'
import { addDays, addWeeks, format, startOfDay, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { useStore } from '@/lib/store-context'
import { getLocalDateString } from '@/lib/date-utils'
import { selectMealsByCell, selectOccupiedMealSlots, selectSortedMeals } from '@/lib/selectors'
import { filterMealsBySlots, visibleMealSlots } from '@/lib/meal-slots'
import type { MealPlan, MealSlot } from '@/types'

type ViewMode = 'today' | 'week'

function weekFrom(start: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Estado de la pantalla de comidas: pestañas, semana visible y sheets. */
export function useMealsState() {
  const { todayMeals, meals, mealSlots, createMeal, copyMealDay, updateMeal, deleteMeal } = useStore()

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

  // Las franjas que la familia quiere ver (Ajustes → Comidas). Las filas de la
  // semana salen de aquí, así que apagar una la quita de la rejilla y de la lista
  // sin tocar lo que hubiera apuntado en ella. `todayMeals` ya viene filtrado del
  // store, que es de donde lo leen también Inicio y la pestaña "Hoy".
  const slots = useMemo(() => visibleMealSlots(mealSlots), [mealSlots])

  const sortedTodayMeals = selectSortedMeals(todayMeals)
  const mealsByCell = selectMealsByCell(meals)
  const occupiedSlots = selectOccupiedMealSlots(meals, sheetDate)
  const mealDates = useMemo(() => new Set(meals.map(meal => meal.date)), [meals])
  const copySourceMeals = useMemo(
    () => copySourceDate
      ? filterMealsBySlots(meals.filter(meal => meal.date === copySourceDate), mealSlots)
      : [],
    [copySourceDate, meals, mealSlots],
  )

  // Sin fecha se entiende "hoy": así todos los accesos abren el mismo
  // formulario y calculan igual las franjas ya ocupadas.
  function openCreate(date: string = getLocalDateString(), slot?: MealSlot) {
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

  // Semana móvil: los próximos siete días desde hoy, no la semana natural.
  // Empezando en lunes, un domingo se mostraban seis días ya pasados, que no
  // sirven para planificar. Es el mismo criterio que la agenda del calendario.
  const mobileWeekStart = startOfDay(new Date())
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

  // El catálogo de platos no se mantiene a mano: es lo que la familia ya ha
  // cocinado, primeros y segundos por igual —un segundo del comedor es un plato
  // como cualquier otro y también sirve de sugerencia—.
  const historialPlatos = useMemo(
    () => meals.flatMap(meal => [meal.name, meal.second_course ?? '']).filter(plato => plato.length > 0),
    [meals],
  )

  return {
    todayMeals, sortedTodayMeals, mealsByCell, occupiedSlots, historialPlatos,
    slots, mealSlots,
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
