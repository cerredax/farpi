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
} from 'date-fns'
import { ChevronDown } from 'lucide-react'
import { useStore } from '@/lib/store-context'
import { getLocalDateString } from '@/lib/date-utils'
import { selectEventMatches, selectPendingTasks, selectVisibleVacations } from '@/lib/selectors'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { CalendarHeader } from './CalendarHeader'
import { MonthGrid } from './MonthGrid'
import { VacationLegend } from './VacationLegend'
import { AgendaList } from './AgendaList'
import { DayTimeline } from './DayTimeline'
import { EventSheet } from './EventSheet'
import { Card } from '@/components/ui/Card'
import type { Event, EventDraft } from '@/types'

export function CalendarView() {
  const { kids, members, allEvents, tasks, toggleTask, createEvent, createEventSeries, createYearlySeries, updateEvent, deleteEvent, deleteEventSeries } = useStore()

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
  const [busqueda, setBusqueda] = useState('')

  // El primero de los siete días que se ven plegado. Manda a la vez sobre la
  // tira y sobre la lista, que es lo que antes no pasaba: la tira pintaba la
  // semana natural del día elegido y la lista siempre los siete desde hoy, así
  // que enseñaban tramos distintos y las flechas movían solo la de arriba.
  // Arranca hoy, no en el lunes: lo atrasado se arrastra al día de hoy y el
  // tramo tiene que empezar donde eso tiene sentido.
  const [inicioSemana, setInicioSemana] = useState(startOfDay(today))

  // En pantalla grande el mes cabe de sobra y plegarlo no gana nada, así que
  // la manija es cosa del móvil. Es un cambio de qué se renderiza, no de cómo
  // se ve, y por eso no lo puede resolver Tailwind.
  const esEscritorio = useMediaQuery('(min-width: 1024px)')
  const verMes = esEscritorio || mesDesplegado

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
   * mueven el tramo entero —tira y lista a la vez— y llevan con él el día
   * elegido, para que la selección no se quede en una semana que ya no se ve.
   */
  function moverSemana(pasos: number) {
    const nuevoInicio = addWeeks(inicioSemana, pasos)
    setInicioSemana(nuevoInicio)
    setSelectedDay(nuevoInicio)
    setCurrentMonth(startOfMonth(nuevoInicio))
  }

  function irAnterior() {
    if (verMes) return setCurrentMonth(m => subMonths(m, 1))
    moverSemana(-1)
  }

  function irSiguiente() {
    if (verMes) return setCurrentMonth(m => addMonths(m, 1))
    moverSemana(1)
  }

  /**
   * Al volver a plegar, el tramo arranca en el día que se dejó elegido. Si
   * abres el mes, tocas el 20 y cierras, lo que quieres ver es el 20 y no la
   * semana de la que saliste.
   */
  function plegarODesplegar() {
    setMesDesplegado(abierto => {
      if (abierto) setInicioSemana(startOfDay(selectedDay))
      return !abierto
    })
  }

  /**
   * Lleva la vista entera a un día: lo elige, coloca el mes y arrastra con él
   * el tramo de la semana. Ese último paso importa desde que la tira y la lista
   * comparten tramo: sin él, apuntar unas vacaciones para el día 10 dejaba el
   * calendario en la semana de hoy y el evento recién creado no se veía.
   */
  function enfocarDia(date: Date) {
    setSelectedDay(date)
    setCurrentMonth(startOfMonth(date))
    setInicioSemana(startOfDay(date))
  }

  async function handleCreate(draft: EventDraft) {
    const event = await createEvent(draft)
    if (!event) return  // falló: el store ya muestra el motivo
    enfocarDia(parseISO(event.start_at))
  }

  async function handleCreateSeries(draft: EventDraft, weekdays: number[], endDate: string) {
    const created = await createEventSeries(draft, weekdays, endDate)
    if (created.length > 0) enfocarDia(parseISO(created[0].start_at))
  }

  async function handleCreateYearlySeries(draft: EventDraft, endYear: number) {
    const created = await createYearlySeries(draft, endYear)
    if (created.length > 0) enfocarDia(parseISO(created[0].start_at))
  }

  // La leyenda habla del tramo que se está viendo, no de todo el año: en la
  // semana, esa semana; con el mes abierto, las seis filas que se pintan.
  const tramoVisible = verMes
    ? {
        desde: getLocalDateString(startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })),
        hasta: getLocalDateString(endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })),
      }
    : {
        desde: getLocalDateString(inicioSemana),
        hasta: getLocalDateString(addDays(inicioSemana, 6)),
      }

  const vacacionesVisibles = selectVisibleVacations(allEvents, tramoVisible.desde, tramoVisible.hasta)

  // Qué se ve debajo de la rejilla. Plegado, el día elegido sobre su eje de
  // horas; con el mes abierto, la lista de lo que viene. Es la misma idea que
  // manda arriba —cuánto calendario estoy mirando—: un día enseña sus horas, un
  // mes enseña lo que hay por delante. Buscando ganan siempre los resultados:
  // una búsqueda atraviesa el calendario entero y no cabe en un día.
  const verLista = verMes || busqueda.trim().length > 0

  // Solo para la lista: la vista de horas recibe todos los eventos y se queda
  // con los de su día, que ya sabe hacerlo.
  const agendaEvents = allEvents.filter(event =>
    isWithinInterval(parseISO(event.start_at), {
      start: startOfDay(selectedDay),
      end: addDays(startOfDay(selectedDay), 45),
    })
  )

  // Lo que hay que hacer un día es parte de lo que pasa ese día, se mire la
  // semana o el mes: con el mes abierto el día 5 decía "Sin planes" y con la
  // semana el mismo día tenía seis tareas. Lo ya hecho no vuelve aquí, que para
  // eso está Tareas.
  const agendaTasks = selectPendingTasks(tasks)

  // Con cuatro eventos no hay nada que buscar. El buscador mira todo el
  // calendario, no el tramo pintado: lo que se busca suele estar fuera.
  const buscador = allEvents.length >= MINIMO_PARA_BUSCAR
    ? { valor: busqueda, onChange: setBusqueda, coincidencias: selectEventMatches(allEvents, busqueda) }
    : undefined

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
                    weekStart={verMes ? null : inicioSemana}
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
                  onClick={() => plegarODesplegar()}
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

          {/* Right column: el día por horas, o la lista de lo que viene */}
          <div className="pt-2 lg:pt-0">
            {verLista ? (
              <AgendaList
                selectedDay={selectedDay}
                events={agendaEvents}
                kids={kids}
                members={members}
                tasks={agendaTasks}
                onToggleTask={toggleTask}
                buscador={buscador}
                onSelectDay={selectDay}
                onEdit={openEdit}
                onAdd={openCreate}
              />
            ) : (
              <DayTimeline
                day={selectedDay}
                events={allEvents}
                kids={kids}
                members={members}
                tasks={agendaTasks}
                onToggleTask={toggleTask}
                buscador={buscador}
                onEdit={openEdit}
                onAdd={openCreate}
              />
            )}
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
