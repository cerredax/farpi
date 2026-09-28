import { eachDayOfInterval, endOfMonth, endOfWeek, getDate, getDay, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns'
import { DayCell } from './DayCell'
import type { Child, Event, FamilyMember, Task } from '@/types'
import { carrilDeAusencias, eventCoversDay, familyAbsenceEdges, familyAbsenceKind, franjasDeAusencia, topeDeFranjas } from '@/lib/events'
import { getLocalDateString } from '@/lib/date-utils'

/**
 * El mes como mapa: sirve para saber dónde hay algo y para ir allí, no para
 * leer lo que hay. Lo que hay se lee en la agenda, debajo en móvil y en la
 * columna de la derecha en escritorio.
 *
 * **Las semanas se dibujan completas y los días de los meses vecinos se pueden
 * tocar**, con el número apagado (28-09-2026). Del 24-08-2026 hasta ese día no se
 * podía: el 1 de octubre se veía y no respondía. Lo que los separa de los del mes
 * es el gris del número, no que estén muertos.

 * Es siempre el mes entero. La variante de "siete días" que tenía antes se
 * mudó a `WeekStrip`, que es quien la necesita, y con ella se fueron las dos
 * densidades: la ancha con títulos dentro de las celdas no la usaba nadie.
 */

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

interface MonthGridProps {
  currentMonth: Date
  selectedDay: Date
  events: Event[]
  /** Pendientes de toda la familia; cada día se queda con las que le tocan. */
  tasks: Task[]
  kids: Child[]
  members: FamilyMember[]
  onSelectDay: (day: Date) => void
  /** Apuntar algo un día, con doble clic en su celda. */
  onCreateDay?: (day: Date) => void
  /** Abrir un evento desde la celda. Escritorio: es donde se escriben los títulos. */
  onOpenEvent?: (event: Event) => void
}

function getMonthDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(month),     { weekStartsOn: 1 }),
  })
}

export function MonthGrid({ currentMonth, selectedDay, events, tasks, kids, members, onSelectDay, onCreateDay, onOpenEvent }: MonthGridProps) {
  const days = getMonthDays(currentMonth)
  const hoyStr = getLocalDateString(new Date())

  /**
   * La columna en la que cae hoy, para marcarla en la cabecera. `null` cuando el
   * mes que se está mirando no es el de hoy: ahí no hay ninguna columna que sea
   * "la de hoy" y pintarla sería señalar un día que no está en pantalla.
   *
   * `getDay` da 0 para el domingo y la rejilla empieza en lunes, de ahí el
   * desplazamiento: es la misma cuenta que ordena `DAY_LABELS`.
   */
  const columnaDeHoy = days.some(d => isToday(d) && isSameMonth(d, currentMonth))
    ? (getDay(new Date()) + 6) % 7
    : null

  /**
   * Lo que hay cada día, resuelto **antes** de pintar nada.
   *
   * Se calculaba dentro del `map` y ahora no puede: el carril de las franjas se
   * reserva por el mes entero, así que para saber cuánto reserva el lunes hay que
   * haber mirado ya todos los demás días. Se hace una sola vez, para todas las
   * celdas, las del mes y las de los meses vecinos.
   */
  const info = days.map(day => {
    const delDia = events.filter(e => eventCoversDay(e, day))
    // Si ese día no hay nadie, y dónde empieza y acaba el tramo. Se calcula
    // **aquí y no en la celda** porque saber si la franja se redondea exige
    // mirar el día anterior y el siguiente, y la celda solo conoce el suyo:
    // `events` entero vive en este componente.
    const familia = familyAbsenceKind(events, members, day)
    const sueltas = franjasDeAusencia(delDia, familia).slice(0, topeDeFranjas(familia))
    return {
      day,
      delDia,
      familia,
      bordes: familia ? familyAbsenceEdges(events, members, day) : null,
      sueltas,
      franjas: (familia ? 1 : 0) + sueltas.length,
    }
  })
  const carriles = carrilDeAusencias(info.map(d => d.franjas))

  return (
    /**
     * **La rejilla se dibuja como una rejilla**, en los dos tamaños. En
     * escritorio desde el 26-08-2026, cuando no tenía ni una línea y una pantalla
     * grande con pocos eventos se leía como un vacío en vez de como un
     * calendario. En móvil se dejaron fuera entonces, apostando a que la
     * proximidad bastaba para leer las columnas; no bastaba: con las celdas casi
     * pegadas, un número y sus puntos se confundían con los del día de al lado y
     * costaba seguir una semana en horizontal (31-08-2026).
     *
     * Van en `--color-line`, el borde normal de la app, y no en el `hairline` con
     * el que nacieron: a 52 px de celda el hairline sobre blanco casi no existe,
     * y una línea que no se ve no separa nada. El mismo tono en las dos tallas,
     * que es lo que hace que la pantalla sea la misma pantalla.
     *
     * Sin relleno alrededor: las líneas tienen que morir en el borde de la
     * `Card`, o la última columna y la última fila quedan flotando a dos píxeles
     * del marco y se ve el remiendo.
     */
    /* `rejilla-mes` es lo que le quita la trama y engruesa las franjas en móvil
       (28-09-2026, en `globals.css`): la trama iba en el mismo gris que las
       líneas, y a 52 px de celda las dos se fundían en ruido. */
    <div className="rejilla-mes">
      <div className="grid grid-cols-7 border-b border-line">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            // Sábado y domingo también en la cabecera: la trama empieza en las
            // letras, que si no la columna arranca a media altura. Aquí se mira el
            // índice de columna y no una fecha —no hay ninguna—: son las dos
            // últimas de `DAY_LABELS`.
            className={`flex h-7 items-center justify-center text-[10px] font-bold uppercase tracking-widest ${
              i >= 5 ? 'dia-libre' : ''
            } ${columnaDeHoy === i ? 'text-muted lg:text-accent-strong' : 'text-muted'}`}
          >
            {/**
              * **La letra de hoy va sobre una pastilla salmón** (14-09-2026).
              * Hoy se marcaba solo en su número, un aro de 32 px perdido entre
              * treinta y tantos, y en una pantalla de 1440 px había que buscarlo.
              * Desde la cabecera la columna se encuentra de un vistazo y el aro
              * remata la búsqueda en la fila que toque.
              *
              * El color es el mismo de siempre —`accent-strong` sobre
              * `accent-tint`, 6,0:1— y no es lo único que la distingue: es la
              * única letra de la fila con fondo. Va dentro de un `span` y no en
              * el `div` de la columna para que la pastilla mida lo que la letra
              * y no el ancho entero, que sobre la trama del sábado se leería
              * como que ese día está apagado.
              */}
            {/* Solo en escritorio (28-09-2026): en móvil hoy se marca una vez,
                en su número, y la rejilla es lo bastante pequeña para verlo. */}
            <span className={columnaDeHoy === i ? 'lg:rounded-full lg:bg-accent-tint lg:px-2 lg:py-0.5' : ''}>
              {label}
            </span>
          </div>
        ))}
      </div>
      {/* Sin hueco entre columnas: la raya de los días de ausencia tiene que
          tocarse para leerse como un tramo. */}
      <div className="grid grid-cols-7">
        {info.map(({ day, delDia, familia, bordes }, i) => {
          /**
           * **Los días de las puntas son días como los demás, en gris**
           * (28-09-2026). Fueron un hueco que solo cerraba la semana: se veía el 1
           * de octubre y no se podía tocar, y lo que se ve y no responde parece
           * roto. Ahora son una celda del mes vecino con el número apagado, y
           * tocarla lleva a ese mes con el día elegido (`selectDay`), que es lo
           * que hace cualquier calendario. El doble clic apunta ahí mismo.
           *
           * Del 24-08 al 28-09-2026 fueron, por turnos, un hueco en blanco, un
           * relleno gris y un número suelto sin botón. Lo que no cambia: la
           * franja de una ausencia cruza la frontera del mes a la misma altura,
           * porque sale del mismo `info` y del mismo carril.
           */
          const diaStr = getLocalDateString(day)
          return (
            <DayCell
              key={day.toISOString()}
              day={day}
              dayNumber={getDate(day)}
              isToday={isToday(day)}
              fueraDeMes={!isSameMonth(day, currentMonth)}
              isSelected={isSameDay(day, selectedDay)}
              events={delDia}
              tasks={tasks.filter(t => t.due_date && (t.due_date < hoyStr ? diaStr === hoyStr : t.due_date === diaStr))}
              kids={kids}
              members={members}
              onSelect={onSelectDay}
              ausenciaFamiliar={familia && bordes ? { kind: familia, ...bordes } : null}
              carril={carriles[i]}
              onCreate={onCreateDay}
              onOpenEvent={onOpenEvent}
            />
          )
        })}
      </div>
    </div>
  )
}
