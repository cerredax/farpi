'use client'

import { useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  format,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { useStore } from '@/lib/store-context'
import { getLocalDateString } from '@/lib/date-utils'
import { selectEventMatches, selectPendingTasks, selectVisibleAbsences } from '@/lib/selectors'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { CalendarHeader, type ModoCalendario } from './CalendarHeader'
import { WeekStrip } from './WeekStrip'
import { MonthGrid } from './MonthGrid'
import { Availability } from './Availability'
import { AgendaList } from './AgendaList'
import { EventSheet } from './EventSheet'
import { Card } from '@/components/ui/Card'
import type { Event, EventDraft } from '@/types'

/**
 * El calendario: agenda primero, mes como mapa.
 *
 * En móvil la pantalla abre en `agenda` —la tira de siete días y, debajo, lo
 * que pasa el día elegido— y el mes es la otra pestaña del selector. En
 * escritorio no hay pestañas: el mes vive a la izquierda como mapa y la agenda
 * a la derecha, las dos a la vez.
 *
 * De dónde viene: hasta el 24-08-2026 el móvil abría en un eje de horas
 * (`DayTimeline`) y el mes se desplegaba con una manija. La vista por horas se
 * retiró con el rediseño; la razón por la que existía —"a 390 px, siete columnas
 * son bloques de color sin texto"— sigue en pie y por eso la tira de siete días
 * es **navegación** y no una semana en columnas: no lleva títulos dentro.
 */
export function CalendarView() {
  const { kids, members, allEvents, tasks, toggleTask, createEvent, createEventSeries, createYearlySeries, updateEvent, deleteEvent, deleteEventSeries } = useStore()

  const today = new Date()
  const [modo, setModo] = useState<ModoCalendario>('agenda')
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today))
  const [selectedDay, setSelectedDay]   = useState(today)
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [busqueda, setBusqueda] = useState('')

  // El primero de los siete días de la tira. Manda a la vez sobre la tira y
  // sobre la agenda, que es lo que antes no pasaba: la tira pintaba la semana
  // natural del día elegido y la lista siempre los siete desde hoy, así que
  // enseñaban tramos distintos y las flechas movían solo la de arriba.
  // Arranca hoy, no en el lunes: lo atrasado se arrastra al día de hoy y el
  // tramo tiene que empezar donde eso tiene sentido.
  const [inicioSemana, setInicioSemana] = useState(startOfDay(today))

  // En escritorio se ven el mes y la agenda a la vez, así que el selector no
  // pinta nada y el mes está siempre presente. Es un cambio de qué se
  // renderiza, no de cómo se ve, y por eso no lo puede resolver Tailwind.
  const esEscritorio = useMediaQuery('(min-width: 1024px)')
  const mesVisible = esEscritorio || modo === 'mes'

  function openCreate(day = selectedDay) {
    setSelectedDay(day)
    setEditingEvent(null)
    setSheetOpen(true)
  }

  function openEdit(event: Event) { setEditingEvent(event); setSheetOpen(true) }

  /**
   * Elegir un día no cambia de vista a tus espaldas: en el mes se queda en el
   * mes, con el detalle debajo. Lo que sí hace es arrastrar el tramo de la
   * tira, para que al volver a la agenda esté donde lo dejaste.
   */
  function selectDay(day: Date) {
    setSelectedDay(day)
    setInicioSemana(startOfDay(day))
    if (!isSameMonth(day, currentMonth)) setCurrentMonth(startOfMonth(day))
  }

  /**
   * Las flechas recorren mes o semana según lo que se esté viendo. En agenda
   * mueven el tramo entero —tira y detalle a la vez— y llevan con él el día
   * elegido, para que la selección no se quede en una semana que ya no se ve.
   */
  function moverSemana(pasos: number) {
    const nuevoInicio = addWeeks(inicioSemana, pasos)
    setInicioSemana(nuevoInicio)
    setSelectedDay(nuevoInicio)
    setCurrentMonth(startOfMonth(nuevoInicio))
  }

  function irAnterior() {
    if (mesVisible) return setCurrentMonth(m => subMonths(m, 1))
    moverSemana(-1)
  }

  function irSiguiente() {
    if (mesVisible) return setCurrentMonth(m => addMonths(m, 1))
    moverSemana(1)
  }

  /**
   * Lleva la vista entera a un día: lo elige, coloca el mes y arrastra con él
   * el tramo de la tira. Ese último paso importa desde que la tira y la agenda
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

  // El bloque de disponibilidad habla del tramo que se está viendo, no de todo
  // el año: en la agenda, los siete días de la tira; con el mes, el mes.
  // El mes es el mes y no sus seis filas: desde que la rejilla no presta días de
  // julio ni de septiembre, contar sus semanas hacía que el bloque hablara de un
  // descanso del 3 de septiembre mirando agosto, sin ningún día pintado que lo
  // respaldara.
  const tramoVisible = mesVisible
    ? {
        desde: getLocalDateString(startOfMonth(currentMonth)),
        hasta: getLocalDateString(endOfMonth(currentMonth)),
      }
    : {
        desde: getLocalDateString(inicioSemana),
        hasta: getLocalDateString(addDays(inicioSemana, 6)),
      }

  const ausenciasVisibles = selectVisibleAbsences(allEvents, tramoVisible.desde, tramoVisible.hasta)

  // La agenda solo necesita el tramo que va a listar; la tira y el mes reciben
  // todos los eventos y se quedan con los de cada día, que ya saben hacerlo.
  const agendaEvents = allEvents.filter(event =>
    isWithinInterval(parseISO(event.start_at), {
      start: startOfDay(selectedDay),
      end: addDays(startOfDay(selectedDay), 45),
    })
  )

  // Lo que hay que hacer un día es parte de lo que pasa ese día, se mire la
  // tira o el mes. Lo ya hecho no vuelve aquí, que para eso está Tareas.
  const tareasPendientes = selectPendingTasks(tasks)

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
      <div className="pb-6 lg:mx-auto lg:max-w-5xl lg:px-6 lg:py-4">
        <CalendarHeader
          currentMonth={currentMonth}
          modo={modo}
          onModo={setModo}
          unidad={mesVisible ? 'mes' : 'semana'}
          onPrev={irAnterior}
          onNext={irSiguiente}
          onAdd={() => openCreate(selectedDay)}
        />

        {/* Escritorio: el mes a la izquierda como mapa y la agenda a la derecha.
            Móvil: una columna, y el selector decide si arriba va la tira o el
            mes. La rejilla es solo de `lg` en adelante, así que por debajo el
            DOM es el de siempre. */}
        <div className="mt-3 lg:mt-4 lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:items-start">
          <div>
            <div className="mx-4 lg:mx-0">
              <Card padded={false}>
                {/* La tira solo en móvil y solo en agenda: en escritorio manda
                    el mes, que cabe entero y dice más. */}
                {modo === 'agenda' && (
                  <div className="lg:hidden">
                    <WeekStrip
                      inicioSemana={inicioSemana}
                      selectedDay={selectedDay}
                      events={allEvents}
                      tasks={tareasPendientes}
                      kids={kids}
                      members={members}
                      onSelectDay={selectDay}
                    />
                  </div>
                )}

                <div className={modo === 'mes' ? '' : 'hidden lg:block'}>
                  <MonthGrid
                    currentMonth={currentMonth}
                    selectedDay={selectedDay}
                    events={allEvents}
                    tasks={tareasPendientes}
                    kids={kids}
                    members={members}
                    onSelectDay={selectDay}
                  />
                </div>

                <Availability
                  ausencias={ausenciasVisibles}
                  kids={kids}
                  members={members}
                  onEdit={openEdit}
                />
              </Card>
            </div>
          </div>

          <div>
            <AgendaList
              selectedDay={selectedDay}
              events={agendaEvents}
              kids={kids}
              members={members}
              tasks={tareasPendientes}
              onToggleTask={toggleTask}
              buscador={buscador}
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
