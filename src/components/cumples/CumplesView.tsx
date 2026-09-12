'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { EventSheet } from '@/components/calendar/EventSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { ViewHeader } from '@/components/ui/ViewHeader'
import { fondoDePersona } from '@/lib/assignees'
import { cumplesDeLaCasa, diaDeCumple, edadEnPalabras } from '@/lib/birthdays'
import { DIAS_LISTA_CUMPLES, ROUTES } from '@/lib/constants'
import { getLocalDateString } from '@/lib/date-utils'
import { useStore } from '@/lib/store-context'
import type { Event } from '@/types'

/**
 * Cumpleaños: los doce meses que vienen, de hoy al más lejano.
 *
 * Es la pantalla que faltaba para una pregunta que la app ya sabía contestar a
 * medias. Inicio avisa con dos semanas y el calendario enseña los del mes que
 * se está mirando, así que en septiembre no había dónde ver que la abuela
 * cumple en marzo. Aquí están todos y en orden, que es lo único que se le pide
 * a esta lista.
 *
 * **Junta los dos orígenes** sin decir cuál es cuál: quien es de la casa sale
 * de su fecha de nacimiento en Ajustes y quien no, del cumpleaños apuntado en
 * el calendario. Lo hace `cumplesDeLaCasa`, y el porqué de que sean dos cosas
 * distintas está en `birthdays.ts`. Para quien mira la lista son lo mismo: un
 * nombre y un día.
 *
 * Por eso el `+` solo puede apuntar **a los de fuera**: a quien vive en casa no
 * se le apunta el cumpleaños, se le pone la fecha de nacimiento en su ficha.
 *
 * **Las filas se tocan**, y es ahí donde la costura de los dos orígenes asoma
 * una vez: llevan a donde se arregla cada cosa, que no es el mismo sitio. Un
 * cumpleaños apuntado abre aquí mismo el sheet del calendario —el nombre, el día
 * y el año de nacimiento— y el de quien es de la casa lleva a Ajustes, que es
 * donde vive la fecha de nacimiento de la que se deduce. Mandar los dos al mismo
 * formulario obligaría a dar de alta a la abuela como persona de la familia, que
 * es justo lo que se descartó en `birthdays.ts`.
 *
 * De una serie anual se edita **el cumpleaños de este año**, como en el
 * calendario: cada año es su propia fila. Borrar sí pregunta por la serie
 * entera (`EventSeriesDelete`).
 */
export function CumplesView() {
  const { kids, members, allEvents, createEvent, createYearlySeries, updateEvent, deleteEvent, deleteEventSeries } = useStore()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editando, setEditando] = useState<Event | null>(null)

  const cumples = useMemo(
    () => cumplesDeLaCasa(kids, allEvents, getLocalDateString(), DIAS_LISTA_CUMPLES),
    [kids, allEvents],
  )

  function abrirAlta() {
    setEditando(null)
    setSheetOpen(true)
  }

  function abrirEdicion(id: string) {
    const evento = allEvents.find(e => e.id === id)
    if (!evento) return
    setEditando(evento)
    setSheetOpen(true)
  }

  // Lo mismo que hace el calendario: cambiar la clave remonta el sheet, y así el
  // formulario no arrastra lo que hubiera dentro de la fila anterior.
  const sheetKey = editando ? `edit-${editando.id}` : 'create'

  return (
    // El sheet, fuera del `space-y-*`: el margen entre hermanos entra en la
    // cuenta del `bottom` de una caja fija y lo deja asomando sobre la barra.
    <>
      {/* `lg:max-w-3xl` y no el ancho de Notas o Documentos: esto es una columna
          de filas de una línea, y estirada a 1152 px el nombre se queda pegado a
          la izquierda y la edad a un palmo, al otro lado de la pantalla. Es el
          mismo ancho que usa el detalle de una lista, que es la misma forma. */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 lg:max-w-3xl lg:px-6">
        <ViewHeader
          resumen={`${cumples.length} cumpleaños en los próximos doce meses`}
          onAdd={abrirAlta}
          addLabel="Apuntar un cumpleaños"
        />

        {cumples.length === 0 ? (
          <EmptyState emoji="🎂" title="Sin cumpleaños" />
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm divide-y divide-hairline">
            {cumples.map(({ id, nombre, fecha, dias, edad, color, apuntado }) => {
              /* Lo que se ve es igual en los dos casos —cuándo, quién y qué edad—
                 porque de dónde sale el dato no es asunto de quien lo mira. Lo
                 único que cambia es a dónde lleva la fila. */
              const contenido = (
                <>
                  <span className="w-20 flex-shrink-0 text-xs font-bold text-primary-strong">
                    {diaDeCumple(fecha, dias)}
                  </span>
                  {/* El nombre sobre su color, como en Inicio y en la agenda.
                      Quien no es de la casa no tiene color y va sobre el gris: el
                      color dice de quién es algo, y un cumpleaños de fuera no es
                      de nadie. */}
                  <span
                    className={`etiqueta-persona min-w-0 px-1 py-px text-[11px] ${color ? '' : 'bg-line'}`}
                    style={color ? { backgroundColor: fondoDePersona(color) } : undefined}
                  >
                    {nombre}
                  </span>
                  {edad !== null && (
                    <span className="ml-auto flex-shrink-0 text-xs font-semibold text-muted">
                      cumple {edadEnPalabras(edad)}
                    </span>
                  )}
                </>
              )

              // `min-h-11` son los 44 px del criterio de la casa: con `py-3` y
              // texto de 12 px la fila se queda en 40 y no la alcanza el dedo.
              const clase = 'flex min-h-11 w-full items-baseline gap-2 px-4 py-3 text-left transition-colors hover:bg-surface'

              return (
                <li key={id}>
                  {apuntado ? (
                    <button
                      type="button"
                      onClick={() => abrirEdicion(id)}
                      aria-label={`Editar el cumpleaños de ${nombre}`}
                      className={clase}
                    >
                      {contenido}
                    </button>
                  ) : (
                    /* Enlace de verdad y no un botón: lleva a otra pantalla, así
                       que se puede abrir en otra pestaña y el navegador dice a
                       dónde va. Con `?seccion=familia` porque en móvil
                       `/settings` a secas es el índice de las cinco secciones, y
                       la fecha de nacimiento está en Familia. */
                    <Link
                      href={`${ROUTES.settings}?seccion=familia`}
                      aria-label={`Cambiar la fecha de nacimiento de ${nombre} en Ajustes`}
                      className={clase}
                    >
                      {contenido}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* El mismo sheet del calendario, con el tipo ya puesto: apuntar un
          cumpleaños es apuntar un evento anual, y tener aquí un formulario
          propio sería la segunda forma de crear lo mismo. Y por eso mismo edita
          con él. `onDeleteSeries` va porque un cumpleaños apuntado **es** una
          serie anual: sin él, "Eliminar" solo ofrecería borrar el de este año y
          el que viene seguiría en la lista. */}
      <EventSheet
        key={sheetKey}
        open={sheetOpen}
        mode={editando ? 'edit' : 'create'}
        initial={editando}
        defaultKind="cumple"
        kids={kids}
        members={members}
        onClose={() => setSheetOpen(false)}
        onCreate={createEvent}
        onCreateYearlySeries={createYearlySeries}
        onUpdate={updateEvent}
        onDelete={deleteEvent}
        onDeleteSeries={deleteEventSeries}
      />
    </>
  )
}
