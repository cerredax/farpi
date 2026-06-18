'use client'

import { useMemo, useState } from 'react'
import { Plus, Pencil, ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { format, startOfWeek, addDays, isSameDay, addWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { useStore } from '@/lib/store-context'
import { getLocalDateString } from '@/lib/date-utils'
import { selectMealsByCell, selectOccupiedMealSlots, selectSortedMeals } from '@/lib/selectors'
import { MealSheet } from './MealSheet'
import { CopyMealSheet } from './CopyMealSheet'
import { Card } from '@/components/ui/Card'
import { MEAL_SLOTS } from '@/lib/constants'
import type { MealPlan, MealSlot } from '@/types'

const SLOT_META = Object.fromEntries(
  MEAL_SLOTS.map(s => [s.key, { label: s.label, emoji: s.emoji, order: s.order }])
) as Record<MealSlot, { label: string; emoji: string; order: number }>

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
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

function WeekGrid({
  weekDays,
  mealsByCell,
  onCreate,
  onEdit,
  onCopyDay,
  hasMealsForDate,
  cellMinHeight = 118,
}: {
  weekDays: Date[]
  mealsByCell: Map<string, MealPlan>
  onCreate: (date: string, slot: MealSlot) => void
  onEdit: (meal: MealPlan) => void
  onCopyDay: (date: string) => void
  hasMealsForDate: (date: string) => boolean
  cellMinHeight?: number
}) {
  const today = new Date()

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div
            className="grid border-b border-[#F0EDE8] bg-[#FCFBF8]"
            style={{ gridTemplateColumns: '132px repeat(7, minmax(104px, 1fr))' }}
          >
            <div className="sticky left-0 z-20 bg-[#FCFBF8] border-r border-[#F0EDE8] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#77716A]">Franja</p>
            </div>
            {weekDays.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const todayColumn = isSameDay(day, today)
              const hasMeals = hasMealsForDate(dayKey)
              return (
                <div
                  key={dayKey}
                  className={`px-3 py-3 text-center border-r last:border-r-0 border-[#F0EDE8] ${
                    todayColumn ? 'bg-[#F5FAF5]' : 'bg-[#FCFBF8]'
                  }`}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${todayColumn ? 'text-[#5C7A59]' : 'text-[#77716A]'}`}>
                    {capitalize(format(day, 'EEE', { locale: es }))}
                  </p>
                  <p className="text-sm font-extrabold mt-0.5 text-[#252525]">
                    {format(day, 'd')}
                  </p>
                  <button
                    type="button"
                    onClick={() => onCopyDay(dayKey)}
                    disabled={!hasMeals}
                    className={`mx-auto mt-2 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold transition-colors ${
                      hasMeals
                        ? 'bg-white text-[#8BA888] shadow-sm hover:bg-[#F1F5EF]'
                        : 'bg-white/50 text-[#C4BFB9] cursor-not-allowed'
                    }`}
                    aria-label={`Copiar menu del ${format(day, 'd MMM', { locale: es })}`}
                  >
                    <Copy size={10} strokeWidth={2.4} />
                    Copiar
                  </button>
                  {todayColumn && (
                    <span className="inline-block w-1 h-1 rounded-full bg-[#8BA888] mt-1" />
                  )}
                </div>
              )
            })}
          </div>

          {MEAL_SLOTS.map(slot => (
            <div
              key={slot.key}
              className="grid border-b border-[#F5F2EE] last:border-b-0"
              style={{ gridTemplateColumns: '132px repeat(7, minmax(104px, 1fr))' }}
            >
              <div className="sticky left-0 z-10 bg-white border-r border-[#F0EDE8] px-4 py-4 flex items-center gap-2">
                <span className="text-lg flex-shrink-0">{slot.emoji}</span>
                <p className="text-sm font-bold text-[#252525] leading-tight">{slot.label}</p>
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
                    className={`border-r last:border-r-0 border-[#F0EDE8] ${
                      todayColumn ? 'bg-[#F5FAF5]' : 'bg-white'
                    }`}
                  >
                    {meal ? (
                      <button
                        type="button"
                        onClick={() => onEdit(meal)}
                        className="group h-full w-full p-2 text-left"
                      >
                        <div className="h-full rounded-2xl border border-[#EDE9E3] bg-white/90 px-3 py-2 shadow-sm transition-colors group-hover:border-[#8BA888] group-hover:bg-white">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8BA888]">
                              {slot.emoji} {slot.label}
                            </p>
                            <Pencil size={11} className="text-[#C4BFB9] group-hover:text-[#8BA888] transition-colors flex-shrink-0" />
                          </div>
                          <p className="mt-1 text-sm font-semibold text-[#252525] leading-snug">
                            {meal.name}
                          </p>
                          {meal.notes && (
                            <p className="mt-1 text-[11px] text-[#77716A] leading-snug">
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
                        <div className="flex w-full items-center justify-center rounded-2xl border border-dashed border-[#D8D4CE] text-[#C4BFB9] transition-colors group-hover:border-[#8BA888] group-hover:bg-[#F5F9F5] group-hover:text-[#8BA888]" style={{ minHeight: cellMinHeight - 32 }}>
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

type ViewMode = 'today' | 'week'

export function MealsView() {
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

  function handleCopyMenu(sourceDate: string, targetDate: string, repeatUntil?: string) {
    copyMealDay(sourceDate, targetDate, repeatUntil)
  }

  // Semana móvil (siempre la actual)
  const mobileWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const mobileWeekDays  = Array.from({ length: 7 }, (_, i) => addDays(mobileWeekStart, i))
  const mobileWeekEnd   = addDays(mobileWeekStart, 6)
  const mobileWeekLabel = `${format(mobileWeekStart, "d 'de' MMMM", { locale: es })} - ${format(mobileWeekEnd, "d 'de' MMMM", { locale: es })}`

  // Semana desktop (navega con offset)
  const desktopWeekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), desktopWeekOffset)
  const desktopWeekDays  = Array.from({ length: 7 }, (_, i) => addDays(desktopWeekStart, i))
  const desktopWeekEnd   = addDays(desktopWeekStart, 6)
  const desktopWeekLabel = `${format(desktopWeekStart, "d 'de' MMMM", { locale: es })} – ${format(desktopWeekEnd, "d 'de' MMMM yyyy", { locale: es })}`
  const isCurrentDesktopWeek = desktopWeekOffset === 0

  const sharedSheet = (
    <>
      <MealSheet
        key={sheetKey}
        open={sheetOpen}
        mode={sheetMode}
        initial={editingMeal}
        defaultDate={sheetDate}
        defaultSlot={sheetSlot}
        occupiedSlots={occupiedSlots}
        onClose={() => setSheetOpen(false)}
        onCreate={createMeal}
        onUpdate={updateMeal}
        onDelete={deleteMeal}
      />
      <CopyMealSheet
        key={`copy-${copySheetOpen ? 'open' : 'closed'}-${copySourceDate ?? 'none'}`}
        open={copySheetOpen}
        sourceDate={copySourceDate}
        sourceMeals={copySourceMeals}
        onClose={() => setCopySheetOpen(false)}
        onCopy={handleCopyMenu}
      />
    </>
  )

  return (
    <>
      {/* ── Mobile layout ───────────────────────────────────────────── */}
      <div className="md:hidden max-w-lg mx-auto px-4 py-6 space-y-5">
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
                  {sortedTodayMeals.map(meal => (
                    <MealRow key={meal.id} meal={meal} onEdit={openEdit} />
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {viewMode === 'week' && (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#77716A]">Vista semanal</p>
                <p className="text-sm text-[#77716A] mt-0.5">{mobileWeekLabel}</p>
              </div>
              <button
                onClick={() => openCreate(getLocalDateString(), 'lunch')}
                aria-label="Añadir comida de hoy"
                className="w-9 h-9 bg-[#8BA888] text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#7a9877] transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
            <WeekGrid
              weekDays={mobileWeekDays}
              mealsByCell={mealsByCell}
              onCreate={openCreate}
              onEdit={openEdit}
              onCopyDay={openCopyDay}
              hasMealsForDate={(date) => mealDates.has(date)}
            />
          </div>
        )}
      </div>

      {/* ── Desktop layout ──────────────────────────────────────────── */}
      <div className="hidden md:block px-6 lg:px-10 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#252525] leading-tight">Comidas</h1>
            <p className="text-xs text-[#77716A] mt-0.5">{desktopWeekLabel}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Week nav */}
            <div className="flex items-center gap-1 bg-[#F0EDE8] rounded-2xl p-1">
              <button
                onClick={() => setDesktopWeekOffset(o => o - 1)}
                aria-label="Semana anterior"
                className="w-8 h-8 flex items-center justify-center rounded-xl text-[#77716A] hover:bg-white hover:text-[#252525] transition-colors"
              >
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <button
                onClick={() => setDesktopWeekOffset(0)}
                className={`px-3 h-8 rounded-xl text-xs font-bold transition-colors ${isCurrentDesktopWeek ? 'bg-white text-[#252525] shadow-sm' : 'text-[#77716A] hover:bg-white/60'}`}
              >
                {isCurrentDesktopWeek ? 'Esta semana' : capitalize(format(desktopWeekStart, 'MMMM', { locale: es }))}
              </button>
              <button
                onClick={() => setDesktopWeekOffset(o => o + 1)}
                aria-label="Semana siguiente"
                className="w-8 h-8 flex items-center justify-center rounded-xl text-[#77716A] hover:bg-white hover:text-[#252525] transition-colors"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>

            <button
              onClick={() => openCreate(getLocalDateString())}
              aria-label="Añadir comida"
              className="flex items-center gap-2 px-4 h-9 bg-[#8BA888] text-white rounded-full text-sm font-semibold shadow-md hover:bg-[#7a9877] transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              Añadir
            </button>
          </div>
        </div>

        {/* Grid */}
        <WeekGrid
          weekDays={desktopWeekDays}
          mealsByCell={mealsByCell}
          onCreate={openCreate}
          onEdit={openEdit}
          onCopyDay={openCopyDay}
          hasMealsForDate={(date) => mealDates.has(date)}
          cellMinHeight={96}
        />
      </div>

      {sharedSheet}
    </>
  )
}
