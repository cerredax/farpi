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
        <div className="rounded-3xl border border-[#F0EDE8] bg-[#FFF8EF] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#8BA888] shadow-sm">
              <Copy size={17} strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-[#77716A]">Menu origen</p>
              <p className="text-sm font-bold text-[#252525] capitalize">{formatDateLabel(sourceDate)}</p>
              {!hasMeals && (
                <p className="mt-1 text-xs font-semibold text-[#D8A48F]">
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
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#77716A]">{meta.label}</p>
                      <p className="truncate text-sm font-semibold text-[#252525]">{meal.name}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Copiar al dia</label>
          <input
            type="date"
            value={targetDate}
            onChange={e => {
              setTargetDate(e.target.value)
              if (!repeatEveryDay || repeatUntil < e.target.value) setRepeatUntil(e.target.value)
            }}
            required
            className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
          />
          <p className="text-[11px] text-[#77716A]">
            Si ese dia ya tenia menu, se sustituira por este.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-[#F0EDE8] bg-[#FAF7F2] px-3 py-3">
          <input
            type="checkbox"
            checked={repeatEveryDay}
            onChange={e => setRepeatEveryDay(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[#8BA888]"
          />
          <span className="flex-1">
            <span className="flex items-center gap-1.5 text-sm font-bold text-[#252525]">
              <Repeat size={14} />
              Repetir este menu cada dia
            </span>
            <span className="mt-0.5 block text-xs text-[#77716A]">
              Ideal para repetir una semana tipo hasta la fecha que elijas.
            </span>
          </span>
        </label>

        {repeatEveryDay && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Fecha fin</label>
            <input
              type="date"
              value={repeatUntil}
              min={targetDate}
              onChange={e => setRepeatUntil(e.target.value)}
              required
              className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
            />
            {invalidRepeatRange && (
              <p className="text-[11px] font-semibold text-[#D96C6C]">
                La fecha fin no puede ser anterior al dia destino.
              </p>
            )}
          </div>
        )}
      </form>
    </BottomSheet>
  )
}
