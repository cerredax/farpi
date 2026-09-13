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
  const eventosDeTodos = allEvents.filter(e => !isBirthday(e))

  /**
   * **El filtro por personas se fue el 13-09-2026**, un día después de entrar.
   *
   * Era una fila de pastillas debajo de la cabecera que encendía y apagaba a cada
   * uno. La función tenía sentido —"¿y qué tiene Cris?" es media pregunta de una
   * casa— pero no pagaba lo que costaba: 60 px de pantalla fijos en el móvil, en
   * la vista que menos sitio tiene, para algo que se toca una vez cada mucho. Y
   * la pregunta ya tiene dónde contestarse: el eje **"Por persona"** de la
   * agenda, que la reparte entera por quién lleva cada cosa sin esconder nada ni
   * dejar la pantalla en un estado del que luego hay que acordarse de salir.
   *
   * Lo que se pierde es aislar a una persona en la **rejilla** del mes. Si algún
   * día vuelve a hacer falta, que vuelva por ahí y no como una banda permanente:
   * el sitio es el que ya ocupa el eje de la agenda, o un control plegado.
   */
  const eventos = eventosDeTodos
  const cumples = allEvents.filter(isBirthday)

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
   * En las dos vistas sin eje —Mes y, en móvil, Agenda— eso es el mes, y desde
   * el 13-09-2026 mover el mes mueve también la lista de debajo (ver
   * `desdeAgenda`). Antes, en la pestaña Agenda, las flechas cambiaban el rótulo
   * de la cabecera y no movían nada: el único sitio de la app donde un control
   * de navegación no navegaba.
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
    cumples,
    getLocalDateString(startOfMonth(currentMonth)),
    getLocalDateString(endOfMonth(currentMonth)),
  )

  /**
   * En el mes de hoy la lista arranca **en hoy**, y en cualquier otro, en el
   * **día 1 del mes que se está mirando** (13-09-2026).
   *
   * Arrancaba siempre en hoy, y eso dejaba la pantalla diciendo dos cosas
   * distintas a la vez: con la rejilla en agosto, la lista de debajo seguía
   * encabezada por "Hoy · 17 mié" de junio. En móvil, que es donde la lista va
   * debajo del mes y no en una columna aparte, eran dos meses en la misma
   * pantalla sin nada que avisara. Y en la pestaña Agenda era peor todavía: allí
   * no hay rejilla, así que las flechas cambiaban el rótulo de la cabecera y no
   * movían nada.
   *
   * Lo que se conserva es la razón por la que el ancla dejó de ser el día
   * elegido: apuntar algo para el 6 de septiembre movía la lista allí y se
   * llevaba por delante lo que viene antes. Un mes no es un día — elegir el 18
   * de agosto mirando agosto no mueve nada, sigue **deslizando** hasta él (ver
   * `focusDay`) —, así que el ancla solo se mueve cuando te vas de mes, que es
   * justo cuando dejar la lista en hoy era mentir.
   *
   * De propina, el salto al día elegido vuelve a funcionar lejos: la lista pinta
   * 45 días desde su ancla, así que con la lista siempre en hoy, elegir un día
   * de dentro de tres meses no tenía ninguna fila a la que ir.
   */
  const desdeAgenda = isSameMonth(currentMonth, today)
    ? startOfDay(today)
    : startOfMonth(currentMonth)

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
   *
   * **El mes se abrevia igual desde el 13-09-2026**, y por lo mismo: era el
   * único título que seguía escrito largo en móvil, y en cuanto aparece el botón
   * "Hoy" —o sea, en cuanto te vas del mes de hoy— al título le quedan unos 60
   * px y salía "Agosto …". Perder el año justo cuando estás lejos es perder la
   * mitad de la respuesta. "Ago 2026" entra siempre y no cambia de forma al
   * navegar, que es lo que haría escribirlo largo mientras quepa.
   */
  const [titulo, unidad] = (() => {
    if (!conEje) return [capitalize(format(currentMonth, esEscritorio ? 'MMMM yyyy' : 'MMM yyyy', { locale: es })), 'Mes']
    if (vista === 'dia') {
      return [capitalize(format(selectedDay, esEscritorio ? "EEEE, d 'de' MMMM" : 'EEE, d MMM', { locale: es })), 'Día']
    }

    const [primero, ultimo] = [diasDelEje[0], diasDelEje[diasDelEje.length - 1]]
    const mismoMes = isSameMonth(primero, ultimo)
    const desde = format(primero, mismoMes ? 'd' : (esEscritorio ? "d 'de' MMM" : 'd MMM'), { locale: es })
    const hasta = format(ultimo, esEscritorio ? "d 'de' MMMM" : 'd MMM', { locale: es })
    return [capitalize(`${desde} – ${hasta}`), 'Semana']
  })()

  /**
   * Si lo que se está mirando **contiene hoy**, para decidir si hace falta el
   * botón de volver. Se pregunta por la vista y no por el mes a secas: mirando
   * la semana del 20 estás fuera de hoy aunque sea el mismo mes, y el botón
   * tiene que aparecer.
   *
   * En la agenda de móvil no aplica: la lista arranca siempre en hoy y no se
   * navega, así que nunca hay nada de lo que volver.
   */
  const fueraDeHoy = (() => {
    if (vista === 'agenda') return false
    if (vista === 'dia') return !isSameDay(selectedDay, today)
    if (vista === 'semana') return !isSameDay(startOfWeek(selectedDay, { weekStartsOn: 1 }), startOfWeek(today, { weekStartsOn: 1 }))
    return !isSameMonth(currentMonth, today)
  })()

  /**
   * Volver al presente: elige hoy y coloca el mes. Es `enfocarDia(today)`, y se
   * escribe así en vez de pasar `enfocarDia` directamente porque el botón no
   * recibe fecha: lo que pide es "hoy", no un día cualquiera.
   */
  function irAHoy() { enfocarDia(today) }

  const sheetKey = editingEvent
    ? `edit-${editingEvent.id}`
    : `create-${format(selectedDay, 'yyyyMMdd')}-${horaInicial ?? ''}`

  return (
    <>
      {/**
        * **El mes se lleva todo el ancho de la pantalla y el eje de horas no**
        * (13-09-2026).
        *
        * La pantalla entera estaba topada a `5xl` (1024 px) mirase lo que
        * mirase, así que en un monitor de 1440 la rejilla se quedaba en 570 px
        * —celdas de 81— mientras 400 px de pantalla se quedaban en blanco a la
        * derecha. A 81 px de celda, **10 de los 11 títulos del mes de demo
        * salían truncados**: "10:30 Pediat…", "9:30 Cena co…". La celda escribe
        * títulos justamente porque en escritorio hay ancho para leerlos, y no lo
        * había.
        *
        * El tope se queda en las vistas con eje de horas: ahí el ancho no
        * compra nada —una columna de día más ancha no cabe más tarde— y una
        * semana estirada a 1400 px separa la hora de su bloque.
        */}
      <div className={`pb-6 lg:mx-auto lg:px-6 lg:py-4 ${conEje ? 'lg:max-w-5xl' : ''}`}>
        <CalendarHeader
          titulo={titulo}
          unidad={unidad}
          vista={vista}
          onVista={setVista}
          vistas={vistas}
          onPrev={irAnterior}
          onNext={irSiguiente}
          onHoy={irAHoy}
          fueraDeHoy={fueraDeHoy}
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
              cumples={cumples}
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
          /**
           * El mes y la agenda: **al lado a partir de 1400 px, y debajo por
           * debajo de ahí** (13-09-2026). La rejilla se lleva el espacio libre y
           * la lista se queda en una columna fija de 380.
           *
           * Iban al lado desde `lg` (1024 px), y ahí las cuentas no salen: con
           * la barra lateral (224) y la lista (380), a la rejilla le quedaban
           * 348 px —**celdas de 49 px**, más estrechas que en un móvil— y encima
           * escribiendo títulos, que a ese ancho es escribir "10:30 Pe…". La
           * pantalla más grande enseñaba el mes más pequeño de la app.
           *
           * Por debajo de 1400 se apilan, que es lo que ya hacen en móvil: el
           * mes coge el ancho entero (celdas de 107 px a 1024) y la lista va
           * debajo con su buscador. No se esconde nada —esconder la lista se
           * llevaría por delante el buscador del calendario, que vive en ella— y
           * el salto al día elegido sigue funcionando igual.
           *
           * 1400 y no `xl` (1280) porque el corte es una cuenta, no un tamaño de
           * catálogo: es el ancho a partir del cual la rejilla pasa de 100 px de
           * celda con la lista al lado, que es lo que mide un título con su hora
           * delante.
           */
          <div className="mt-3 lg:mt-4 min-[1400px]:grid min-[1400px]:grid-cols-[minmax(0,1fr)_380px] min-[1400px]:gap-6 min-[1400px]:items-start">
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
                  {!isSameDay(selectedDay, today) ? (
                    <DayPanel
                      day={selectedDay}
                      events={eventos}
                      cumples={cumples}
                      tasks={tareasPendientes}
                      kids={kids}
                      members={members}
                      onEdit={openEdit}
                      onAdd={openCreate}
                      onToggleTask={toggleTask}
                    />
                  ) : (
                    /**
                     * Que la rejilla se toca (12-09-2026).
                     *
                     * La celda promete desde hace tiempo que "tocar el día enseña
                     * su detalle debajo", y no había forma de enterarse antes de
                     * probarlo: con el dedo no hay hover, y con hoy elegido —que es
                     * como abre la pantalla— debajo del mes no aparece nada.
                     *
                     * "Elige" y no "toca": la misma línea la lee un dedo y un
                     * ratón, y esta pantalla es la misma en los dos sitios.
                     *
                     * Va justo en el hueco que deja el panel y **desaparece en
                     * cuanto se toca un día**, así que no es un cartel permanente:
                     * es la misma línea, ocupada por la respuesta en vez de por la
                     * invitación. Vuelve al pulsar "Hoy", que es cuando la
                     * invitación vuelve a hacer falta.
                     */
                    <p className="border-t border-hairline px-4 py-2.5 text-xs text-muted">
                      Elige un día para ver qué tiene.
                    </p>
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

            {/* El aire entre el mes y la lista cuando van apilados: la propia
                lista trae el suyo en móvil (`pt-4`) y lo quita en escritorio
                (`lg:pt-0`), que es donde estaba al lado y no debajo. Entre 1024
                y 1400 vuelve a ir debajo, así que hace falta otra vez. */}
            <div className="lg:mt-6 min-[1400px]:mt-0">
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
