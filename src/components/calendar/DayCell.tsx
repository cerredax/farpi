import { format, isWeekend, parseISO } from 'date-fns'
import { eventColor, fondoDePersona } from '@/lib/assignees'
import { franjasDeAusencia, holidayName, isHoliday, isPlan, isRestDay, isVacation, topeDeFranjas, vacationEdges } from '@/lib/events'
import { FAMILY_COLOR } from '@/lib/constants'
import type { Child, Event, EventKind, FamilyMember, Task } from '@/types'
import { DayActivity, marcasDelDia, resumenDelDia } from './DayActivity'

/**
 * Un día como sitio al que ir, no como resumen de lo que pasa en él.
 *
 * La comparten la tira de siete días y la rejilla del mes, que es lo que las
 * hace consistentes: el mismo número, el mismo punto y la misma raya de ausencia
 * en los dos sitios. La única diferencia es que la tira pone encima la inicial
 * del día de la semana, porque sus columnas ruedan y no hay una cabecera fija
 * que las nombre.
 *
 * Todos los días que llegan aquí son del tramo que se está viendo: desde que la
 * rejilla no presta días de los meses vecinos, no hay ninguno que haya que
 * atenuar por ser "de fuera".
 *
 * Lo que la celda ya no hace, y antes sí:
 *
 * - **No escribe títulos de eventos.** A 390 px una celda son ~50 px: "09:00
 *   Dentista" salía como "09:0…" y había que tocar para saber qué era.
 * - **No lleva tooltip.** Era la única vía de leer el día y no existe con el
 *   dedo. Ahora tocar el día enseña su detalle debajo, que es la misma
 *   información y sin ratón.
 * - **No es varios botones.** Antes cada celda tenía el día, un `+`, una barra
 *   por vacaciones y un punto por descanso, todos pulsables y varios por debajo
 *   del mínimo de toque de 24×24. Ahora la celda es un solo botón: selecciona el
 *   día.
 *
 * Y una que se probó y se descartó: **el tinte cálido en toda la celda**
 * (24-08-2026). Dejaba igual una semana entera fuera y un día libre de una
 * persona, que son cosas distintas, y la raya se lee mejor. La raya vuelve con
 * dos cambios que sí se quedan: es decorativa, nunca un botón de 3 px, y no se
 * apila — es una por celda, por mucha gente que falte.
 */

/**
 * Cuántos títulos se escriben en la celda antes de pasar a contarlos. Escritorio.
 *
 * **Tres desde el 12-09-2026**, cuando la celda dejó de medir 104 px fijos y pasó
 * a repartirse el alto de la ventana: en un monitor normal pasa de 170, y
 * quedarse en dos títulos dejaba un "+1 más" con hueco de sobra justo debajo.
 * Del cuarto en adelante se sigue leyendo mejor en la agenda de al lado.
 */
const MAX_TITULOS = 3

/** Cuántos nombres de festivo caben en la celda. Los festivos de un día rara vez pasan de uno. */
const MAX_FESTIVOS = 2

/**
 * Lo que mide una franja de ausencia, en píxeles. Es el `height` de
 * `.franja-ausencia` en `globals.css`, repetido aquí porque el carril que las
 * reserva se calcula en JavaScript: son N franjas de alto conocido, y Tailwind
 * no admite una clase con un número que sale de una cuenta.
 */
export const ALTO_FRANJA = 7


interface DayCellProps {
  day: Date
  dayNumber: number
  isToday: boolean
  isSelected: boolean
  events: Event[]
  /** Tareas que vencen este día, ya arrastradas a hoy si venían atrasadas. */
  tasks: Task[]
  kids: Child[]
  members: FamilyMember[]
  onSelect: (day: Date) => void
  /**
   * Que ese día **no hay nadie**: todos los adultos con cuenta fuera y por lo
   * mismo. Lo calcula `MonthGrid`, que es quien tiene el calendario entero: para
   * saber dónde empieza y acaba el tramo hay que mirar el día de al lado, y la
   * celda solo conoce el suyo.
   *
   * Cuando llega, sustituye a las franjas de cada persona: una sola en el
   * amarillo de la casa. El porqué está en `familyAbsenceKind`.
   */
  ausenciaFamiliar?: { kind: EventKind; primero: boolean; ultimo: boolean } | null
  /**
   * Cuántas franjas de ausencia reserva la celda, tengan o no algo que pintar.
   * Lo decide `carrilDeAusencias` mirando la **semana entera**: si un día de la
   * fila tiene una ausencia, las siete reservan su hueco y los números se quedan
   * todos a la misma altura. Sin esto, cada franja empujaba el número 7 px y la
   * fila dejaba de leerse como una fila.
   */
  carril: number
  /**
   * Apuntar algo ese día, con **doble clic** en la celda (28-08-2026). El clic
   * simple sigue siendo elegir el día: son dos gestos distintos para dos cosas
   * distintas, y es lo que hace cualquier calendario de escritorio.
   *
   * No sustituye a nada ni deja a nadie fuera: con el teclado se elige el día y
   * se apunta con el `+` de la cabecera, que es el camino que ya había.
   */
  onCreate?: (day: Date) => void
  /**
   * Abrir un evento desde la celda. Solo lo usa escritorio, que es donde la
   * celda escribe títulos: en móvil no hay nada escrito que pulsar.
   */
  onOpenEvent?: (event: Event) => void
}

/**
 * El nombre de un festivo, cuando tiene uno propio.
 *
 * **Las ausencias ya no se pintan aquí** (26-08-2026). Fueron una raya de 3 px,
 * luego una etiqueta con el nombre, y con la etiqueta apareció el problema de
 * fondo: desde que los eventos también son etiquetas de color, unas vacaciones y
 * una cita se leían igual —rectángulo de color con texto— y solo las distinguía
 * el ancho. Encima la banda se partía en el borde de cada celda, así que de
 * lunes a viernes eran cinco trozos y no una barra.
 *
 * Ahora una ausencia **tiñe la celda entera con la trama diagonal**, en el color
 * de esa persona. Es el mismo idioma que ya dice "aquí no se trabaja" en sábados,
 * domingos y festivos, que es exactamente lo que son unas vacaciones para quien
 * las tiene; la diferencia es de quién, y eso lo lleva el color. Quién es y hasta
 * cuándo lo dice `Availability`, que es la fuente y lo dice una sola vez.
 *
 * Del festivo queda el nombre, y solo si le pusieron uno: la trama ya dice que lo
 * es. En móvil no cabe y no se pinta.
 */
function DayChips({ festivos }: { festivos: Event[] }) {
  if (festivos.length === 0) return null

  return (
    <span className="flex w-full flex-col gap-px" aria-hidden>
      {festivos.slice(0, MAX_FESTIVOS).map(event => holidayName(event) && (
        <span
          key={event.id}
          className="hidden w-full truncate px-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-muted lg:block"
        >
          {holidayName(event)}
        </span>
      ))}
    </span>
  )
}

export function DayCell({
  day,
  dayNumber,
  isToday,
  isSelected,
  events,
  tasks,
  kids,
  members,
  onSelect,
  ausenciaFamiliar,
  carril,
  onCreate,
  onOpenEvent,
}: DayCellProps) {
  const vacaciones = events.filter(isVacation)
  const descansos = events.filter(isRestDay)
  // Los planes son lo que no es una ausencia: las ausencias ya las cuenta la
  // raya, y escribir "Vacaciones" en los siete días de un tramo era justo lo que
  // sacó los títulos de la celda en su día.
  const festivos = events.filter(isHoliday)
  /**
   * La trama es de la casa entera: sábado, domingo y festivo. **Las ausencias no
   * la usan**, aunque unas vacaciones sean el día libre de alguien: se probó y se
   * descartó el mismo día porque un fondo no puede decir "día libre" y "de
   * quién" a la vez sin que el peso baile. Lo de quién lo lleva la franja.
   *
   * Con más de una ausencia manda la primera y las vacaciones ganan al descanso.
   * Cuántas personas son lo dice el nombre accesible del día, y quiénes,
   * `Availability`.
   */
  const esDiaLibre = isWeekend(day) || festivos.length > 0
  /**
   * Las ausencias que la franja de la casa **no** dice, si la hay: las de quien
   * no tiene cuenta —la abuela, un hijo— y las de quien está fuera por otro
   * motivo. Sin esto desaparecían del día, y justo el día en que la casa está
   * libre es cuando más se mira quién puede echar una mano. El porqué entero, en
   * `franjasDeAusencia`.
   */
  const ausencias = franjasDeAusencia(events, ausenciaFamiliar?.kind ?? null)
  // Las que además caben: el resumen en palabras las dice todas, la celda pinta
  // las que entran sin cambiar de alto.
  const franjas = ausencias.slice(0, topeDeFranjas(ausenciaFamiliar?.kind ?? null))
  /**
   * Los planes del día, **por hora** (12-09-2026).
   *
   * Salían en el orden en que estuvieran en la lista, y con la hora escrita
   * delante eso se ve: el día 16 ponía "9:00 Dentista, 17:30 Reunión, 12:15
   * Pediatra". Cuando la celda solo escribía títulos se notaba menos, pero ya
   * estaba mal: el "+n más" recortaba por posición y no por hora, así que lo que
   * se escondía no era lo último del día sino lo último de la lista.
   *
   * Los de todo el día primero, que es el orden que ya tienen la agenda y el
   * panel del día: no tienen hora con la que competir y encabezan el día.
   */
  const planes = events.filter(isPlan).sort((a, b) => {
    if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
    return a.start_at.localeCompare(b.start_at)
  })
  const marcas = marcasDelDia(events, tasks, members, kids)

  /**
   * El número dice **dónde estás** y nada más: el día elegido y hoy.
   *
   * Entre el 24 y el 26-08-2026 también dijo quién descansa, con el círculo en su
   * color al 50 %. Se quita al llegar las etiquetas con nombre: eran dos señales
   * para lo mismo, y de las dos el número decía menos —"aquí pasa algo", y para
   * saber quién había que saberse la paleta— y además no era fiable, porque hoy
   * y el día elegido le ganaban y un descanso hoy no se veía.
   *
   * Su razón de ser tampoco sigue en pie: nació porque con vacaciones de otro el
   * mismo día la raya no se pintaba y el descanso se quedaba sin señal. Ahora
   * caben dos etiquetas por celda.
   */
  /**
   * **Hoy es un disco salmón; el día elegido, la celda entera** (12-09-2026).
   *
   * Las dos señales estuvieron hasta hoy en el número y en el mismo verde, y se
   * distinguían solo por la forma: disco relleno el elegido, anillo hoy. Dos
   * problemas, y los dos se veían en la pantalla real.
   *
   * Uno: **el mes hablaba un idioma distinto al resto del calendario**. En la
   * agenda, en el eje de horas y en el panel del día, hoy es `accent-strong` —el
   * salmón—, y aquí era verde. En la única vista donde hay treinta números
   * compitiendo, hoy además llevaba la más débil de las dos formas, un anillo de
   * 2 px, y en una pantalla de 1440 px no se encontraba.
   *
   * Dos: elegir un día marcaba **un círculo de 32 px** en una celda de 104, justo
   * cuando de ese día cuelga un panel entero debajo de la rejilla. La respuesta a
   * "¿qué estoy mirando?" tiene que ser del tamaño de lo que se mira.
   *
   * Así que ahora son **dos señales de naturaleza distinta y no dos formas del
   * mismo círculo**: hoy es el número, el elegido es la celda. No compiten y no
   * hace falta desempatarlas cuando coinciden, que era el otro remiendo.
   *
   * Lo que se conserva del 05-09-2026, porque sigue siendo verdad:
   *
   * - **El color no es la única diferencia.** El verde y el salmón de marca están
   *   a ΔE 2,3 en protanopía, así que si las dos señales fueran dos discos de
   *   distinto tono serían el mismo disco para quien no distingue rojos de
   *   verdes. Aquí una es un disco y la otra es un fondo de celda: sobrevive a
   *   cualquier dicromacia y a una impresión en gris.
   * - **El blanco solo sobre un tono que lo admita.** `accent-strong` (#9B5A45)
   *   con blanco da 6,29:1 y pasa de sobra; el `accent` a secas daba 2,18:1 y por
   *   eso no se usa. La misma regla que `fondoDePersona` ya tenía escrita.
   * - El fondo del día elegido va en `primary-tint`, que es un verde muy claro:
   *   lleva tinta encima, no blanco, y no le quita contraste ni al número ni a
   *   los títulos que la celda escribe dentro.
   */
  const numberClass = (() => {
    if (isToday) return 'bg-accent-strong text-white'
    return 'text-ink'
  })()

  const fecha = day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const resumen = resumenDelDia({
    planes: events.length - vacaciones.length - descansos.length,
    tareas: tasks.length,
    // Los mismos que pintan franja, y por lo mismo: con la casa entera fuera,
    // "la familia descansando" ya cuenta a los adultos con cuenta, y decir
    // además "2 descansando" sería contarlos dos veces. Lo que sí falta decir es
    // quién está fuera **aparte** de ellos.
    vacaciones: ausencias.filter(isVacation).length,
    descansos: ausencias.filter(isRestDay).length,
    familia: ausenciaFamiliar?.kind ?? null,
  })

  return (
    /**
     * La celda es un contenedor, no un botón.
     *
     * Lo fue hasta el 26-08-2026, y con los títulos de escritorio dentro dejó de
     * poder serlo: un botón no puede llevar botones dentro, así que los títulos
     * se pintaban pulsables y no lo eran —pulsarlos seleccionaba el día—. Ahora
     * el botón del día ocupa la parte de arriba y cada título es el suyo.
     *
     * En móvil no cambia nada: allí no hay títulos, así que el contenedor solo
     * tiene el botón y el área que se toca es la misma de siempre.
     */
    <div
      // El doble clic va en el contenedor y no en el botón del día: en
      // escritorio la celda mide 104 px y el botón solo ocupa la parte de
      // arriba, así que en la mitad de abajo —donde hay sitio de sobra— el gesto
      // no habría hecho nada. `touch-manipulation` apaga el zoom por doble toque
      // del navegador, que si no se come el gesto en el móvil.
      onDoubleClick={() => onCreate?.(day)}
      className={`flex w-full touch-manipulation flex-col min-h-[52px] border-b border-r border-line lg:min-h-[max(104px,calc((100vh-26rem)/6))] ${
        /**
         * **Los días en los que no se trabaja llevan trama diagonal**: sábado,
         * domingo y festivo, los tres igual (26-08-2026). Es un solo concepto y
         * por eso una sola clase, `dia-libre` en `globals.css`: lo que tienen en
         * común un sábado y el 12 de octubre es que no hay trabajo ni colegio.
         *
         * Antes de esto se probaron dos cosas ese mismo día. **Rellenar la celda
         * en crema**, y se descartó porque una masa de color se lee como "esto
         * está apagado", y en una casa el fin de semana es cuando más pasa. Y
         * **una línea vertical** donde acaba la semana laboral, que a tamaño real
         * no se distinguía de las otras líneas de la rejilla: era una raya más.
         *
         * La trama va muy separada —1 px cada 7— porque la celda escribe títulos
         * a 10 px encima y una trama apretada se los come.
         */
        esDiaLibre ? 'dia-libre' : ''
      } ${
        // El día elegido, en la celda entera. Va **después** de `dia-libre` para
        // que en un sábado elegido el verde claro gane a la trama: las dos son
        // fondo, y la que contesta "estás aquí" pesa más que la que dice qué
        // clase de día es. El borde interior es lo que lo cierra como una caja y
        // no como una mancha, que a 52 px de celda se leía como un resaltado
        // suelto.
        isSelected ? 'bg-primary-tint shadow-[inset_0_0_0_2px_var(--color-primary-line)]' : ''
      }`}
    >
      {/**
        * Las franjas de ausencia, pegadas al borde de arriba y **antes que nada**.
        * Ahí está la mitad del truco: lo que dura va fuera del flujo donde van las
        * cosas del día, así que no se puede confundir con la etiqueta de un
        * evento. La otra mitad la hace el carril gris de `franja-ausencia`.
        *
        * Se redondea donde el tramo empieza y acaba de verdad, para que los días
        * de en medio encadenen. Un descanso es un día suelto y se cierra por los
        * dos lados sin preguntar.
        *
        * Decorativas, como lo era la raya: a 7 px de alto nunca llegarían al
        * mínimo de toque de 24×24, y las ausencias se editan desde `Availability`.
        */}
      {/**
        * Cuando los adultos con cuenta están todos fuera por lo mismo, **una sola
        * franja amarilla** en vez de una por cabeza (05-09-2026).
        *
        * Vino de un fallo: la celda pinta dos franjas como mucho, así que con tres
        * adultos de vacaciones el mismo día la tercera no se pintaba. El día en el
        * que la respuesta es la más simple —"aquí no hay nadie"— era el que peor se
        * leía, y encima tres franjas de tres colores hacen leer tres cosas para
        * enterarse de una.
        *
        * El amarillo es `FAMILY_COLOR`, el que ya significa "de toda la casa" en
        * el resto de la app, y viaja en `style` como el resto de colores de
        * persona. Quién es cada uno y hasta cuándo lo sigue diciendo
        * `Availability`: aquí se contesta qué día es este, allí quién está fuera.
        *
        * Va **la primera y acompañada**, no en lugar de las demás (12-09-2026).
        * Hasta entonces era un `ausenciaFamiliar ? … : …`, y con la casa entera de
        * descanso la abuela desaparecía del día: no tiene cuenta, así que el
        * amarillo nunca habló por ella. El porqué, en `franjasDeAusencia`.
        */}
      {/**
        * El carril, con alto reservado **aunque este día no tenga nada** y medido
        * por la semana entera (12-09-2026). Antes las franjas iban sueltas en el
        * flujo y cada una empujaba el número 7 px: en una fila con una sola
        * ausencia, ese día tenía el número 14 px más abajo que sus vecinos y la
        * fila dejaba de leerse como una fila. El porqué y por qué por semanas, en
        * `carrilDeAusencias`.
        */}
      <span className="block w-full flex-shrink-0" style={{ height: carril * ALTO_FRANJA }} aria-hidden>
        {ausenciaFamiliar && (() => {
          const redondeo = `${ausenciaFamiliar.primero ? 'rounded-l-full' : ''} ${ausenciaFamiliar.ultimo ? 'rounded-r-full' : ''}`
          return (
            <span className={`franja-ausencia ${redondeo}`}>
              <span className={`block h-full w-full ${redondeo}`} style={{ backgroundColor: FAMILY_COLOR }} />
            </span>
          )
        })()}
        {franjas.map(event => {
          const { primero, ultimo } = isVacation(event) ? vacationEdges(event, day) : { primero: true, ultimo: true }
          const redondeo = `${primero ? 'rounded-l-full' : ''} ${ultimo ? 'rounded-r-full' : ''}`
          return (
            <span key={event.id} className={`franja-ausencia ${redondeo}`}>
              <span
                className={`block h-full w-full ${redondeo}`}
                style={{ backgroundColor: eventColor(event, members, kids) }}
              />
            </span>
          )
        })}
      </span>

    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-pressed={isSelected}
      // El día y lo que tiene, en palabras: es lo que sustituye al tooltip que
      // llevaba la celda, y funciona con el dedo y con lector de pantalla. Es
      // también donde se dice cuántas personas están fuera, que la raya no
      // distingue más allá de dos.
      aria-label={`${fecha}, ${resumen}`}
      // Sin relleno lateral: es lo que deja que la raya de dos días seguidos se
      // toque y se lea como un tramo. El número es un círculo de 32 px centrado
      // en una columna de ~52, así que no roza con el vecino.
      // El alto mínimo es de escritorio: sin él la rejilla se queda en una
      // franja estrecha arriba de una pantalla de 900 px, que es lo que la hacía
      // parecer a medio hacer. En móvil manda el contenido, como siempre.
      // `active:` y no solo `hover:` (12-09-2026): con el dedo no hay hover, así
      // que tocar un día no acusaba recibo de nada hasta que la pantalla
      // reaccionaba. Es la mitad táctil de "esto se puede tocar"; la otra mitad
      // es la línea de ayuda que sale debajo de la rejilla mientras no hay
      // ningún día elegido.
      className={`flex w-full flex-col items-center gap-0.5 rounded-xl py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong active:bg-surface ${
        isSelected ? '' : 'hover:bg-canvas'
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${numberClass}`}
      >
        {dayNumber}
      </span>
      {/* Los puntos son el idioma del móvil, donde una celda mide 50 px y un
          título sale como "09:0…". En escritorio la celda pasa de 150 px y ahí
          sí cabe leerlo, así que los puntos dejan sitio a los títulos: la razón
          por la que la celda dejó de escribirlos era el ancho, y a este ancho no
          se aplica. */}
      <span className="lg:hidden">
        <DayActivity marcas={marcas} />
      </span>
      <DayChips festivos={festivos} />
    </button>

      {/* Solo en escritorio. Dos títulos como mucho y el resto contado: una
          celda que crece con lo que tiene descuadra la rejilla entera, y a
          partir del tercero se lee mejor en la agenda de al lado. Las tareas van
          en una línea contada y no una a una: vencen ese día, no ocurren a una
          hora, y su sitio es Tareas. */}
      <div className="mt-0.5 hidden w-full flex-col gap-px px-0.5 lg:flex">
        {planes.slice(0, MAX_TITULOS).map(event => (
          <button
            key={event.id}
            type="button"
            onClick={() => onOpenEvent?.(event)}
            // El doble clic de la celda apunta algo nuevo, y sobre un título eso
            // no es lo que se pide: dos clics aquí son abrir ese evento, así que
            // el gesto se queda en el título y no llega al contenedor.
            onDoubleClick={e => e.stopPropagation()}
            // El nombre accesible, escrito y no heredado del contenido: con la
            // hora en su propio `<span>`, lo que se leía era "9:00Revisión del
            // coche" de corrido. Aquí se dice como se diría: "Revisión del coche,
            // a las 9:00".
            aria-label={event.all_day
              ? event.title
              : `${event.title}, a las ${format(parseISO(event.start_at), 'H:mm')}`}
            /**
             * **El color va al fondo del título, no en un punto aparte**
             * (26-08-2026). El punto de 6 px era una segunda cosa que mirar para
             * decir lo mismo que ya puede decir el propio título, y además
             * obligaba a leer dos elementos por evento en una celda que mide 120
             * px. Con el nombre sobre su color, de un vistazo se ve de quién es
             * cada cosa sin contar puntos.
             *
             * Al 50 %, como las etiquetas de las ausencias y por la misma razón
             * de contraste: mezclado con el fondo ningún color de la paleta
             * admite texto blanco y todos admiten tinta.
             *
             * El botón ocupa el ancho entero: una fila estrecha en la que hay que
             * acertar con el ratón es peor que una fila ancha.
             */
            className="etiqueta-persona flex min-h-5 w-full min-w-0 items-baseline gap-0.5 px-1 text-left text-[10px] leading-tight transition-shadow hover:shadow-sm"
            style={{ backgroundColor: fondoDePersona(eventColor(event, members, kids)) }}
          >
            {/**
              * **La hora, delante del título** (12-09-2026). La celda escribía
              * "Dentista" a secas y había que abrir el día para saber si era a las
              * nueve o a las siete: en un mes, "cuándo" es media pregunta, y es lo
              * primero que escribe cualquier calendario en esta vista.
              *
              * Cabe: la celda mide ~81 px cuando la agenda va al lado, así que va
              * **sin el cero de delante** —"9:00" y no "09:00"—, que es un carácter
              * menos de los pocos que hay, y así se escribe la hora en casa. Va en
              * `tabular-nums` para que las horas queden en columna de una fila a
              * otra, y **sin `flex-shrink`**, porque lo que tiene que ceder ancho
              * cuando el título es largo es el título, que trunca, y no la hora,
              * que dejaría de leerse entera.
              *
              * Los de todo el día no llevan ninguna: no tienen hora que decir, y
              * escribir "Todo el día" gastaría la línea entera para repetir lo que
              * ya dice que no ponga hora. Es lo mismo que hace la agenda.
              */}
            {!event.all_day && (
              <span className="flex-shrink-0 font-black tabular-nums opacity-70">
                {format(parseISO(event.start_at), 'H:mm')}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate">{event.title}</span>
          </button>
        ))}
        {/* **Pulsable** (05-09-2026). Era un `span` con `aria-hidden`: un día con
            cinco planes te decía que había tres que no veías y no ofrecía verlos,
            y había que acordarse de que elegir el día abre `DayPanel` debajo de la
            rejilla. Lo que hace es exactamente eso —elegir el día—, así que no es
            un camino nuevo: es el que ya había, dicho donde surge la pregunta.
            Con `min-h-4` no llega al mínimo de toque, y no le hace falta: es
            escritorio, hay ratón, y la mitad de abajo de la celda hace lo mismo. */}
        {planes.length > MAX_TITULOS && (
          <button
            type="button"
            onClick={() => onSelect(day)}
            onDoubleClick={e => e.stopPropagation()}
            className="min-h-4 rounded pl-2.5 text-left text-[10px] font-bold leading-tight text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong"
          >
            +{planes.length - MAX_TITULOS} más
          </button>
        )}
        {tasks.length > 0 && (
          <span className="pl-2.5 text-[10px] font-bold leading-tight text-muted" aria-hidden>
            {tasks.length} tarea{tasks.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </div>
  )
}
