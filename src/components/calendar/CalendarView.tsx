'use client'

import { useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import { ChevronDown } from 'lucide-react'
import { useStore } from '@/lib/store-context'
import { getLocalDateString } from '@/lib/date-utils'
import { selectVisibleVacations } from '@/lib/selectors'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { CalendarHeader } from './CalendarHeader'
import { MonthGrid } from './MonthGrid'
import { VacationLegend } from './VacationLegend'
import { AgendaList } from './AgendaList'
import { EventSheet } from './EventSheet'
import { Card } from '@/components/ui/Card'
import type { Event, EventDraft } from '@/types'

export function CalendarView() {
  const { kids, members, allEvents, createEvent, createEventSeries, createYearlySeries, updateEvent, deleteEvent, deleteEventSeries } = useStore()

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today))
  const [selectedDay, setSelectedDay]   = useState(today)
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  // Una sola idea de "cuánto calendario veo": plegado, la semana en curso y los
  // próximos siete días; desplegado, el mes y la lista desde el día elegido.
  // Antes había dos —la rejilla, siempre el mes entero, y un selector
  // Semana/Agenda que solo mandaba sobre la lista—, y el control más visible
  // era justo el que no se podía tocar.
  const [mesDesplegado, setMesDesplegado] = useState(false)

  // En pantalla grande el mes cabe de sobra y plegarlo no gana nada, así que
  // la manija es cosa del móvil. Es un cambio de qué se renderiza, no de cómo
  // se ve, y por eso no lo puede resolver Tailwind.
  const esEscritorio = useMediaQuery('(min-width: 1024px)')
  const verMes = esEscritorio || mesDesplegado

  const weekRange = {
    start: startOfDay(today),
    end: addDays(startOfDay(today), 7),
  }

  function openCreate(day = selectedDay) {
    setSelectedDay(day)
    setEditingEvent(null)
    setSheetOpen(true)
  }

  function openEdit(event: Event) { setEditingEvent(event); setSheetOpen(true) }

  // Elegir un día ya no cambia de vista a tus espaldas: antes, tocar un día
  // fuera de los próximos siete saltaba solo de Semana a Agenda.
  function selectDay(day: Date) {
    setSelectedDay(day)
    if (!isSameMonth(day, currentMonth)) setCurrentMonth(startOfMonth(day))
  }

  /**
   * Las flechas recorren mes o semana según lo que se esté viendo. Plegado
   * mueven también el día elegido: es lo que decide qué semana se pinta, y
   * saltar de semana sin moverlo dejaría la rejilla quieta.
   */
  function irAnterior() {
    if (verMes) return setCurrentMonth(m => subMonths(m, 1))
    setSelectedDay(d => {
      const anterior = subWeeks(d, 1)
      setCurrentMonth(startOfMonth(anterior))
      return anterior
    })
  }

  function irSiguiente() {
    if (verMes) return setCurrentMonth(m => addMonths(m, 1))
    setSelectedDay(d => {
      const siguiente = addWeeks(d, 1)
      setCurrentMonth(startOfMonth(siguiente))
      return siguiente
    })
  }

  async function handleCreate(draft: EventDraft) {
    const event = await createEvent(draft)
    if (!event) return  // falló: el store ya muestra el motivo
    const eventDate = parseISO(event.start_at)
    setSelectedDay(eventDate)
    setCurrentMonth(startOfMonth(eventDate))
  }

  async function handleCreateSeries(draft: EventDraft, weekdays: number[], endDate: string) {
    const created = await createEventSeries(draft, weekdays, endDate)
    if (created.length > 0) {
      const firstDate = parseISO(created[0].start_at)
      setSelectedDay(firstDate)
      setCurrentMonth(startOfMonth(firstDate))
    }
  }

  async function handleCreateYearlySeries(draft: EventDraft, endYear: number) {
    const created = await createYearlySeries(draft, endYear)
    if (created.length > 0) {
      const firstDate = parseISO(created[0].start_at)
      setSelectedDay(firstDate)
      setCurrentMonth(startOfMonth(firstDate))
    }
  }

  // La leyenda habla del tramo que se está viendo, no de todo el año: en la
  // semana, esa semana; con el mes abierto, las seis filas que se pintan.
  const tramoVisible = verMes
    ? {
        desde: getLocalDateString(startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })),
        hasta: getLocalDateString(endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })),
      }
    : {
        desde: getLocalDateString(startOfWeek(selectedDay, { weekStartsOn: 1 })),
        hasta: getLocalDateString(endOfWeek(selectedDay, { weekStartsOn: 1 })),
      }

  const vacacionesVisibles = selectVisibleVacations(allEvents, tramoVisible.desde, tramoVisible.hasta)

  const agendaMode = verMes ? 'agenda' : 'week'

  const agendaEvents = allEvents.filter(event => {
    const eventDate = parseISO(event.start_at)
    if (agendaMode === 'agenda') {
      return isWithinInterval(eventDate, {
        start: startOfDay(selectedDay),
        end: addDays(startOfDay(selectedDay), 45),
      })
    }
    return isWithinInterval(eventDate, weekRange)
  })

  const sheetKey = editingEvent
    ? `edit-${editingEvent.id}`
    : `create-${format(selectedDay, 'yyyyMMdd')}`

  return (
    <>
      <div className="pb-6 lg:max-w-5xl lg:mx-auto lg:px-6 lg:py-4">
        {/* Desktop: two-column grid. Mobile: single column stack. */}
        <div className="lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:items-start">

          {/* Left column: month grid + view toggle */}
          <div>
            <div className="mx-4 mt-3 lg:mx-0 lg:mt-0">
              <Card padded={false}>
                <CalendarHeader
                  currentMonth={currentMonth}
                  unidad={verMes ? 'mes' : 'semana'}
                  onPrev={irAnterior}
                  onNext={irSiguiente}
                />
                <div className={verMes ? 'pb-3' : 'pb-1'}>
                  <MonthGrid
                    currentMonth={currentMonth}
                    selectedDay={selectedDay}
                    events={allEvents}
                    kids={kids}
                    members={members}
                    density="compact"
                    weekOf={verMes ? null : selectedDay}
                    onSelectDay={selectDay}
                    onEditEvent={openEdit}
                    onAddEvent={openCreate}
                  />
                </div>

                <VacationLegend
                  vacaciones={vacacionesVisibles}
                  kids={kids}
                  members={members}
                  onEdit={openEdit}
                />

                {/* La manija solo en móvil: en escritorio el mes se ve entero
                    siempre y no habría nada que desplegar. */}
                <button
                  type="button"
                  onClick={() => setMesDesplegado(v => !v)}
                  aria-expanded={mesDesplegado}
                  className="lg:hidden flex w-full items-center justify-center gap-1.5 border-t border-hairline py-2.5 text-[11px] font-bold text-muted transition-colors hover:bg-surface hover:text-ink"
                >
                  {mesDesplegado ? 'Ver solo la semana' : 'Ver el mes'}
                  <ChevronDown
                    size={14}
                    strokeWidth={2.6}
                    className={`transition-transform ${mesDesplegado ? 'rotate-180' : ''}`}
                  />
                </button>
              </Card>
            </div>
          </div>

          {/* Right column: agenda list */}
          <div className="pt-2 lg:pt-0">
            <AgendaList
              mode={agendaMode}
              selectedDay={selectedDay}
              currentMonth={currentMonth}
              events={agendaEvents}
              kids={kids}
              members={members}
              onSelectDay={selectDay}
              onEdit={openEdit}
              onAdd={openCreate}
            />
          </div>

        </div>
      </div>

      <EventSheet
        key={sheetKey}
        open={sheetOpen}
        mode={editingEvent ? 'edit' : 'create'}
        initial={editingEvent}
        defaultDate={selectedDay}
        kids={kids}
        members={members}
        onClose={() => setSheetOpen(false)}
        onCreate={handleCreate}
        onCreateSeries={handleCreateSeries}
        onCreateYearlySeries={handleCreateYearlySeries}
        onUpdate={updateEvent}
        onDelete={deleteEvent}
        onDeleteSeries={deleteEventSeries}
      />
    </>
  )
}
