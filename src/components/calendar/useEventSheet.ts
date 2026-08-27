'use client'

import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { extractDate, extractTime, parseLocalDate } from '@/lib/date-utils'
import { buildWeeklyDates, joinWeekdayNames, maxWeeklyEndDate, weekdayOf } from '@/lib/recurrence'
import { daysBetween, eventTitleOr, isRangeKind } from '@/lib/events'
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

/**
 * El borrador con el que abre el sheet: vacío al crear, y relleno con el evento
 * al editar.
 *
 * Se exporta para poder probarla: aquí vivía un fallo que la suite no podía ver
 * porque **el mock y Supabase guardan la fecha de distinta forma**. El mock
 * escribe la hora de pared tal cual (`2026-08-17T00:00:00`) y Supabase, que usa
 * `timestamptz`, devuelve el instante en UTC (`2026-08-16T22:00:00+00:00`). Con
 * lo primero, cortar la cadena por el día funciona; con lo segundo, en España en
 * verano devuelve el día anterior. De ahí que las fechas se lean siempre con
 * `extractDate` y nunca cortando, que es lo que avisa `date-utils.ts`.
 */
export function initDraft(mode: EventSheetMode, initial: Event | null | undefined, defaultDate: Date | undefined): EventDraft {
  if (mode === 'edit' && initial) {
    return {
      title: initial.title,
      description: initial.description ?? '',
      date: extractDate(initial.start_at),
      all_day: initial.all_day,
      start_time: initial.all_day ? '' : extractTime(initial.start_at),
      end_time: initial.end_at && !initial.all_day ? extractTime(initial.end_at) : '',
      child_id: initial.child_id,
      member_id: initial.member_id,
      kind: initial.kind,
      end_date: isRangeKind(initial.kind) && initial.end_at ? extractDate(initial.end_at) : '',
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
  const esFestivo = draft.kind === 'festivo'
  // Los tres ocupan días completos y piden día final; un plan no.
  const esDeRango = isRangeKind(draft.kind)
  const diasVacaciones = esDeRango ? daysBetween(draft.date, draft.end_date) : 0

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

  const vacacionesError = esDeRango && draft.end_date && draft.end_date < draft.date
    ? 'El último día no puede ser anterior al primero'
    : null

  const handleSubmit = submitHandler(valid => {
    // Lo que se guarda lleva título siempre, lo haya escrito alguien o no.
    const conTitulo = { ...valid, title: eventTitleOr(valid.kind, valid.title) }
    if (mode === 'edit') {
      if (initial) onUpdate(initial.id, conTitulo)
      onClose()
      return
    }
    if (recurrence === 'weekly') {
      if (seriesError) return
      onCreateSeries?.(conTitulo, recurrenceWeekdays, recurrenceEnd)
    } else if (recurrence === 'yearly') {
      if (yearlyError) return
      onCreateYearlySeries?.(conTitulo, recurrenceEndYear)
    } else {
      onCreate(conTitulo)
    }
    onClose()
  })

  // El título solo frena el botón en un plan; en los de rango es opcional y se
  // rellena solo con el nombre del tipo.
  const tituloOpcional = esDeRango
  const canSubmit = (tituloOpcional || draft.title.trim().length > 0)
    && seriesError === null && yearlyError === null && vacacionesError === null

  // El botón dice cuántas cosas va a crear: pulsar "Apuntar" y que aparezcan
  // cuarenta es una sorpresa que nadie quiere. Y lo dice en días, que es la
  // unidad que ya usaban las vacaciones: una serie no son "12 eventos", son los
  // 12 días en los que eso pasa.
  const submitLabel = mode === 'edit'
    ? 'Guardar cambios'
    : esDeRango
      ? (diasVacaciones > 0
          ? `Apuntar ${diasVacaciones} día${diasVacaciones !== 1 ? 's' : ''}`
          : esVacaciones ? 'Apuntar vacaciones' : esDescanso ? 'Apuntar descanso' : 'Apuntar festivo')
      : recurrence === 'weekly' && seriesCount > 0
        ? `Apuntar ${seriesCount} días`
        : recurrence === 'yearly' && yearlyCount > 0
          ? `Apuntar ${yearlyCount} día${yearlyCount !== 1 ? 's' : ''}`
          : 'Apuntar'

  const previewReady = recurrence === 'weekly' && recurrenceWeekdays.length > 0 && !!recurrenceEnd && seriesCount > 0

  return {
    draft, patch, formError, firstFieldRef, handleSubmit,
    confirmDelete, handleDelete,
    seriesDeleteOpen, setSeriesDeleteOpen,
    esVacaciones, esDescanso, esFestivo, esDeRango, tituloOpcional,
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
