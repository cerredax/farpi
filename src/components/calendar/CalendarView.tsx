'use client'

import { useState } from 'react'
import {
  addDays,
  addWeeks,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { capitalize } from '@/lib/text'
import { useStore } from '@/lib/store-context'
import { getLocalDateString } from '@/lib/date-utils'
import { selectEventMatches, selectPendingTasks, selectVisibleAbsences, selectVisibleBirthdays } from '@/lib/selectors'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import { isBirthday } from '@/lib/events'
import { CalendarHeader, type VistaCalendario } from './CalendarHeader'
import { Timeline } from './Timeline'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSwipe } from '@/hooks/useSwipe'
import { MonthGrid } from './MonthGrid'
import { Availability } from './Availability'
import { Birthdays } from './Birthdays'
import { AgendaList } from './AgendaList'
import { DayPanel } from './DayPanel'
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

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today))
  const [selectedDay, setSelectedDay]   = useState(today)
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  /**
   * La hora con la que abre el formulario, cuando se ha llegado pulsando una
   * franja del eje (vista Día o Semana). Desde el `+` de la cabecera, la agenda
   * o la rejilla del mes no hay franja que leer y se queda vacía.
   */
  const [horaInicial, setHoraInicial] = useState<string | undefined>(undefined)
  const [busqueda, setBusqueda] = useState('')

  /**
   * Qué enseña el calendario, y son **dos estados y no uno** a propósito.
   *
   * Móvil y escritorio no ofrecen lo mismo: en escritorio son Día, Semana y Mes,
   * y en móvil se añade **Agenda**, la lista continua.
   *
   * **Los dos abren en Mes** (26-08-2026). En móvil, la pestaña Mes no es solo la
   * rejilla: es la rejilla **y la lista debajo**, así que no pierde nada de lo que
   * daba abrir en Agenda y añade saber dónde cae cada cosa. Y no abre en `dia`
   * aunque parezca lo más directo: eso es lo que había hasta el 24-08-2026 y se
   * retiró porque lo de mañana y lo del jueves no se veían, y un día de familia
   * con dos citas deja diecisiete horas en blanco.
   *
   * Siguen siendo **dos estados y no uno**: con uno solo, el valor de partida
   * tendría que depender del ancho, y el ancho no se sabe en el primer pintado,
   * así que la pantalla abriría en una vista y saltaría a otra al hidratar. Y
   * cambiar de vista en el móvil no tiene por qué cambiarla en el escritorio.
   */
  const [vistaEscritorio, setVistaEscritorio] = useState<VistaCalendario>('mes')
  const [vistaMovil, setVistaMovil] = useState<VistaCalendario>('mes')

  /**
   * Lo que el calendario pinta, que no es todo lo que hay guardado: **los
   * cumpleaños no** (28-08-2026). Tienen su propio bloque debajo del mes, junto
   * a "Vacaciones y descansos", y el porqué está en `Birthdays.tsx`. Se filtra
   * **una vez y aquí** para que la rejilla, la lista, el eje de horas y el
   * buscador no puedan discrepar: ver un cumpleaños en la agenda que no está en
   * el mes de arriba sería peor que no verlo en ninguno de los dos.
   */
  const eventos = allEvents.filter(e => !isBirthday(e))

  /**
   * Aquí vuelve el `useMediaQuery`, que se había ido el 25-08-2026 cuando quién
   * se ve pasó a ser cosa de Tailwind. Ya no vale: el escritorio y el móvil
   * pintan **cosas distintas** —el eje de horas contra la lista—, y esconder una
   * con CSS dejaría las dos en el DOM. La lista pone un `id` por día para poder
   * deslizarse hasta él, y duplicada esos `id` se repetirían.
   */
  const esEscritorio = useMediaQuery('(min-width: 1024px)')
  const vista = esEscritorio ? vistaEscritorio : vistaMovil
  const setVista = esEscritorio ? setVistaEscritorio : setVistaMovil
  const vistas: VistaCalendario[] = esEscritorio
    ? ['dia', 'semana', 'mes']
    : ['agenda', 'dia', 'semana', 'mes']
  const conEje = vista === 'dia' || vista === 'semana'

  // Los días que pinta el eje: uno en la vista Día, la semana entera en Semana.
  const diasDelEje = vista === 'dia'
    ? [startOfDay(selectedDay)]
    : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selectedDay, { weekStartsOn: 1 }), i))


  // Ya no hace falta preguntar por el ancho. Desde que el mes y la agenda no
  // comparten estado —la lista arranca en hoy y el mes va por su cuenta— quién
  // se ve es cosa de Tailwind: `hidden lg:block` en la columna del mes. Aquí
  // había un `useMediaQuery` porque el tramo del que hablaba "Vacaciones y
  // descansos" dependía de ello, y eso sí era lógica.

  function openCreate(day = selectedDay, hora?: number) {
    setSelectedDay(day)
    setHoraInicial(hora === undefined ? undefined : `${String(hora).padStart(2, '0')}:00`)
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

  /**
   * Las flechas recorren lo que se esté viendo: un mes, una semana o un día.
   *
   * En móvil solo aparecen con el mes desplegado —la lista arranca en hoy y se
   * desliza, no hay nada que recorrer— y ahí `vista` vale `mes`, que es su valor
   * de partida y el móvil no lo toca.
   */
  function mover(pasos: number) {
    if (!conEje) return setCurrentMonth(m => addMonths(m, pasos))
    const nuevo = vista === 'dia'
      ? addDays(selectedDay, pasos)
      : addWeeks(selectedDay, pasos)
    setSelectedDay(nuevo)
    setCurrentMonth(startOfMonth(nuevo))
  }

  function irAnterior() { mover(-1) }
  function irSiguiente() { mover(1) }

  /**
   * El mismo movimiento que las flechas, pero con el dedo (28-08-2026). Se
   * cuelga de la rejilla, que es lo que se está pasando, y no de la pantalla
   * entera: la lista de la agenda no tiene nada que recorrer y los bloques de
   * ausencias y cumpleaños hablan del mes que ya está puesto.
   *
   * El eje de horas tiene el suyo **dentro de `Timeline`**: ahí el desliz
   * horizontal ya significa recorrer la semana, y para saber si el dedo está
   * pasando de semana o moviéndose por ella hay que mirar dónde está su barra de
   * desplazamiento, que solo se conoce ahí.
   */
  const desliz = useSwipe(irAnterior, irSiguiente)

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
    if (created.length === 0) return
    // Se va al mes del primero, que es donde lo va a buscar quien acaba de
    // apuntarlo: un cumpleaños no sale en la lista, sale en su bloque, y el
    // bloque habla del mes que se está mirando.
    enfocarDia(parseISO(created[0].start_at))
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
    eventos,
    getLocalDateString(startOfMonth(currentMonth)),
    getLocalDateString(endOfMonth(currentMonth)),
  )

  // Los cumpleaños del mes que se mira, para el bloque de debajo de la rejilla.
  // Mismo tramo que las ausencias y por la misma razón: el bloque acompaña al
  // mes y no puede hablar de un día que no está pintado encima.
  const cumplesVisibles = selectVisibleBirthdays(
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
  const agendaEvents = eventos.filter(event =>
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
  const buscador = eventos.length >= MINIMO_PARA_BUSCAR
    ? { valor: busqueda, onChange: setBusqueda, coincidencias: selectEventMatches(eventos, busqueda) }
    : undefined

  /**
   * Qué dice la cabecera y qué recorren las flechas: el mes, la semana o el día.
   *
   * Antes siempre ponía el mes, también mirando una semana, y entonces las
   * flechas parecían de mes: no había forma de saber en qué semana estabas ni de
   * ver que se movían de siete en siete.
   *
   * La semana se escribe como un tramo —"17 – 23 de agosto"— y el mes solo se
   * repite si el tramo lo cruza, que es cuando hace falta para situarse.
   *
   * **En móvil va abreviado** (28-08-2026), desde que el selector de vista subió
   * a esta misma fila: al título le quedan unos 150 px, y "31 de ago – 6 de
   * septiembre" se cortaba en "31 de ago – 6 de …", que no dice dónde estás. Con
   * "31 ago – 6 sep" y "Jue, 27 ago" entra entero. En escritorio sobra el sitio,
   * así que allí sigue escrito largo.
   */
  const [titulo, unidad] = (() => {
    if (!conEje) return [capitalize(format(currentMonth, 'MMMM yyyy', { locale: es })), 'Mes']
    if (vista === 'dia') {
      return [capitalize(format(selectedDay, esEscritorio ? "EEEE, d 'de' MMMM" : 'EEE, d MMM', { locale: es })), 'Día']
    }

    const [primero, ultimo] = [diasDelEje[0], diasDelEje[diasDelEje.length - 1]]
    const mismoMes = isSameMonth(primero, ultimo)
    const desde = format(primero, mismoMes ? 'd' : (esEscritorio ? "d 'de' MMM" : 'd MMM'), { locale: es })
    const hasta = format(ultimo, esEscritorio ? "d 'de' MMMM" : 'd MMM', { locale: es })
    return [capitalize(`${desde} – ${hasta}`), 'Semana']
  })()

  const sheetKey = editingEvent
    ? `edit-${editingEvent.id}`
    : `create-${format(selectedDay, 'yyyyMMdd')}-${horaInicial ?? ''}`

  return (
    <>
      <div className="pb-6 lg:mx-auto lg:max-w-5xl lg:px-6 lg:py-4">
        <CalendarHeader
          titulo={titulo}
          unidad={unidad}
          vista={vista}
          onVista={setVista}
          vistas={vistas}
          onPrev={irAnterior}
          onNext={irSiguiente}
          onAdd={() => openCreate(selectedDay)}
        />

        {/* Con el eje de horas delante, la pantalla es solo el eje: Google no
            pone lista al lado en Semana ni en Día, y con ella la rejilla se
            queda sin el ancho que necesita para que un bloque diga algo. La
            lista es la respuesta a "¿qué viene?" y esa pregunta la contesta el
            mes, que sí la lleva al lado. */}
        {conEje ? (
          <div className="mt-4">
            <Timeline
              days={diasDelEje}
              events={eventos}
              cumples={allEvents.filter(isBirthday)}
              kids={kids}
              members={members}
              tasks={tareasPendientes}
              onEdit={openEdit}
              onAdd={openCreate}
              onPrev={irAnterior}
              onNext={irSiguiente}
            />
          </div>
        ) : (
          /* El mes, con la agenda al lado en escritorio y debajo en móvil. La
             rejilla se lleva el espacio libre —en 1440 px pasa de 380 a más de
             900— y la lista se queda en una columna fija. */
          <div className="mt-3 lg:mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:items-start">
            {/* El mes y su bloque de ausencias van juntos: en móvil solo cuando
                se despliega, y en escritorio siempre. En la lista de móvil no se
                pinta nada de esto: esa pantalla es cabecera y lista. */}
            <div className={vista === 'mes' ? '' : 'hidden lg:block'}>
              <div className="mx-4 lg:mx-0">
                <Card padded={false}>
                  {/* El desliz va en la rejilla y no en la tarjeta entera: bajo
                      ella están las ausencias y los cumpleaños del mes, y
                      arrastrar el dedo por una lista para leerla no puede
                      cambiar el mes debajo. */}
                  <div {...desliz}>
                    <MonthGrid
                      currentMonth={currentMonth}
                      selectedDay={selectedDay}
                      events={eventos}
                      tasks={tareasPendientes}
                      kids={kids}
                      members={members}
                      onSelectDay={selectDay}
                      onCreateDay={openCreate}
                      onOpenEvent={openEdit}
                    />
                  </div>

                  {/* Qué hay el día elegido, pegado a la rejilla, en los dos
                      tamaños (28-08-2026: en escritorio también, que llevaba un
                      `lg:hidden` y allí elegir un día tampoco contestaba nada).
                      Va **antes** de los bloques de debajo porque habla del día
                      que acabas de tocar y ellos del mes entero: lo más cercano
                      a lo que se ha hecho, primero. Con hoy elegido no sale, que
                      es lo que ya cuenta la agenda. */}
                  {!isSameDay(selectedDay, today) && (
                    <DayPanel
                      day={selectedDay}
                      events={eventos}
                      cumples={allEvents.filter(isBirthday)}
                      tasks={tareasPendientes}
                      kids={kids}
                      members={members}
                      onEdit={openEdit}
                      onAdd={openCreate}
                      onToggleTask={toggleTask}
                    />
                  )}

                </Card>

                {/* Los dos vecinos del mes, en **su propia tarjeta** y no dentro
                    de la del calendario (28-08-2026). Colgando de la rejilla se
                    leían como una parte más de ella, y no lo son: el calendario
                    dice qué días son y esto dice cómo es el mes. La separación
                    es la mínima que se nota —el hueco de `mt-2` y el borde de la
                    tarjeta—, que es justo lo que hacía falta: son vecinos, no
                    otra pantalla.

                    Si no hay ni ausencias ni cumpleaños la tarjeta no se pinta:
                    los dos bloques devuelven `null` y quedaría una caja blanca
                    vacía debajo del mes. */}
                {(ausenciasVisibles.length > 0 || cumplesVisibles.length > 0) && (
                  <Card padded={false} className="mt-2">
                    <Availability
                      ausencias={ausenciasVisibles}
                      kids={kids}
                      members={members}
                      onEdit={openEdit}
                    />

                    {/* Los cumpleaños, debajo de las ausencias y con su misma
                        forma: los dos dicen cómo es el mes y ninguno de los dos
                        es algo que hacer ese día. Van los últimos porque una
                        ausencia cambia los planes de la casa y un cumpleaños se
                        felicita. */}
                    <Birthdays
                      cumples={cumplesVisibles}
                      kids={kids}
                      members={members}
                      onEdit={openEdit}
                    />
                  </Card>
                )}
              </div>
            </div>

            <div>
              <AgendaList
                desde={desdeAgenda}
                /* El salto de la lista hasta el día elegido es **de escritorio**
                   (28-08-2026). En móvil ahora el detalle sale pegado a la
                   rejilla, así que además mover la página entera hasta una fila
                   de la agenda era llevarse de delante justo lo que se acababa
                   de abrir. En escritorio la agenda está en la columna de al
                   lado, a la vista, y el salto sigue siendo lo que se espera. */
                focusDay={esEscritorio ? selectedDay : undefined}
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
        )}
      </div>

      <EventSheet
        key={sheetKey}
        open={sheetOpen}
        mode={editingEvent ? 'edit' : 'create'}
        initial={editingEvent}
        defaultDate={selectedDay}
        defaultTime={horaInicial}
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
