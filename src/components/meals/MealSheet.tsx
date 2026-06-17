'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { MEAL_SLOTS } from '@/lib/constants'
import { getLocalDateString } from '@/lib/date-utils'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import type { MealPlan, MealDraft, MealSlot } from '@/types'

interface MealSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: MealPlan | null
  defaultDate?: string
  occupiedSlots?: MealSlot[]
  onClose: () => void
  onCreate: (draft: MealDraft) => void
  onUpdate: (id: string, draft: MealDraft) => void
  onDelete: (id: string) => void
}

function initDraft(mode: 'create' | 'edit', initial: MealPlan | null | undefined, defaultDate?: string): MealDraft {
  if (mode === 'edit' && initial) {
    return { date: initial.date, slot: initial.slot, name: initial.name, notes: initial.notes ?? '' }
  }
  return { date: defaultDate ?? getLocalDateString(), slot: 'lunch', name: '', notes: '' }
}

export function MealSheet({ open, mode, initial, defaultDate, occupiedSlots = [], onClose, onCreate, onUpdate, onDelete }: MealSheetProps) {
  const [draft, setDraft] = useState<MealDraft>(() => initDraft(mode, initial, defaultDate))
  const { confirming: confirmDel, requestConfirm } = useConfirmAction()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) return
    if (mode === 'create') onCreate(draft)
    else if (initial) onUpdate(initial.id, draft)
    onClose()
  }

  function handleDelete() {
    if (!initial) return
    requestConfirm(() => { onDelete(initial.id); onClose() })
  }

  const footer = (
    <div className="px-5 pb-8 pt-3 space-y-2">
      <Button
        type="submit"
        form="meal-form"
        fullWidth
        size="lg"
        disabled={!draft.name.trim() || !draft.date}
      >
        {mode === 'create' ? 'Guardar comida' : 'Guardar cambios'}
      </Button>
      {mode === 'edit' && (
        <button
          type="button"
          onClick={handleDelete}
          className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${confirmDel ? 'bg-[#D96C6C] text-white' : 'text-[#D96C6C] hover:bg-[#FDE8E8]'}`}
        >
          <span className="flex items-center justify-center gap-2">
            <Trash2 size={15} />
            {confirmDel ? 'Confirmar eliminación' : 'Eliminar comida'}
          </span>
        </button>
      )}
    </div>
  )

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? 'Añadir comida' : 'Editar comida'}
      onClose={onClose}
      footer={footer}
    >
      <form id="meal-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        {/* Fecha */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Fecha</label>
          <input
            type="date"
            value={draft.date}
            onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
            required
            className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
          />
        </div>

        {/* Franja horaria */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Franja</label>
          <div className="grid grid-cols-4 gap-2">
            {MEAL_SLOTS.map(slot => {
              const occupied = mode === 'create' && occupiedSlots.includes(slot.key)
              const selected = draft.slot === slot.key
              return (
                <button
                  key={slot.key}
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, slot: slot.key }))}
                  className={`py-2.5 rounded-xl text-center transition-colors flex flex-col items-center gap-1 relative ${selected ? 'bg-[#8BA888] text-white' : 'bg-[#FAF7F2] text-[#77716A] hover:bg-[#F0EDE8]'}`}
                >
                  <span className="text-base">{slot.emoji}</span>
                  <span className="text-[10px] font-bold">{slot.label}</span>
                  {occupied && (
                    <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${selected ? 'bg-white/70' : 'bg-[#D8A48F]'}`} />
                  )}
                </button>
              )
            })}
          </div>
          {mode === 'create' && occupiedSlots.includes(draft.slot) && (
            <p className="text-[11px] text-[#D8A48F] font-semibold flex items-center gap-1">
              <span>↻</span> Este horario ya tiene plato — se reemplazará
            </p>
          )}
        </div>

        {/* Plato */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Plato</label>
          <input
            ref={inputRef}
            type="text"
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="Ej: Arroz con pollo"
            required
            className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
          />
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">
            Notas <span className="normal-case font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={draft.notes}
            onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
            placeholder="Ej: Sin cebolla"
            className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
          />
        </div>
      </form>
    </BottomSheet>
  )
}
