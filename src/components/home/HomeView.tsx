'use client'

import { format, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store-context'
import { useIsClient } from '@/hooks/useIsClient'
import { getDayPeriod, getGreeting } from '@/lib/date-utils'
import { capitalize } from '@/lib/text'
import { selectExpiringDocs, selectTodayEvents, selectTodayTasks, selectUpcomingEvents } from '@/lib/selectors'
import { cumplesDeLaCasa } from '@/lib/birthdays'
import { TodayEvents } from './TodayEvents'
import { TodayBirthdays } from './TodayBirthdays'
import { UpcomingBirthdays } from './UpcomingBirthdays'
import { TodayTasks } from './TodayTasks'
import { TodayMealsRow } from './TodayMealsRow'
import { PendingItems } from './PendingItems'
import { HomeTasks } from './HomeTasks'
import { ExpiringDocs } from './ExpiringDocs'
import { UpcomingEvents } from './UpcomingEvents'
import { DayIllustration } from './DayIllustration'
import { EventSheet } from '@/components/calendar/EventSheet'
import { OffDayConfirmDialog } from '@/components/tasks/OffDayConfirmDialog'
import { ItemSheet } from '@/components/lists/ItemSheet'
import type { Event, Task } from '@/types'

export function HomeView() {
  const { kids, members, allEvents, pendingTasks, todayMeals, pendingItems, documents, lists, allListItems, toggleTask, toggleListItem, createListItem, createEvent, updateEvent, deleteEvent, deleteEventSeries } = useStore()
  const [confirmTask, setConfirmTask] = useState<Task | null>(null)
  /** Si está abierto el sheet de apuntar algo en la cesta. */
  const [apuntandoEnCesta, setApuntandoEnCesta] = useState(false)
  /**
   * El plan que se está mirando de cerca. Inicio **abre lo apuntado** desde el
   * 04-09-2026: tocar un plan enseñaba y no hacía nada, así que cambiar la hora
   * de la cita del dentista era ir al calendario y buscarla otra vez.
   *
   * Es el mismo formulario del calendario y solo en modo edición: aquí no hay
   * día elegido ni franja pulsada, así que apuntar algo nuevo sigue siendo cosa
   * del calendario, que es donde se ve dónde cae.
   */
  const [eventoAbierto, setEventoAbierto] = useState<Event | null>(null)

  function handleTaskToggle(id: string) {
    const task = pendingTasks.find(t => t.id === id)
    if (task && task.due_date && !isToday(parseISO(task.due_date))) {
      setConfirmTask(task)
    } else {
      toggleTask(id)
    }
  }

  const todayEvents = useMemo(() => selectTodayEvents(allEvents), [allEvents])
  const upcoming    = useMemo(() => selectUpcomingEvents(allEvents), [allEvents])

  // Lo único de la casa que se estropea solo y sin avisar. Los días en que no
  // hay nada que renovar, esto no pinta nada.
  const papeles     = useMemo(() => selectExpiringDocs(documents), [documents])

  // Los cumpleaños de casa no se guardan: salen de la fecha de nacimiento que ya
  // está en Ajustes. Los de fuera —la abuela, el amigo del cole— sí están
  // apuntados, como evento del calendario. Aquí se juntan, porque en la tarjeta
  // de hoy son lo mismo: alguien de quien hay que acordarse. Se parten en dos
  // porque el de hoy y los que vienen no se leen igual: uno se felicita y los
  // otros se preparan.
  const cumples     = useMemo(() => cumplesDeLaCasa(kids, allEvents), [kids, allEvents])
  const cumplesHoy  = cumples.filter(c => c.dias === 0)
  const cumplesProximos = cumples.filter(c => c.dias > 0)

  /**
   * A qué cesta va lo que se apunte desde Inicio.
   *
   * La que más cosas tiene pendientes, que en una casa es la de la compra
   * prácticamente siempre; si no falta nada en ninguna, la primera. **Se elige
   * una y se dice cuál** —el sheet se titula "Añadir a Compra"— en vez de
   * ofrecer un selector de listas: apuntar desde aquí existe para que "se ha
   * acabado el café" cueste dos toques, y un desplegable delante lo devuelve a
   * cuatro. Para elegir cesta ya está la pantalla de listas, a un toque de aquí.
   *
   * `null` sin ninguna lista creada: entonces no hay botón.
   */
  const cestaDestino = useMemo(() => {
    if (lists.length === 0) return null
    const pendientesPorLista = new Map<string, number>()
    for (const item of pendingItems) {
      pendientesPorLista.set(item.list_id, (pendientesPorLista.get(item.list_id) ?? 0) + 1)
    }
    return lists.reduce(
      (mejor, lista) =>
        (pendientesPorLista.get(lista.id) ?? 0) > (pendientesPorLista.get(mejor.id) ?? 0) ? lista : mejor,
      lists[0],
    )
  }, [lists, pendingItems])

  // Las sugerencias del sheet salen de todo lo que la familia ha apuntado alguna
  // vez, igual que en la pantalla de listas.
  const historialItems = useMemo(() => allListItems.map(item => item.text), [allListItems])

  // Lo de hoy sube a la tarjeta; lo demás baja a "Cosas por hacer". Antes esa
  // lista mezclaba lo de esta tarde con lo de dentro de tres semanas, y hoy no
  // aparecía por ningún lado pese a que la tarjeta lo prometía.
  const { hoy: tareasHoy, resto: tareasResto } = useMemo(
    () => selectTodayTasks(pendingTasks),
    [pendingTasks],
  )

  // El mensaje de calma solo cuando el día está vacío de verdad: si hay tareas
  // para hoy, la tarjeta ya tiene algo que enseñar.
  //
  // Son dos frases porque no es lo mismo un día vacío con la casa al día que uno
  // sin nada a una hora **pero con cosas pendientes** debajo. La segunda decía
  // «Hoy no hay nada señalado. Lo demás puede esperar.» y se cambió el 05-09-2026:
  // salía justo cuando sí quedaba algo —tareas sin fecha, la compra— y encima
  // pegada a los bloques que las enseñan, así que la app decidía por la casa que
  // eso podía esperar. Ahora dice lo que pasa y se calla el resto, que está ahí
  // debajo con sus propios títulos.
  const diaVacio = todayEvents.length === 0 && tareasHoy.length === 0 && cumplesHoy.length === 0
  const calmMessage = !diaVacio
    ? null
    : pendingTasks.length === 0 && pendingItems.length === 0
      ? 'Hoy pinta tranquilo. La casa respira un poco.'
      : 'Un día sin agenda'

  // Saludo y fecha abren la tarjeta del día en lugar del rótulo en mayúsculas
  // que había ("Lo que hay que hacer hoy"): dicen lo mismo y son cercanos.
  // Estuvieron en la cabecera hasta hoy y de ahí se van, porque enseñarlos en
  // los dos sitios era decir dos veces la misma hora.
  //
  // Solo en el navegador, con la misma guarda que usaba `TopBar`: /home se
  // prerenderiza, así que el HTML servido llevaría el día del build y la hora
  // del build. Hasta que hidrata se deja el hueco, para que nada salte.
  const ahora = useIsClient() ? new Date() : null

  return (
    // Los sheets van **fuera** del contenedor de abajo, y no es cosmética: ese
    // div lleva `space-y-6`, que separa a sus hijos con un margen. Un
    // `BottomSheet` cerrado es `fixed bottom-0` con `translate-y-full`, y en una
    // caja fija ese margen entra en la cuenta del `bottom`: corre el ancla 24 px
    // hacia arriba y el desplazamiento —el 100 % de su propia altura— ya no
    // basta para sacarla de la pantalla.
    //
    // El resultado era el sheet del plan asomando por abajo y tapando media
    // etiqueta de la barra de navegación. El otro sheet, al que `space-y` no le
    // pone margen, asomaba 0 px: eso fue lo que lo delató. Solo en móvil,
    // porque en `lg` el espaciado se apaga y el sheet es modal centrado. Lo
    // vigila `e2e/movil.spec.ts` en todas las rutas.
    <>
      {/* En escritorio Inicio deja de ser una columna larga: la tarjeta de hoy
          ocupa el ancho —es el titular de la pantalla— y debajo las secciones
          se reparten en dos columnas, para que "qué hay que saber hoy" entre de
          una vez sin bajar. La rejilla va en este mismo div y cada hijo dice si
          ocupa una o dos, así que por debajo de `lg` el DOM no cambia. */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6 lg:max-w-5xl lg:px-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-warm p-4 shadow-sm lg:col-span-2 lg:p-6">
          {ahora && <DayIllustration period={getDayPeriod(ahora)} />}
          <div className="relative space-y-3">
            <div className="min-h-[3.25rem]">
              {ahora && (
                <>
                  <p className="text-2xl font-bold text-ink leading-tight">{getGreeting(ahora)}</p>
                  <p className="text-sm font-semibold text-muted">
                    {capitalize(format(ahora, "EEEE, d 'de' MMMM", { locale: es }))}
                  </p>
                </>
              )}
            </div>

            {/* Las etiquetas de los hijos vivían aquí debajo: ocupaban una fila
                entera para repetir nombres que ya salen en cada plan. */}
            <TodayBirthdays cumples={cumplesHoy} />
            <TodayEvents events={todayEvents} kids={kids} members={members} calmMessage={calmMessage} onOpen={setEventoAbierto} ahora={ahora} />
            <TodayTasks tasks={tareasHoy} onToggle={handleTaskToggle} />
            <TodayMealsRow meals={todayMeals} />
          </div>
        </div>

        {/* Pegado a la tarjeta del día porque es lo que más caduca —valga la
            palabra— de todo lo que hay debajo: un DNI vencido estropea el
            viaje del mes que viene, y la compra puede esperar al scroll. */}
        <ExpiringDocs docs={papeles} />

        {/* Después de hoy, lo que se toca a diario: la compra pendiente y las
            tareas. Lo que viene cierra. */}
        <PendingItems
          items={pendingItems}
          onToggle={toggleListItem}
          onAdd={cestaDestino ? () => setApuntandoEnCesta(true) : undefined}
          cestaLabel={cestaDestino?.name}
        />
        <HomeTasks pendingTasks={tareasResto} onToggle={handleTaskToggle} />
        <UpcomingEvents events={upcoming} kids={kids} members={members} onOpen={setEventoAbierto} />
        <UpcomingBirthdays cumples={cumplesProximos} />
      </div>

      {/* La `key` cuelga del evento para que el formulario arranque con lo que
          tiene ese plan y no con lo del anterior, igual que en el calendario.
          `onCreate` es el del store por honestidad —el contrato lo pide—, pero
          en modo edición no hay camino que llegue a él. */}
      <EventSheet
        key={eventoAbierto ? `edit-${eventoAbierto.id}` : 'sin-evento'}
        open={!!eventoAbierto}
        mode="edit"
        initial={eventoAbierto}
        kids={kids}
        members={members}
        onClose={() => setEventoAbierto(null)}
        onCreate={createEvent}
        onUpdate={updateEvent}
        onDelete={deleteEvent}
        onDeleteSeries={deleteEventSeries}
      />

      {/* El mismo sheet de la pantalla de listas, en modo crear y con la cesta
          dicha en el título. `onUpdate` y `onDelete` son de mentira porque el
          contrato los pide, pero en modo crear no hay camino que llegue a
          ellos. Fuera del contenedor de arriba por lo del `space-y`, como los
          otros dos. */}
      <ItemSheet
        open={apuntandoEnCesta}
        mode="create"
        titulo={cestaDestino ? `Añadir a ${cestaDestino.name}` : undefined}
        historial={historialItems}
        onClose={() => setApuntandoEnCesta(false)}
        onCreate={draft => { if (cestaDestino) createListItem(cestaDestino.id, draft) }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />

      {/* El mismo diálogo que la pantalla de Tareas. Inicio tenía una copia con
          los botones escritos a mano —y con el verde flojo, blanco sobre
          `primary` a 2,6:1— que además **no sabía de tareas que se repiten**: a
          una tarea diaria le decía "es para el 17 de junio, no para hoy" en vez
          de "es diaria y toca el 17". La misma pregunta desde dos archivos, y la
          copia se había quedado atrás. */}
      <OffDayConfirmDialog
        open={!!confirmTask}
        task={confirmTask}
        onConfirm={() => { if (confirmTask) toggleTask(confirmTask.id); setConfirmTask(null) }}
        onCancel={() => setConfirmTask(null)}
      />
    </>
  )
}
