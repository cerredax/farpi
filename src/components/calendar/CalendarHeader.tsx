'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

/**
 * La cabecera del calendario: dónde estás, cómo moverte, qué enseñar y cómo
 * añadir. **Una sola fila** desde el 28-08-2026, en móvil y en escritorio.
 *
 * Es una sola cabecera para las dos columnas de escritorio, no una por columna.
 * Antes vivía dentro de la tarjeta del mes, y el `+` estaba repetido en la
 * agenda: dos botones con el mismo nombre a dos alturas distintas.
 *
 * De izquierda a derecha: la flecha de atrás, el título, la de adelante, el
 * selector de vista y el `+`. Lo que cambia entre móvil y escritorio es solo el
 * selector —un desplegable allí, tres pastillas aquí—, y el porqué está en
 * `SelectorDeVista`.
 *
 * Lo que hubo y ya no: **el rótulo como botón para plegar el mes** (25-08-2026),
 * que se fue al entrar la vista Mes en móvil el 26-08-2026 porque eran dos
 * maneras de pedir lo mismo.
 */

/**
 * Qué enseña el calendario.
 *
 * En escritorio son tres, el trio de Google. En móvil son cuatro: se le añade
 * **Agenda**, la lista continua, que ahí es la vista de partida y la que contesta
 * "¿qué hay?" sin pedir nada.
 */
export type VistaCalendario = 'agenda' | 'dia' | 'semana' | 'mes'

const NOMBRES: Record<VistaCalendario, string> = {
  agenda: 'Agenda', dia: 'Día', semana: 'Semana', mes: 'Mes',
}

/**
 * El selector de vista en móvil: **un botón que dice cuál está puesta** y
 * despliega las cuatro (28-08-2026).
 *
 * Antes era una banda de cuatro pastillas a todo el ancho, debajo del título.
 * Se leía bien, pero se comía ~48 px de una pantalla de 390, todo el rato, para
 * un control que se toca una vez cada mucho.
 *
 * Se descartó ponerlas en la fila del título **con iconos**: los cuatro son "un
 * calendario con algo dentro" y no se distinguen, y además no caben —las cuatro
 * pastillas dejarían al título unos 110 px, la mitad de lo que necesita "31 de
 * ago – 6 de septiembre"—, así que las flechas volverían a bailar a cada paso,
 * que es justo lo que se arregló esa misma semana.
 *
 * Un solo botón sí cabe y no hay nada que adivinar. Es lo que hace Google
 * Calendar en el móvil. En escritorio no cambia nada: allí las tres pastillas
 * caben de sobra en la fila y verlas todas a la vez no cuesta nada.
 */
function SelectorDeVista({ vista, vistas, onVista }: {
  vista: VistaCalendario
  vistas: VistaCalendario[]
  onVista: (vista: VistaCalendario) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  // Cerrar al tocar fuera y con Escape. `pointerdown` y no `click`: si se
  // esperara al clic, tocar otro botón de la cabecera lo activaría con el menú
  // todavía abierto encima.
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false)
    }
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', escape)
    }
  }, [abierto])

  return (
    <div ref={caja} className="relative flex-shrink-0 lg:hidden">
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="flex h-10 items-center gap-1 rounded-2xl bg-surface px-3 text-sm font-bold text-ink transition-colors active:bg-line"
      >
        {NOMBRES[vista]}
        <ChevronDown size={16} strokeWidth={2.5} className={`text-muted transition-transform ${abierto ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label="Qué enseña el calendario"
          className="absolute right-0 top-full z-30 mt-1 min-w-36 overflow-hidden rounded-2xl border border-surface bg-white py-1 shadow-lg"
        >
          {vistas.map(valor => (
            <button
              key={valor}
              type="button"
              role="menuitemradio"
              aria-checked={vista === valor}
              onClick={() => { onVista(valor); setAbierto(false) }}
              className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-bold transition-colors active:bg-surface ${
                vista === valor ? 'text-primary-strong' : 'text-ink'
              }`}
            >
              {NOMBRES[valor]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface CalendarHeaderProps {
  /**
   * Qué estás mirando, escrito: el mes, la semana o el día.
   *
   * Lo calcula `CalendarView`, que es quien sabe la vista. Antes se sacaba aquí
   * del mes y siempre ponía "Agosto 2026", también mirando una semana: las
   * flechas parecían de mes y no había forma de saber en qué semana estabas.
   */
  titulo: string
  vista: VistaCalendario
  onVista: (vista: VistaCalendario) => void
  /** Qué vistas se ofrecen. Móvil y escritorio no ofrecen las mismas. */
  vistas: VistaCalendario[]
  /** Qué recorren las flechas, para su etiqueta accesible: "Semana anterior". */
  unidad: string
  onPrev: () => void
  onNext: () => void
  onAdd: () => void
}

export function CalendarHeader({ titulo, vista, onVista, vistas, unidad, onPrev, onNext, onAdd }: CalendarHeaderProps) {

  const FLECHA = 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-line active:bg-grip'

  const anterior = (
    <button type="button" onClick={onPrev} aria-label={`${unidad} anterior`} className={FLECHA}>
      <ChevronLeft size={20} strokeWidth={2} />
    </button>
  )
  const siguiente = (
    <button type="button" onClick={onNext} aria-label={`${unidad} siguiente`} className={FLECHA}>
      <ChevronRight size={20} strokeWidth={2} />
    </button>
  )

  return (
    <div className="px-4 pt-3 lg:px-0 lg:pt-0">
      {/* Una sola fila para las dos versiones: el título con sus flechas y, a la
          derecha, el selector y el `+`. El plegable del mes se fue al entrar la
          vista Mes en móvil (26-08-2026): eran dos maneras de pedir lo mismo. */}
      <div className="flex items-center justify-between gap-2">
        {/**
          * **Las flechas no se mueven de sitio** (28-08-2026). El grupo ocupa el
          * ancho libre y el título se estira dentro, así que la izquierda y la
          * derecha caen siempre en el mismo píxel. Antes el grupo se encogía a
          * lo que midiera el texto, y como el texto cambia en cada paso —"Lunes,
          * 1 de septiembre" y luego "Martes, 2 de septiembre", o el mes y la
          * semana, que no miden igual— la flecha de siguiente se desplazaba a
          * cada toque: había que volver a buscarla para dar el paso siguiente.
          *
          * En escritorio el grupo se topa a 24 rem para no dejar la flecha en
          * mitad de una pantalla de 1440 px. Ahí caben todos los títulos que
          * escribe `CalendarView`, así que el ancho es fijo también.
          */}
        <div className="flex min-w-0 flex-1 items-center gap-0.5 lg:max-w-sm">
          {anterior}
          <h2 className="min-w-0 flex-1 truncate px-1 text-base font-extrabold tracking-tight text-ink">{titulo}</h2>
          {siguiente}
        </div>

        {/* En escritorio el selector va en esta misma fila, a la derecha, que es
            donde estaba y donde cabe: tres pestañas y sitio de sobra. */}
        <div className="ml-auto hidden gap-1 rounded-2xl bg-surface p-1 lg:flex">
          {vistas.map(valor => (
            <button
              key={valor}
              type="button"
              onClick={() => onVista(valor)}
              aria-pressed={vista === valor}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                vista === valor ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {NOMBRES[valor]}
            </button>
          ))}
        </div>

        <SelectorDeVista vista={vista} vistas={vistas} onVista={onVista} />

        <button
          type="button"
          onClick={onAdd}
          aria-label="Apuntar algo"
          className="ml-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md transition-all hover:bg-primary-hover active:scale-95 lg:ml-2"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
