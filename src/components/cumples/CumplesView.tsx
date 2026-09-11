'use client'

import { useMemo, useState } from 'react'
import { EventSheet } from '@/components/calendar/EventSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { ViewHeader } from '@/components/ui/ViewHeader'
import { fondoDePersona } from '@/lib/assignees'
import { cumplesDeLaCasa, diaDeCumple, edadEnPalabras } from '@/lib/birthdays'
import { DIAS_LISTA_CUMPLES } from '@/lib/constants'
import { getLocalDateString } from '@/lib/date-utils'
import { useStore } from '@/lib/store-context'

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
 * De momento las filas no se tocan. Corregir un nombre o borrar un cumpleaños
 * apuntado se sigue haciendo en el calendario, y la fecha de nacimiento de la
 * casa, en Ajustes.
 */
export function CumplesView() {
  const { kids, members, allEvents, createEvent, createYearlySeries, updateEvent, deleteEvent } = useStore()
  const [sheetOpen, setSheetOpen] = useState(false)

  const cumples = useMemo(
    () => cumplesDeLaCasa(kids, allEvents, getLocalDateString(), DIAS_LISTA_CUMPLES),
    [kids, allEvents],
  )

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
          onAdd={() => setSheetOpen(true)}
          addLabel="Apuntar un cumpleaños"
        />

        {cumples.length === 0 ? (
          <EmptyState emoji="🎂" title="Sin cumpleaños" />
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm divide-y divide-hairline">
            {cumples.map(({ id, nombre, fecha, dias, edad, color }) => (
              <li key={id} className="flex items-baseline gap-2 px-4 py-3">
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
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* El mismo sheet del calendario, con el tipo ya puesto: apuntar un
          cumpleaños es apuntar un evento anual, y tener aquí un formulario
          propio sería la segunda forma de crear lo mismo. */}
      <EventSheet
        open={sheetOpen}
        mode="create"
        defaultKind="cumple"
        kids={kids}
        members={members}
        onClose={() => setSheetOpen(false)}
        onCreate={createEvent}
        onCreateYearlySeries={createYearlySeries}
        onUpdate={updateEvent}
        onDelete={deleteEvent}
      />
    </>
  )
}
