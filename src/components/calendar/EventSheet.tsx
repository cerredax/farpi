'use client'

import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { DotOption } from '@/components/ui/DotOption'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { extractDate, extractTime, getLocalDateString, parseLocalDate } from '@/lib/date-utils'
import { buildWeeklyDates } from '@/lib/recurrence'
import { validateEventDraft } from '@/lib/validators'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import type { Event, Child, EventDraft, FamilyMember } from '@/types'
import { assigneeKeyOf, buildAssignees } from '@/lib/assignees'

type Mode = 'create' | 'edit'
type Recurrence = 'none' | 'weekly' | 'yearly'

interface EventSheetProps {
  open: boolean
  mode: Mode
  initial?: Event | null
  defaultDate?: Date
  kids: Child[]
  members: FamilyMember[]
  onClose: () => void
  onCreate: (draft: EventDraft) => void
  onCreateSeries?: (draft: EventDraft, weekdays: number[], endDate: string) => void
  onCreateYearlySeries?: (draft: EventDraft, endYear: number) => void
  onUpdate: (id: string, draft: EventDraft) => void
  onDelete: (id: string) => void
  onDeleteSeries?: (groupId: string) => void
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
  return parseLocalDate(dateStr).getDay()
}

function maxEndDateStr(startDate: string): string {
  const d = parseLocalDate(startDate)
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
      member_id: initial.member_id,
      kind: initial.kind,
      end_date: initial.kind === 'vacaciones' && initial.end_at ? extractDate(initial.end_at) : '',
    }
  }
  return {
    title: '', description: '',
    date: format(defaultDate ?? new Date(), 'yyyy-MM-dd'),
    all_day: false, start_time: '', end_time: '', child_id: null, member_id: null,
    kind: 'evento', end_date: '',
  }
}

export function EventSheet({ open, mode, initial, defaultDate, kids, members, onClose, onCreate, onCreateSeries, onCreateYearlySeries, onUpdate, onDelete, onDeleteSeries }: EventSheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<EventDraft>({
    open,
    initialDraft: () => initDraft(mode, initial, defaultDate),
    validate: validateEventDraft,
    autoFocus: mode === 'create',
  })
  const { confirming: confirmDelete, handleDelete } = useSheetDelete({ initial, onDelete, onClose })
  const [seriesDeleteOpen, setSeriesDeleteOpen] = useState(false)
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>([])
  const [recurrenceEnd, setRecurrenceEnd] = useState('')
  const [recurrenceEndYear, setRecurrenceEndYear] = useState<number>(() => new Date().getFullYear() + 5)
  const weekdaysTouchedRef = useRef(false)

  const esVacaciones = draft.kind === 'vacaciones'
  const diasVacaciones = esVacaciones && draft.end_date >= draft.date
    ? Math.round((new Date(draft.end_date + 'T12:00:00').getTime() - new Date(draft.date + 'T12:00:00').getTime()) / 86_400_000) + 1
    : 0


  function handleDateChange(newDate: string) {
    patch({ date: newDate })
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

  function handleSetYearly() {
    setRecurrence('yearly')
  }

  function toggleWeekday(day: number) {
    weekdaysTouchedRef.current = true
    setRecurrenceWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  // ── Cálculos para series semanales ──────────────────────────────────────────
  const seriesCount = recurrence === 'weekly'
    ? buildWeeklyDates(draft.date, recurrenceEnd, recurrenceWeekdays).length
    : 0

  const seriesError: string | null = recurrence === 'weekly' ? (() => {
    if (recurrenceWeekdays.length === 0) return 'Selecciona al menos un día'
    if (!recurrenceEnd) return 'Indica la fecha de fin'
    if (recurrenceEnd < draft.date) return 'La fecha de fin debe ser posterior a la fecha de inicio'
    if (recurrenceEnd > maxEndDateStr(draft.date)) return 'El período máximo es 52 semanas'
    if (seriesCount === 0) return 'No se crearán eventos con esta configuración'
    return null
  })() : null

  // ── Cálculos para series anuales ─────────────────────────────────────────────
  const startYear = parseInt(draft.date.slice(0, 4), 10)
  const yearlyCount = recurrence === 'yearly' ? recurrenceEndYear - startYear + 1 : 0
  const yearlyError: string | null = recurrence === 'yearly'
    ? (recurrenceEndYear < startYear ? 'El año final debe ser igual o posterior al año de inicio' : null)
    : null

  const handleSubmit = submitHandler(valid => {
    if (mode === 'edit') {
      if (initial) onUpdate(initial.id, valid)
      onClose()
      return
    }
    if (recurrence === 'weekly') {
      if (seriesError) return
      onCreateSeries?.(valid, recurrenceWeekdays, recurrenceEnd)
    } else if (recurrence === 'yearly') {
      if (yearlyError) return
      onCreateYearlySeries?.(valid, recurrenceEndYear)
    } else {
      onCreate(valid)
    }
    onClose()
  })

  const vacacionesError = esVacaciones && draft.end_date && draft.end_date < draft.date
    ? 'El último día no puede ser anterior al primero'
    : null

  const canSubmit = draft.title.trim().length > 0 && seriesError === null && yearlyError === null && vacacionesError === null

  // Preview text — semanal
  const previewReady = recurrence === 'weekly' && recurrenceWeekdays.length > 0 && recurrenceEnd && seriesCount > 0
  const previewDaysText = joinDayNames(recurrenceWeekdays)
  const previewEndText = recurrenceEnd
    ? format(parseLocalDate(recurrenceEnd), "d 'de' MMMM", { locale: es })
    : ''

  const submitLabel = mode === 'edit'
    ? 'Guardar cambios'
    : esVacaciones
      ? (diasVacaciones > 0 ? `Apuntar ${diasVacaciones} día${diasVacaciones !== 1 ? 's' : ''}` : 'Apuntar vacaciones')
      : recurrence === 'weekly' && seriesCount > 0
      ? `Crear ${seriesCount} eventos`
      : recurrence === 'yearly' && yearlyCount > 0
        ? `Crear ${yearlyCount} evento${yearlyCount !== 1 ? 's' : ''}`
        : 'Crear evento'

  const assignees = buildAssignees(members, kids)
  const asignadoActual = assigneeKeyOf(draft)

  const isSeries = mode === 'edit' && !!initial?.recurrence_group_id && !!onDeleteSeries
  const headerActions = mode !== 'edit' ? undefined : isSeries ? (
    <button
      type="button"
      onClick={() => setSeriesDeleteOpen(v => !v)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${seriesDeleteOpen ? 'bg-danger text-white' : 'text-danger hover:bg-danger-soft'}`}
    >
      Eliminar
    </button>
  ) : (
    <DeleteButton variant="header" confirming={confirmDelete} onClick={handleDelete} idleLabel="Eliminar" confirmLabel="Confirmar" />
  )

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? 'Nuevo evento' : 'Editar evento'}
      onClose={onClose}
      headerActions={headerActions}
      footer={
        <SheetFooter
          form="event-form"
          submitLabel={submitLabel}
          disabled={!canSubmit}
          error={formError ?? vacacionesError}
        />
      }
    >
      <form id="event-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-4 space-y-5">

            {seriesDeleteOpen && initial?.recurrence_group_id && onDeleteSeries && (
              <div className="rounded-2xl border border-danger-line bg-danger-tint p-3.5 space-y-2">
                <p className="text-sm font-bold text-ink">Este evento se repite</p>
                <p className="text-xs text-muted">¿Qué quieres eliminar?</p>
                <button
                  type="button"
                  onClick={() => { onDelete(initial.id); onClose() }}
                  className="w-full rounded-xl border border-danger-line py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
                >
                  Eliminar solo este
                </button>
                <button
                  type="button"
                  onClick={() => { onDeleteSeries(initial.recurrence_group_id!); onClose() }}
                  className="w-full rounded-xl bg-danger py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  Eliminar toda la serie
                </button>
                <button
                  type="button"
                  onClick={() => setSeriesDeleteOpen(false)}
                  className="w-full rounded-xl py-2 text-sm font-semibold text-muted"
                >
                  Cancelar
                </button>
              </div>
            )}

            {mode === 'create' && (
              <Field label="Qué es" spacing="group">
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface p-1">
                  {([
                    { valor: 'evento' as const, etiqueta: 'Un plan' },
                    { valor: 'vacaciones' as const, etiqueta: 'Vacaciones' },
                  ]).map(({ valor, etiqueta }) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => patch({
                        kind: valor,
                        // Las vacaciones son días completos por definición.
                        all_day: valor === 'vacaciones' ? true : draft.all_day,
                        end_date: valor === 'vacaciones' && !draft.end_date ? draft.date : draft.end_date,
                      })}
                      className={`rounded-xl py-2 text-xs font-bold transition-colors ${
                        draft.kind === valor ? 'bg-white text-ink shadow-sm' : 'text-muted'
                      }`}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <Field label="Título" htmlFor="event-title">
              <input id="event-title" ref={firstFieldRef} type="text" value={draft.title} onChange={e => patch({ title: e.target.value })} placeholder="¿Qué ocurre?" className="field-input" />
            </Field>

            <Field label="Descripción" htmlFor="event-description">
              <textarea id="event-description" value={draft.description} onChange={e => patch({ description: e.target.value })} placeholder="Lugar, notas…" rows={2} className="field-input resize-none" />
            </Field>

            {/* Fechas. En vacaciones son dos días; en un plan, uno con horas. */}
            {esVacaciones ? (
              <div className="flex gap-3">
                <div className="flex-1">
                  <Field label="Desde" htmlFor="event-date">
                    <input id="event-date" type="date" value={draft.date} onChange={e => handleDateChange(e.target.value)} className="field-input" />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Hasta" htmlFor="event-end-date">
                    <input id="event-end-date" type="date" value={draft.end_date} min={draft.date} onChange={e => patch({ end_date: e.target.value })} className="field-input" />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Field label="Fecha" htmlFor="event-date">
                    <input id="event-date" type="date" value={draft.date} onChange={e => handleDateChange(e.target.value)} className="field-input" />
                  </Field>
                </div>
                <div className="flex flex-col items-center gap-1.5 pb-0.5">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap">Todo el día</span>
                  <button type="button" role="switch" aria-checked={draft.all_day} onClick={() => patch({ all_day: !draft.all_day })} className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${draft.all_day ? 'bg-primary' : 'bg-line-strong'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${draft.all_day ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Hora inicio / fin */}
            {!draft.all_day && !esVacaciones && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <Field label="Inicio" htmlFor="event-start">
                    <input id="event-start" type="time" value={draft.start_time} onChange={e => patch({ start_time: e.target.value })} className="field-input" />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Fin" htmlFor="event-end">
                    <input id="event-end" type="time" value={draft.end_time} onChange={e => patch({ end_time: e.target.value })} className="field-input" />
                  </Field>
                </div>
              </div>
            )}

            <Field label="Asignar a" spacing="group">
              <div className="flex gap-3">
                {assignees.map(a => (
                  <DotOption
                    key={a.key}
                    selected={asignadoActual === a.key}
                    onClick={() => patch({ child_id: a.child_id, member_id: a.member_id })}
                    color={a.color}
                    label={a.name}
                  />
                ))}
              </div>
            </Field>

            {/* Repetición — solo en crear */}
            {mode === 'create' && !esVacaciones && (
              <div className="space-y-3">
                <label className="field-label">Repetición</label>

                <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1">
                  <button
                    type="button"
                    onClick={handleSetNone}
                    className={`rounded-xl px-2 py-2 text-xs font-bold transition-colors ${recurrence === 'none' ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}
                  >
                    No se repite
                  </button>
                  <button
                    type="button"
                    onClick={handleSetWeekly}
                    className={`rounded-xl px-2 py-2 text-xs font-bold transition-colors ${recurrence === 'weekly' ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}
                  >
                    Cada semana
                  </button>
                  <button
                    type="button"
                    onClick={handleSetYearly}
                    className={`rounded-xl px-2 py-2 text-xs font-bold transition-colors ${recurrence === 'yearly' ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}
                  >
                    Cada año
                  </button>
                </div>

                {recurrence === 'weekly' && (
                  <div className="space-y-4">
                    <Field label="Repetir los días" spacing="group">
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
                                  ? 'bg-primary text-white'
                                  : 'bg-canvas border border-line text-muted hover:border-primary'
                              }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </Field>

                    <Field label="Termina el" htmlFor="event-rec-end">
                      <input
                        id="event-rec-end"
                        type="date"
                        value={recurrenceEnd}
                        min={draft.date}
                        max={maxEndDateStr(draft.date)}
                        onChange={e => setRecurrenceEnd(e.target.value)}
                        className="field-input"
                      />
                    </Field>

                    {/* Vista previa */}
                    {previewReady && (
                      <div className="rounded-2xl bg-primary-tint border border-primary/25 p-3.5 space-y-1">
                        <p className="text-sm text-ink leading-snug">
                          <span className="font-semibold">{draft.title.trim() || 'El evento'}</span>
                          {' '}se añadirá los {previewDaysText} hasta el {previewEndText}.
                        </p>
                        <p className="text-sm font-bold text-primary">Se crearán {seriesCount} eventos.</p>
                        <p className="text-xs text-muted">Podrás editar cada evento por separado.</p>
                      </div>
                    )}

                    {/* Error de validación */}
                    {seriesError && (
                      <p className="text-xs font-bold text-danger">{seriesError}</p>
                    )}
                  </div>
                )}

                {recurrence === 'yearly' && (
                  <div className="space-y-4">
                    <Field label="Repetir hasta el año" htmlFor="event-rec-year">
                      <select
                        id="event-rec-year"
                        value={recurrenceEndYear}
                        onChange={e => setRecurrenceEndYear(Number(e.target.value))}
                        className="field-input"
                      >
                        {Array.from({ length: 31 }, (_, i) => startYear + i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </Field>

                    {yearlyCount > 0 && !yearlyError && (
                      <div className="rounded-2xl bg-primary-tint border border-primary/25 p-3.5 space-y-1">
                        <p className="text-sm text-ink leading-snug">
                          <span className="font-semibold">{draft.title.trim() || 'El evento'}</span>
                          {' '}se añadirá cada año el mismo día hasta {recurrenceEndYear}.
                        </p>
                        <p className="text-sm font-bold text-primary">Se crearán {yearlyCount} evento{yearlyCount !== 1 ? 's' : ''}.</p>
                        <p className="text-xs text-muted">Podrás editar cada evento por separado.</p>
                      </div>
                    )}

                    {yearlyError && (
                      <p className="text-xs font-bold text-danger">{yearlyError}</p>
                    )}
                  </div>
                )}
              </div>
            )}

      </form>
    </BottomSheet>
  )
}
