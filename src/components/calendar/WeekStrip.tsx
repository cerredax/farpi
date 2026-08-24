import { addDays, eachDayOfInterval, format, getDate, isSameDay, isSameMonth, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Child, Event, FamilyMember, Task } from '@/types'
import { eventCoversDay } from '@/lib/events'
import { getLocalDateString } from '@/lib/date-utils'
import { DayCell } from './DayCell'

/**
 * Los siete días de la agenda, para moverse rápido sin abrir el mes.
 *
 * Son siete días **rodantes** y no la semana natural de lunes a domingo: el
 * tramo tiene que empezar donde empieza la agenda, y esa arranca hoy porque lo
 * atrasado se arrastra al día de hoy. Con la semana natural, la tira decía "3 al
 * 9" mientras la lista de abajo decía "del 6 al 13".
 *
 * Van en `grid grid-cols-7` sin arrastre lateral: siete columnas de 55 px caben
 * en los 390 px de un móvil normal, y una tira que se arrastra esconde días que
 * nadie sabe que están ahí.
 *
 * Al ser rodantes, un tramo puede caer en dos meses: "30, 31, 1, 2" son cuatro
 * números seguidos que no dicen dónde acaba agosto. Cuando eso pasa, y solo
 * entonces, el día 1 lleva debajo el mes en pequeño. La fila se reserva para las
 * siete columnas aunque solo una escriba algo, o el día del mes nuevo quedaría
 * más alto que sus vecinos.
 */

interface WeekStripProps {
  inicioSemana: Date
  selectedDay: Date
  events: Event[]
  /** Pendientes de toda la familia; cada día se queda con las que le tocan. */
  tasks: Task[]
  kids: Child[]
  members: FamilyMember[]
  onSelectDay: (day: Date) => void
}

export function WeekStrip({ inicioSemana, selectedDay, events, tasks, kids, members, onSelectDay }: WeekStripProps) {
  const dias = eachDayOfInterval({ start: inicioSemana, end: addDays(inicioSemana, 6) })
  const hoyStr = getLocalDateString(new Date())
  const cruzaDeMes = !isSameMonth(dias[0], dias[6])

  return (
    // Sin hueco entre columnas para que las franjas de vacaciones de dos días
    // seguidos se lean como un tramo y no como dos marcas sueltas.
    <div className="grid grid-cols-7 px-1.5 py-2">
      {dias.map(day => {
        const diaStr = getLocalDateString(day)
        return (
          <DayCell
            key={day.toISOString()}
            day={day}
            dayNumber={getDate(day)}
            isToday={isToday(day)}
            isSelected={isSameDay(day, selectedDay)}
            weekdayLabel={format(day, 'EEE', { locale: es })}
            // Solo cuando el tramo cae en dos meses, y solo bajo el día 1. El
            // resto de columnas reciben cadena vacía para reservar el hueco y no
            // quedar más bajas que la que lo lleva.
            monthLabel={cruzaDeMes ? (getDate(day) === 1 ? format(day, 'MMM', { locale: es }) : '') : undefined}
            events={events.filter(e => eventCoversDay(e, day))}
            // Lo vencido antes de hoy se arrastra a hoy: su día ya no se pinta
            // y desaparecer no es lo que le pasa a una tarea sin hacer.
            tasks={tasks.filter(t => t.due_date && (t.due_date < hoyStr ? diaStr === hoyStr : t.due_date === diaStr))}
            kids={kids}
            members={members}
            onSelect={onSelectDay}
          />
        )
      })}
    </div>
  )
}
