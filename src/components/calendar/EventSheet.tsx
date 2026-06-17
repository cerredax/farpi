'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { extractTime, getLocalDateString } from '@/lib/date-utils'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import type { Event, Child, EventDraft } from '@/types'

type Mode = 'create' | 'edit'
type Recurrence = 'none' | 'weekly'

interface EventSheetProps {
  open: boolean
  mode: Mode
  initial?: Event | null
  defaultDate?: Date
  kids: Child[]
  onClose: () => void
  onCreate: (draft: EventDraft) => void
  onCreateSeries?: (draft: EventDraft, weekdays: number[], endDate: string) => void
  onUpdate: (id: string, draft: EventDraft) => void
  onDelete: (id: string) => void
}

// L M X J V S D → JS getDay() values: Mon=1 Tue=2 Wed=3 Thu=4 Fri=5 Sat=6 Sun=0
const WEEKDAY_BUTTONS = [
  { label: 'L', day: 1 },
  { label: 'M', day: 2 },
  { label: 'X', day: 3 },
  { label: 'J', day: 4 },
  { label: 'V', day: 5 },
  { label: 'S', day: 6 },
  { label: 'D', day: 0 },
]

const WEEKDAY_NAMES: Record<number, string> = {
  0: 'domingos', 1: 'lunes', 2: 'martes', 3: 'miércoles',
  4: 'jueves', 5: 'viernes', 6: 'sábados',
}

// Display order for joining names: Mon→Sun
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function joinDayNames(days: number[]): string {
  const names = WEEKDAY_ORDER.filter(d => days.includes(d)).map(d => WEEKDAY_NAMES[d])
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1]
}

function weekdayFromDate(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay()
}

function countSeriesEvents(startDate: string, endDate: string, weekdays: number[]): number {
  if (!startDate || !endDate || weekdays.length === 0) return 0
  const cur = new Date(startDate + 'T12:00:00')
  const end = new Date(endDate + 'T12:00:00')
  if (end < cur) return 0
  let count = 0
  while (cur <= end) {
    if (weekdays.includes(cur.getDay())) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function maxEndDateStr(startDate: string): string {
  const d = new Date(startDate + 'T12:00:00')
  d.setDate(d.getDate() + 364) // 52 semanas
  return getLocalDateString(d)
}

function initDraft(mode: Mode, initial: Event | null | undefined, defaultDate: Date | undefined): EventDraft {
  if (mode === 'edit' && initial) {
    return {
      title: initial.title,
      description: initial.description ?? '',
      date: initial.start_at.slice(0, 10),
      all_day: initial.all_day,
      start_time: initial.all_day ? '' : extractTime(initial.start_at),
      end_time: initial.end_at && !initial.all_day ? extractTime(initial.end_at) : '',
      child_id: initial.child_id,
    }
  }
  return {
    title: '', description: '',
    date: format(defaultDate ?? new Date(), 'yyyy-MM-dd'),
    all_day: false, start_time: '', end_time: '', child_id: null,
  }
}

export function EventSheet({ open, mode, initial, defaultDate, kids, onClose, onCreate, onCreateSeries, onUpdate, onDelete }: EventSheetProps) {
  const [draft, setDraft] = useState<EventDraft>(() => initDraft(mode, initial, defaultDate))
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>([])
  const [recurrenceEnd, setRecurrenceEnd] = useState('')
  const weekdaysTouchedRef = useRef(false)
  const { confirming: confirmDelete, requestConfirm } = useConfirmAction()
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && mode === 'create') setTimeout(() => titleRef.current?.focus(), 300)
  }, [open, mode])

  function handleDateChange(newDate: string) {
    setDraft(d => ({ ...d, date: newDate }))
    if (recurrence === 'weekly' && !weekdaysTouchedRef.current) {
      setRecurrenceWeekdays([weekdayFromDate(newDate)])
    }
  }

  function handleSetNone() {
    setRecurrence('none')
  }

  function handleSetWeekly() {
    weekdaysTouchedRef.current = false
    setRecurrenceWeekdays([weekdayFromDate(draft.date)])
    setRecurrence('weekly')
  }

  function toggleWeekday(day: number) {
    weekdaysTouchedRef.current = true
    setRecurrenceWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.title.trim()) return
    if (mode === 'edit') {
      if (initial) onUpdate(initial.id, draft)
      onClose()
      return
    }
    if (recurrence === 'weekly') {
      if (seriesError) return
      onCreateSeries?.(draft, recurrenceWeekdays, recurrenceEnd)
    } else {
      onCreate(draft)
    }
    onClose()
  }

  function handleDelete() {
    if (!initial) return
    requestConfirm(() => { onDelete(initial.id); onClose() })
  }

  // ── Cálculos para la sección de series ──────────────────────────────────────
  const seriesCount = recurrence === 'weekly'
    ? countSeriesEvents(draft.date, recurrenceEnd, recurrenceWeekdays)
    : 0

  const seriesError: string | null = recurrence === 'weekly' ? (() => {
    if (recurrenceWeekdays.length === 0) return 'Selecciona al menos un día'
    if (!recurrenceEnd) return 'Indica la fecha de fin'
    if (recurrenceEnd < draft.date) return 'La fecha de fin debe ser posterior a la fecha de inicio'
    if (recurrenceEnd > maxEndDateStr(draft.date)) return 'El período máximo es 52 semanas'
    if (seriesCount === 0) return 'No se crearán eventos con esta configuración'
    return null
  })() : null

  const canSubmit = draft.title.trim().length > 0 && seriesError === null

  // Preview text
  const previewReady = recurrence === 'weekly' && recurrenceWeekdays.length > 0 && recurrenceEnd && seriesCount > 0
  const previewDaysText = joinDayNames(recurrenceWeekdays)
  const previewEndText = recurrenceEnd
    ? format(new Date(recurrenceEnd + 'T12:00:00'), "d 'de' MMMM", { locale: es })
    : ''

  const submitLabel = mode === 'edit'
    ? 'Guardar cambios'
    : recurrence === 'weekly' && seriesCount > 0
      ? `Crear ${seriesCount} eventos`
      : 'Crear evento'

  const familyOption = { id: null as string | null, name: 'Familia', color: '#E9C46A' }
  const assignees = [familyOption, ...kids.map(c => ({ id: c.id as string | null, name: c.name, color: c.color }))]

  return (
    <>
      <div className={`fixed inset-0 z-50 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[92dvh] flex flex-col ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-[#E0DDD8]" /></div>
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <h3 className="font-extrabold text-[#252525] text-base">{mode === 'create' ? 'Nuevo evento' : 'Editar evento'}</h3>
          <div className="flex items-center gap-2">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${confirmDelete ? 'bg-[#D96C6C] text-white' : 'text-[#D96C6C] hover:bg-[#FDE8E8]'}`}
              >
                <Trash2 size={13} />
                {confirmDelete ? 'Confirmar' : 'Eliminar'}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-[#77716A] hover:bg-[#F0EDE8] transition-colors"><X size={18} /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-5 pt-1 pb-4 space-y-5">

            {/* Título */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Título</label>
              <input ref={titleRef} type="text" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="¿Qué ocurre?" className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition" />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Descripción</label>
              <textarea value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Lugar, notas…" rows={2} className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition resize-none" />
            </div>

            {/* Fecha + todo el día */}
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Fecha</label>
                <input type="date" value={draft.date} onChange={e => handleDateChange(e.target.value)} className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition" />
              </div>
              <div className="flex flex-col items-center gap-1.5 pb-0.5">
                <span className="text-[10px] font-bold text-[#77716A] uppercase tracking-widest whitespace-nowrap">Todo el día</span>
                <button type="button" role="switch" aria-checked={draft.all_day} onClick={() => setDraft(d => ({ ...d, all_day: !d.all_day }))} className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${draft.all_day ? 'bg-[#8BA888]' : 'bg-[#D4CFC9]'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${draft.all_day ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {/* Hora inicio / fin */}
            {!draft.all_day && (
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Inicio</label>
                  <input type="time" value={draft.start_time} onChange={e => setDraft(d => ({ ...d, start_time: e.target.value }))} className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Fin</label>
                  <input type="time" value={draft.end_time} onChange={e => setDraft(d => ({ ...d, end_time: e.target.value }))} className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition" />
                </div>
              </div>
            )}

            {/* Asignar a */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Asignar a</label>
              <div className="flex gap-3">
                {assignees.map(a => {
                  const selected = draft.child_id === a.id
                  return (
                    <button key={String(a.id)} type="button" onClick={() => setDraft(d => ({ ...d, child_id: a.id }))} className="flex flex-col items-center gap-1.5 flex-1 py-2 rounded-2xl transition-colors" style={{ backgroundColor: selected ? a.color + '22' : 'transparent' }}>
                      <span className="w-7 h-7 rounded-full transition-all" style={{ backgroundColor: a.color, boxShadow: selected ? `0 0 0 3px white, 0 0 0 5px ${a.color}` : 'none', transform: selected ? 'scale(1.15)' : 'scale(1)' }} />
                      <span className="text-[11px] font-bold transition-colors" style={{ color: selected ? a.color : '#77716A' }}>{a.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Repetición — solo en crear */}
            {mode === 'create' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Repetición</label>

                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#F2EEE8] p-1">
                  <button
                    type="button"
                    onClick={handleSetNone}
                    className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${recurrence === 'none' ? 'bg-white text-[#252525] shadow-sm' : 'text-[#77716A]'}`}
                  >
                    No se repite
                  </button>
                  <button
                    type="button"
                    onClick={handleSetWeekly}
                    className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${recurrence === 'weekly' ? 'bg-white text-[#252525] shadow-sm' : 'text-[#77716A]'}`}
                  >
                    Cada semana
                  </button>
                </div>

                {recurrence === 'weekly' && (
                  <div className="space-y-4">
                    {/* Selector de días */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Repetir los días</label>
                      <div className="flex gap-1">
                        {WEEKDAY_BUTTONS.map(({ label, day }) => {
                          const active = recurrenceWeekdays.includes(day)
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleWeekday(day)}
                              className={`flex-1 h-9 rounded-xl text-xs font-black transition-colors ${
                                active
                                  ? 'bg-[#8BA888] text-white'
                                  : 'bg-[#FAF7F2] border border-[#EDE9E3] text-[#77716A] hover:border-[#8BA888]'
                              }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Fecha de fin */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Termina el</label>
                      <input
                        type="date"
                        value={recurrenceEnd}
                        min={draft.date}
                        max={maxEndDateStr(draft.date)}
                        onChange={e => setRecurrenceEnd(e.target.value)}
                        className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
                      />
                    </div>

                    {/* Vista previa */}
                    {previewReady && (
                      <div className="rounded-2xl bg-[#F1F5EF] border border-[#8BA888]/25 p-3.5 space-y-1">
                        <p className="text-sm text-[#252525] leading-snug">
                          <span className="font-semibold">{draft.title.trim() || 'El evento'}</span>
                          {' '}se añadirá los {previewDaysText} hasta el {previewEndText}.
                        </p>
                        <p className="text-sm font-bold text-[#8BA888]">Se crearán {seriesCount} eventos.</p>
                        <p className="text-xs text-[#77716A]">Podrás editar cada evento por separado.</p>
                      </div>
                    )}

                    {/* Error de validación */}
                    {seriesError && (
                      <p className="text-xs font-bold text-[#D96C6C]">{seriesError}</p>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="flex-shrink-0 px-5 pb-8 pt-3 border-t border-[#F5F2EE]">
            <Button type="submit" fullWidth size="lg" disabled={!canSubmit}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
