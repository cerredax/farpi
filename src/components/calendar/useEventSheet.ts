'use client'

import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { extractDate, extractTime, parseLocalDate } from '@/lib/date-utils'
import { buildWeeklyDates, joinWeekdayNames, maxWeeklyEndDate, weekdayOf } from '@/lib/recurrence'
import { daysBetween } from '@/lib/events'
import { validateEventDraft } from '@/lib/validators'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import type { Event, EventDraft } from '@/types'

export type EventSheetMode = 'create' | 'edit'
export type EventRecurrence = 'none' | 'weekly' | 'yearly'

interface Params {
  open: boolean
  mode: EventSheetMode
  initial?: Event | null
  defaultDate?: Date
  onClose: () => void
  onCreate: (draft: EventDraft) => void
  onCreateSeries?: (draft: EventDraft, weekdays: number[], endDate: string) => void
  onCreateYearlySeries?: (draft: EventDraft, endYear: number) => void
  onUpdate: (id: string, draft: EventDraft) => void
  onDelete: (id: string) => void
}

function initDraft(mode: EventSheetMode, initial: Event | null | undefined, defaultDate: Date | undefined): EventDraft {
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
      end_date: (initial.kind === 'vacaciones' || initial.kind === 'descanso') && initial.end_at ? extractDate(initial.end_at) : '',
    }
  }
  return {
    title: '', description: '',
    date: format(defaultDate ?? new Date(), 'yyyy-MM-dd'),
    all_day: false, start_time: '', end_time: '', child_id: null, member_id: null,
    kind: 'evento', end_date: '',
  }
}

/**
 * Todo el estado del sheet de eventos: el borrador, la recurrencia y las
 * cuentas que salen de ella (cuántos eventos, qué falla, qué pone el botón).
 *
 * Vive aparte porque el sheet hace tres cosas en una: un plan suelto, unas
 * vacaciones de varios días y dos tipos de serie. Con todo junto, el archivo
 * pasaba de 480 líneas y no se sabía qué estado servía a qué formulario.
 */
export function useEventSheet({
  open, mode, initial, defaultDate,
  onClose, onCreate, onCreateSeries, onCreateYearlySeries, onUpdate, onDelete,
}: Params) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<EventDraft>({
    open,
    initialDraft: () => initDraft(mode, initial, defaultDate),
    validate: validateEventDraft,
    autoFocus: mode === 'create',
  })
  const { confirming: confirmDelete, handleDelete } = useSheetDelete({ initial, onDelete, onClose })

  const [seriesDeleteOpen, setSeriesDeleteOpen] = useState(false)
  const [recurrence, setRecurrence] = useState<EventRecurrence>('none')
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>([])
  const [recurrenceEnd, setRecurrenceEnd] = useState('')
  const [recurrenceEndYear, setRecurrenceEndYear] = useState<number>(() => new Date().getFullYear() + 5)
  // Si nadie ha tocado los días a mano, cambiar la fecha los mueve con ella.
  const weekdaysTouchedRef = useRef(false)

  const esVacaciones = draft.kind === 'vacaciones'
  const esDescanso = draft.kind === 'descanso'
  const diasVacaciones = (esVacaciones || esDescanso) ? daysBetween(draft.date, draft.end_date) : 0

  function handleDateChange(newDate: string) {
    patch({ date: newDate })
    if (recurrence === 'weekly' && !weekdaysTouchedRef.current) {
      setRecurrenceWeekdays([weekdayOf(newDate)])
    }
  }

  function setNone()   { setRecurrence('none') }
  function setYearly() { setRecurrence('yearly') }
  function setWeekly() {
    weekdaysTouchedRef.current = false
    setRecurrenceWeekdays([weekdayOf(draft.date)])
    setRecurrence('weekly')
  }

  function toggleWeekday(day: number) {
    weekdaysTouchedRef.current = true
    setRecurrenceWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  // ── Serie semanal ───────────────────────────────────────────────────────────
  const seriesCount = recurrence === 'weekly'
    ? buildWeeklyDates(draft.date, recurrenceEnd, recurrenceWeekdays).length
    : 0

  const seriesError: string | null = recurrence === 'weekly' ? (() => {
    if (recurrenceWeekdays.length === 0) return 'Selecciona al menos un día'
    if (!recurrenceEnd) return 'Indica la fecha de fin'
    if (recurrenceEnd < draft.date) return 'La fecha de fin debe ser posterior a la fecha de inicio'
    if (recurrenceEnd > maxWeeklyEndDate(draft.date)) return 'El período máximo es 52 semanas'
    if (seriesCount === 0) return 'No se crearán eventos con esta configuración'
    return null
  })() : null

  // ── Serie anual ─────────────────────────────────────────────────────────────
  const startYear = parseInt(draft.date.slice(0, 4), 10)
  const yearlyCount = recurrence === 'yearly' ? recurrenceEndYear - startYear + 1 : 0
  const yearlyError: string | null = recurrence === 'yearly'
    ? (recurrenceEndYear < startYear ? 'El año final debe ser igual o posterior al año de inicio' : null)
    : null

  const vacacionesError = (esVacaciones || esDescanso) && draft.end_date && draft.end_date < draft.date
    ? 'El último día no puede ser anterior al primero'
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

  const canSubmit = draft.title.trim().length > 0
    && seriesError === null && yearlyError === null && vacacionesError === null

  // El botón dice cuántas cosas va a crear: pulsar "Crear evento" y que
  // aparezcan cuarenta es una sorpresa que nadie quiere.
  const submitLabel = mode === 'edit'
    ? 'Guardar cambios'
    : esVacaciones || esDescanso
      ? (diasVacaciones > 0 ? `Apuntar ${diasVacaciones} día${diasVacaciones !== 1 ? 's' : ''}` : esVacaciones ? 'Apuntar vacaciones' : 'Apuntar descanso')
      : recurrence === 'weekly' && seriesCount > 0
        ? `Crear ${seriesCount} eventos`
        : recurrence === 'yearly' && yearlyCount > 0
          ? `Crear ${yearlyCount} evento${yearlyCount !== 1 ? 's' : ''}`
          : 'Crear evento'

  const previewReady = recurrence === 'weekly' && recurrenceWeekdays.length > 0 && !!recurrenceEnd && seriesCount > 0

  return {
    draft, patch, formError, firstFieldRef, handleSubmit,
    confirmDelete, handleDelete,
    seriesDeleteOpen, setSeriesDeleteOpen,
    esVacaciones, esDescanso,
    recurrence, setNone, setWeekly, setYearly,
    recurrenceWeekdays, toggleWeekday,
    recurrenceEnd, setRecurrenceEnd,
    recurrenceEndYear, setRecurrenceEndYear,
    handleDateChange,
    seriesCount, seriesError, startYear, yearlyCount, yearlyError, vacacionesError,
    canSubmit, submitLabel,
    previewReady,
    previewDaysText: joinWeekdayNames(recurrenceWeekdays),
    previewEndText: recurrenceEnd ? format(parseLocalDate(recurrenceEnd), "d 'de' MMMM", { locale: es }) : '',
    maxEnd: maxWeeklyEndDate(draft.date),
  }
}
