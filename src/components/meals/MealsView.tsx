'use client'

import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getLocalDateString } from '@/lib/date-utils'
import { MealSheet } from './MealSheet'
import { CopyMealSheet } from './CopyMealSheet'
import { MealRow } from './MealRow'
import { WeekGrid } from './WeekGrid'
import { useMealsState } from './useMealsState'
import { Card } from '@/components/ui/Card'
import { capitalize } from '@/lib/text'

export function MealsView() {
  const s = useMealsState()

  const sharedSheet = (
    <>
      <MealSheet
        key={s.sheetKey}
        open={s.sheetOpen}
        mode={s.sheetMode}
        initial={s.editingMeal}
        defaultDate={s.sheetDate}
        defaultSlot={s.sheetSlot}
        occupiedSlots={s.occupiedSlots}
        onClose={() => s.setSheetOpen(false)}
        onCreate={s.createMeal}
        onUpdate={s.updateMeal}
        onDelete={s.deleteMeal}
      />
      <CopyMealSheet
        key={s.copySheetKey}
        open={s.copySheetOpen}
        sourceDate={s.copySourceDate}
        sourceMeals={s.copySourceMeals}
        onClose={() => s.setCopySheetOpen(false)}
        onCopy={s.copyMealDay}
      />
    </>
  )

  return (
    <>
      {/* ── Mobile layout ───────────────────────────────────────────── */}
      <div className="md:hidden max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-ink leading-tight">Comidas</h1>
            <p className="text-xs text-muted mt-0.5">Menú de la familia</p>
          </div>
          <button
            onClick={() => s.openCreate()}
            aria-label="Añadir comida"
            className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-hover transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex gap-2 bg-surface p-1 rounded-2xl">
          {(['today', 'week'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => s.setViewMode(tab)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${s.viewMode === tab ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}
            >
              {tab === 'today' ? 'Hoy' : 'Esta semana'}
            </button>
          ))}
        </div>

        {s.viewMode === 'today' && (
          <div>
            {s.todayMeals.length === 0 ? (
              <Card className="py-10 text-center">
                <p className="text-3xl mb-2">🍽️</p>
                <p className="font-bold text-ink text-sm">Sin menú para hoy</p>
                <p className="text-xs text-muted mt-1">Planifica las comidas de hoy</p>
                <button
                  onClick={() => s.openCreate(getLocalDateString())}
                  className="mt-4 text-sm font-semibold text-primary hover:underline"
                >
                  + Añadir comida de hoy
                </button>
              </Card>
            ) : (
              <Card padded={false}>
                <ul className="divide-y divide-hairline">
                  {s.sortedTodayMeals.map(meal => (
                    <MealRow key={meal.id} meal={meal} onEdit={s.openEdit} />
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {s.viewMode === 'week' && (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted">Vista semanal</p>
                <p className="text-sm text-muted mt-0.5">{s.mobileWeek.label}</p>
              </div>
              <button
                onClick={() => s.openCreate(getLocalDateString(), 'lunch')}
                aria-label="Añadir comida de hoy"
                className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-hover transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
            <WeekGrid
              weekDays={s.mobileWeek.days}
              mealsByCell={s.mealsByCell}
              onCreate={s.openCreate}
              onEdit={s.openEdit}
              onCopyDay={s.openCopyDay}
              hasMealsForDate={s.hasMealsForDate}
            />
          </div>
        )}
      </div>

      {/* ── Desktop layout ──────────────────────────────────────────── */}
      <div className="hidden md:block px-6 lg:px-10 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-ink leading-tight">Comidas</h1>
            <p className="text-xs text-muted mt-0.5">{s.desktopWeek.label}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Week nav */}
            <div className="flex items-center gap-1 bg-surface rounded-2xl p-1">
              <button
                onClick={() => s.setDesktopWeekOffset(o => o - 1)}
                aria-label="Semana anterior"
                className="w-8 h-8 flex items-center justify-center rounded-xl text-muted hover:bg-white hover:text-ink transition-colors"
              >
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <button
                onClick={() => s.setDesktopWeekOffset(0)}
                className={`px-3 h-8 rounded-xl text-xs font-bold transition-colors ${s.desktopWeek.isCurrent ? 'bg-white text-ink shadow-sm' : 'text-muted hover:bg-white/60'}`}
              >
                {s.desktopWeek.isCurrent ? 'Esta semana' : capitalize(format(s.desktopWeek.start, 'MMMM', { locale: es }))}
              </button>
              <button
                onClick={() => s.setDesktopWeekOffset(o => o + 1)}
                aria-label="Semana siguiente"
                className="w-8 h-8 flex items-center justify-center rounded-xl text-muted hover:bg-white hover:text-ink transition-colors"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </div>

            <button
              onClick={() => s.openCreate(getLocalDateString())}
              aria-label="Añadir comida"
              className="flex items-center gap-2 px-4 h-9 bg-primary text-white rounded-full text-sm font-semibold shadow-md hover:bg-primary-hover transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              Añadir
            </button>
          </div>
        </div>

        {/* Grid */}
        <WeekGrid
          weekDays={s.desktopWeek.days}
          mealsByCell={s.mealsByCell}
          onCreate={s.openCreate}
          onEdit={s.openEdit}
          onCopyDay={s.openCopyDay}
          hasMealsForDate={s.hasMealsForDate}
          cellMinHeight={96}
        />
      </div>

      {sharedSheet}
    </>
  )
}
