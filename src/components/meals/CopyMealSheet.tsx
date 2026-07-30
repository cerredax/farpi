'use client'

import { useMemo, useState } from 'react'
import { Copy, Repeat } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { MEAL_SLOTS } from '@/lib/constants'
import { getLocalDateString } from '@/lib/date-utils'
import type { MealPlan, MealSlot } from '@/types'

const SLOT_META = Object.fromEntries(
  MEAL_SLOTS.map(s => [s.key, { label: s.label, emoji: s.emoji, order: s.order }])
) as Record<MealSlot, { label: string; emoji: string; order: number }>

interface CopyMealSheetProps {
  open: boolean
  sourceDate: string | null
  sourceMeals: MealPlan[]
  onClose: () => void
  onCopy: (sourceDate: string, targetDate: string, repeatUntil?: string) => void
}

function parseLocalDate(date: string): Date {
  return new Date(`${date}T00:00:00`)
}

function getNextDate(date: string): string {
  const d = parseLocalDate(date)
  d.setDate(d.getDate() + 1)
  return getLocalDateString(d)
}

function formatDateLabel(date: string | null): string {
  if (!date) return ''
  return format(parseLocalDate(date), "EEEE d 'de' MMMM", { locale: es })
}

export function CopyMealSheet({ open, sourceDate, sourceMeals, onClose, onCopy }: CopyMealSheetProps) {
  const defaultTargetDate = sourceDate ? getNextDate(sourceDate) : getLocalDateString()
  const [targetDate, setTargetDate] = useState(defaultTargetDate)
  const [repeatEveryDay, setRepeatEveryDay] = useState(false)
  const [repeatUntil, setRepeatUntil] = useState(defaultTargetDate)

  const sortedMeals = useMemo(
    () => [...sourceMeals].sort((a, b) => SLOT_META[a.slot].order - SLOT_META[b.slot].order),
    [sourceMeals],
  )

  const hasMeals = sortedMeals.length > 0
  const invalidRepeatRange = repeatEveryDay && repeatUntil < targetDate
  const disabled = !sourceDate || !targetDate || !hasMeals || invalidRepeatRange

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled || !sourceDate) return
    onCopy(sourceDate, targetDate, repeatEveryDay ? repeatUntil : undefined)
    onClose()
  }

  const footer = (
    <div className="px-5 pb-8 pt-3">
      <Button type="submit" form="copy-meal-form" fullWidth size="lg" disabled={disabled}>
        {repeatEveryDay ? 'Copiar y repetir menu' : 'Copiar menu'}
      </Button>
    </div>
  )

  return (
    <BottomSheet open={open} title="Copiar menu" onClose={onClose} footer={footer}>
      <form id="copy-meal-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-4 space-y-5">
        <div className="rounded-3xl border border-surface bg-[#FFF8EF] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
              <Copy size={17} strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-muted">Menu origen</p>
              <p className="text-sm font-bold text-ink capitalize">{formatDateLabel(sourceDate)}</p>
              {!hasMeals && (
                <p className="mt-1 text-xs font-semibold text-accent">
                  Este dia no tiene comidas para copiar.
                </p>
              )}
            </div>
          </div>

          {hasMeals && (
            <div className="mt-3 space-y-2">
              {sortedMeals.map(meal => {
                const meta = SLOT_META[meal.slot]
                return (
                  <div key={meal.id} className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2">
                    <span className="text-base">{meta.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{meta.label}</p>
                      <p className="truncate text-sm font-semibold text-ink">{meal.name}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="copy-target" className="text-xs font-bold text-muted uppercase tracking-widest">Copiar al dia</label>
          <input
            id="copy-target"
            type="date"
            value={targetDate}
            onChange={e => {
              setTargetDate(e.target.value)
              if (!repeatEveryDay || repeatUntil < e.target.value) setRepeatUntil(e.target.value)
            }}
            required
            className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <p className="text-[11px] text-muted">
            Si ese dia ya tenia menu, se sustituira por este.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-surface bg-canvas px-3 py-3">
          <input
            type="checkbox"
            checked={repeatEveryDay}
            onChange={e => setRepeatEveryDay(e.target.checked)}
            className="mt-1 h-4 w-4 accent-primary"
          />
          <span className="flex-1">
            <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <Repeat size={14} />
              Repetir este menu cada dia
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              Ideal para repetir una semana tipo hasta la fecha que elijas.
            </span>
          </span>
        </label>

        {repeatEveryDay && (
          <div className="space-y-1.5">
            <label htmlFor="copy-until" className="text-xs font-bold text-muted uppercase tracking-widest">Fecha fin</label>
            <input
              id="copy-until"
              type="date"
              value={repeatUntil}
              min={targetDate}
              onChange={e => setRepeatUntil(e.target.value)}
              required
              className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
            {invalidRepeatRange && (
              <p className="text-[11px] font-semibold text-danger">
                La fecha fin no puede ser anterior al dia destino.
              </p>
            )}
          </div>
        )}
      </form>
    </BottomSheet>
  )
}
