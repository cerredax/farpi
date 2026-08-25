'use client'

import { useState } from 'react'
import {
  addDays,
  addMonths,
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
import { CalendarHeader } from './CalendarHeader'
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
  // La rejilla del mes empieza guardada: la pantalla abre en la lista, que es la
  // respuesta a "¿qué hay?". En escritorio no manda nada, que allí el mes está
  // siempre a la vista.
  const [mesAbierto, setMesAbierto] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today))
  const [selectedDay, setSelectedDay]   = useState(today)
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [busqueda, setBusqueda] = useState('')


  // Ya no hace falta preguntar por el ancho. Desde que el mes y la agenda no
  // comparten estado —la lista arranca en hoy y el mes va por su cuenta— quién
  // se ve es cosa de Tailwind: `hidden lg:block` en la columna del mes. Aquí
  // había un `useMediaQuery` porque el tramo del que hablaba "Vacaciones y
  // descansos" dependía de ello, y eso sí era lógica.

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
    if (!isSameMonth(day, currentMonth)) setCurrentMonth(startOfMonth(day))
  }

  // Las flechas son del mes y solo se ven con el mes: la agenda arranca en hoy y
  // se desliza, así que no hay nada que recorrer con ellas.
  function irAnterior() { setCurrentMonth(m => subMonths(m, 1)) }
  function irSiguiente() { setCurrentMonth(m => addMonths(m, 1)) }

  /**
   * Lleva la vista entera a un día: lo elige, coloca el mes y arrastra con él
   * el tramo de la tira. Ese último paso importa desde que la tira y la agenda
   * comparten tramo: sin él, apuntar unas vacaciones para el día 10 dejaba el
   * calendario en la semana de hoy y el evento recién creado no se veía.
   */
  function enfocarDia(date: Date) {
    setSelectedDay(date)
    setCurrentMonth(startOfMonth(date))
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

  // "Vacaciones y descansos" vive con el mes y habla de él. Desde que la agenda
  // es una lista continua (25-08-2026) ya no tiene un tramo del que hablar: iba
  // con los siete días de la tira, y la tira no existe.
  //
  // El mes es el mes y no sus seis filas: desde que la rejilla no presta días de
  // julio ni de septiembre, contar sus semanas hacía que el bloque hablara de un
  // descanso del 3 de septiembre mirando agosto, sin ningún día pintado que lo
  // respaldara.
  const ausenciasVisibles = selectVisibleAbsences(
    allEvents,
    getLocalDateString(startOfMonth(currentMonth)),
    getLocalDateString(endOfMonth(currentMonth)),
  )

  /**
   * La lista arranca **siempre en hoy** y no se mueve.
   *
   * Estuvo anclada al día elegido y resultó ser un fallo: apuntar algo para el 6
   * de septiembre movía el ancla allí y la agenda se quedaba empezando en
   * septiembre, sin hoy ni el resto de la semana a la vista.
   *
   * Elegir un día en la rejilla no mueve el ancla: **desliza** la lista hasta él.
   * Es lo que hace Google, y deja que el mes sirva de índice sin quitarte de
   * delante lo que viene antes.
   */
  const desdeAgenda = startOfDay(today)

  // La agenda solo necesita el tramo que va a listar. El mes recibe todos los
  // eventos y se queda con los de cada día, que ya sabe hacerlo.
  const agendaEvents = allEvents.filter(event =>
    isWithinInterval(parseISO(event.start_at), {
      start: desdeAgenda,
      end: addDays(desdeAgenda, 45),
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
          mesAbierto={mesAbierto}
          onToggleMes={() => setMesAbierto(a => !a)}
          onPrev={irAnterior}
          onNext={irSiguiente}
          onAdd={() => openCreate(selectedDay)}
        />

        {/* Escritorio: el mes a la izquierda como mapa y la agenda a la derecha.
            Móvil: una columna, y el selector decide si arriba va la tira o el
            mes. La rejilla es solo de `lg` en adelante, así que por debajo el
            DOM es el de siempre. */}
        {/* En escritorio manda el mes y la agenda le hace de acompañante: la
            rejilla se lleva el espacio libre —en 1440 px pasa de 380 a más de
            900— y la lista se queda en una columna fija. Estaba al revés, con el
            mes encajado en 380 px y mil píxeles de crema al lado, y la pantalla
            se veía a medio hacer. */}
        <div className="mt-3 lg:mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:items-start">
          {/* El mes y su bloque de ausencias van juntos y en el mismo sitio: en
              móvil solo en la pestaña "Mes", y en escritorio siempre, que ahí
              caben los dos a la vez. En agenda, el móvil no pinta nada de esto:
              esa pantalla es cabecera y lista, y ya está. */}
          <div className={mesAbierto ? '' : 'hidden lg:block'}>
            <div className="mx-4 lg:mx-0">
              <Card padded={false}>
                <MonthGrid
                  currentMonth={currentMonth}
                  selectedDay={selectedDay}
                  events={allEvents}
                  tasks={tareasPendientes}
                  kids={kids}
                  members={members}
                  onSelectDay={selectDay}
                  onOpenEvent={openEdit}
                />

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
              desde={desdeAgenda}
              focusDay={selectedDay}
              events={agendaEvents}
              kids={kids}
              members={members}
              tasks={tareasPendientes}
              onToggleTask={toggleTask}
              buscador={buscador}
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
