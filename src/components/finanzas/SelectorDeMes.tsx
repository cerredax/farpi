'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { mesVecino } from '@/lib/budgets'
import { capitalize } from '@/lib/text'

interface SelectorDeMesProps {
  /** `YYYY-MM` del que se mira. */
  mes: string
  /** El de hoy, que se marca en la lista para poder volver. */
  mesActual: string
  /** Los que ofrece la lista, del más viejo al más nuevo (`mesesNavegables`). */
  meses: string[]
  onElegir: (mes: string) => void
}

/** «Junio 2026». Es el rótulo, el nombre accesible y lo que buscan los tests. */
function nombreLargo(mes: string): string {
  return capitalize(format(parseISO(`${mes}-01`), 'MMMM yyyy', { locale: es }))
}

/**
 * Con qué mes se está: dos flechas y el nombre, que **se toca y despliega la
 * lista**.
 *
 * Es lo que tiene el calendario, y por lo mismo: una flecha contesta «uno más» y
 * deja sin contestar «¿cuál?». Con las dos cosas, se recorre con las flechas
 * —que es como se mira el mes de al lado— y se salta con la lista, que es como se
 * va a junio sin dar tres toques.
 *
 * **Hubo una tira de meses unas horas** el 04-09-2026, en lugar de las flechas.
 * Resolvía el salto pero se comía una fila entera de una pantalla de 390 px para
 * un control que se toca poco, y perdía lo que una flecha hace mejor que nada:
 * pasar al mes de al lado sin apuntar a un objetivo pequeño.
 *
 * Dos cosas copiadas de `CalendarHeader`, las dos por su motivo:
 *
 * - **Las flechas no se mueven.** El grupo ocupa el ancho libre y el nombre se
 *   estira dentro, así que la de siguiente cae siempre en el mismo píxel. Si el
 *   grupo se encogiera al texto, «Septiembre 2026» y «Junio 2026» no miden igual y
 *   la flecha bailaría a cada paso: habría que volver a buscarla para dar el
 *   siguiente.
 * - **El menú se cierra con `pointerdown` y no con `click`.** Esperando al clic,
 *   tocar una flecha con el menú abierto la activaría con el menú todavía encima.
 *
 * La lista sale de `mesesNavegables` y **las flechas no**: ellas siguen siendo «el
 * de al lado» y llegan a donde haga falta. Es la diferencia entre recorrer y
 * elegir, y por eso la lista puede ser finita sin encerrar a nadie.
 */
export function SelectorDeMes({ mes, mesActual, meses, onElegir }: SelectorDeMesProps) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

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

  const FLECHA = 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-canvas'

  return (
    <div className="flex items-center justify-between gap-1">
      <button
        type="button"
        onClick={() => onElegir(mesVecino(mes, -1))}
        aria-label="Mes anterior"
        className={FLECHA}
      >
        <ChevronLeft size={18} strokeWidth={2.4} />
      </button>

      <div ref={caja} className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setAbierto(a => !a)}
          aria-haspopup="menu"
          aria-expanded={abierto}
          // `min-h-6`: a 12 px de texto el botón se quedaba en 20 de alto y
          // `movil.spec.ts` lo cazó, que exige los 24 de la WCAG 2.5.8.
          className="flex min-h-6 w-full items-center justify-center gap-1 rounded-lg py-0.5 transition-colors hover:bg-canvas"
        >
          <span className="truncate text-xs font-bold uppercase tracking-widest text-muted">
            {nombreLargo(mes)}
          </span>
          <ChevronDown
            size={13}
            strokeWidth={2.6}
            aria-hidden
            className={`flex-shrink-0 text-faint transition-transform ${abierto ? 'rotate-180' : ''}`}
          />
        </button>

        {abierto && (
          // `max-h` con scroll: la lista crece con los meses que lleve la familia,
          // y a los dos años no cabe en la pantalla. Del más nuevo al más viejo,
          // que es el orden en el que se busca un mes hacia atrás.
          <div
            role="menu"
            aria-label="Elegir mes"
            // `min-w-52` y no menos: «Septiembre 2026» con su «hoy» al lado se
            // partía en dos renglones y la lista dejaba de leerse como una lista.
            className="absolute left-1/2 top-full z-30 mt-1 max-h-64 min-w-52 -translate-x-1/2 overflow-y-auto rounded-2xl border border-surface bg-white py-1 shadow-lg"
          >
            {[...meses].reverse().map(m => (
              <button
                key={m}
                type="button"
                role="menuitemradio"
                aria-checked={m === mes}
                onClick={() => { onElegir(m); setAbierto(false) }}
                className={`flex w-full items-center justify-between gap-3 whitespace-nowrap px-4 py-2 text-left text-sm transition-colors hover:bg-canvas ${
                  m === mes ? 'font-bold text-primary-strong' : 'font-semibold text-ink'
                }`}
              >
                {nombreLargo(m)}
                {/* El de hoy, dicho con una palabra y no solo con un color: es el
                    sitio al que se vuelve y tiene que encontrarse de un vistazo en
                    una lista de nombres que se parecen todos. */}
                {m === mesActual && <span className="flex-shrink-0 text-[11px] font-bold text-muted">hoy</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onElegir(mesVecino(mes, 1))}
        aria-label="Mes siguiente"
        className={FLECHA}
      >
        <ChevronRight size={18} strokeWidth={2.4} />
      </button>
    </div>
  )
}
