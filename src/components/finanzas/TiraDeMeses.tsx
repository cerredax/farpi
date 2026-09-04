'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useRef } from 'react'
import { mesCorto } from '@/lib/budgets'
import { capitalize } from '@/lib/text'

interface TiraDeMesesProps {
  /** Los meses que se ofrecen, del más viejo al más nuevo (`mesesNavegables`). */
  meses: string[]
  /** El que se está mirando. Siempre está dentro de `meses`. */
  mes: string
  /** El de hoy, que se marca aunque se esté mirando otro. */
  mesActual: string
  /** Cuáles tienen algo guardado: un plan cerrado o algún apunte. */
  conAlgo: Set<string>
  onElegir: (mes: string) => void
}

/** «Junio 2026». Es el nombre accesible del chip y lo que buscan los tests. */
function nombreLargo(mes: string): string {
  return capitalize(format(parseISO(`${mes}-01`), 'MMMM yyyy', { locale: es }))
}

/**
 * Los meses, en una fila que se arrastra. **Sustituye a las dos flechas**
 * (04-09-2026).
 *
 * Con las flechas se llegaba a cualquier mes y a ninguno de un toque —junio desde
 * septiembre eran tres— y, peor, por el camino no se veía nada: ni dónde estabas
 * dentro de la serie, ni en qué meses había algo que mirar. Una flecha contesta
 * «uno más» y la pregunta era «¿cuál?».
 *
 * **El chip dice si ese mes tiene algo**, en el color: los que tienen plan o
 * apuntes van en `muted` y los vacíos en `faint`. Es información que no cuesta un
 * píxel de más y evita el paseo por meses en blanco. Qué meses se ofrecen y por
 * qué lo decide `mesesNavegables`.
 *
 * **El activo no lleva la píldora verde** de las pestañas de la pantalla, que
 * están cuarenta píxeles más arriba: dos filas de píldoras verdes seguidas se
 * leerían como dos niveles de lo mismo. Aquí el fondo es crema, que es el «estás
 * en esta» del resto de la app sin gritar.
 *
 * **El año no va en el chip** salvo en enero, que es donde el salto importa; lo
 * dice el rótulo grande que hay justo debajo, y siempre, en el nombre accesible.
 *
 * Al entrar y al cambiar de mes el activo se centra **escribiendo `scrollLeft` a
 * mano**. `scrollIntoView` haría lo mismo y además movería el scroll vertical de
 * la página, que aquí es la pantalla entera de Finanzas: se entra a mirar el mes y
 * la vista salta sola.
 */
export function TiraDeMeses({ meses, mes, mesActual, conAlgo, onElegir }: TiraDeMesesProps) {
  const caja = useRef<HTMLDivElement>(null)
  const activo = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const contenedor = caja.current
    const chip = activo.current
    if (!contenedor || !chip) return
    contenedor.scrollLeft = chip.offsetLeft - (contenedor.clientWidth - chip.clientWidth) / 2
  }, [mes, meses])

  return (
    <div
      ref={caja}
      // `-mx-2 px-2`: los chips de los extremos llegan al borde de la tarjeta al
      // arrastrar, en vez de chocar con el relleno y parecer que ahí se acaba.
      className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-1"
    >
      {meses.map(m => {
        const elegido = m === mes
        const enero = m.endsWith('-01')
        // El mes de hoy **nunca sale apagado**, aunque no tenga plan cerrado ni un
        // solo apunte: es el que siempre tiene cuenta —la plantilla viva— y el
        // sitio al que se vuelve. La primera versión lo dejaba en `faint` junto a
        // noviembre y diciembre, y el mes en curso parecía el más vacío de todos.
        const hayQueMirar = conAlgo.has(m) || m === mesActual
        return (
          <button
            key={m}
            ref={elegido ? activo : undefined}
            type="button"
            onClick={() => onElegir(m)}
            aria-label={nombreLargo(m)}
            aria-current={elegido ? 'true' : undefined}
            // `min-h-6` y `min-w-11`: el mínimo de 24 px de la WCAG 2.5.8 que
            // `movil.spec.ts` vigila, con sitio para «sept» y para «ene 27».
            className={`min-h-6 min-w-11 flex-shrink-0 rounded-lg px-2 py-1 text-[11px] transition-colors ${
              elegido
                ? 'bg-canvas font-bold text-ink'
                : m === mesActual
                  // En negrita sin fondo: mirando junio, es lo que dice por dónde
                  // se vuelve, sin necesidad del «Volver a este mes» que se quitó
                  // el 03-09-2026 justo por no saber dónde ponerlo.
                  ? 'font-bold text-muted hover:bg-canvas'
                  : hayQueMirar
                    ? 'font-semibold text-muted hover:bg-canvas'
                    : 'text-faint hover:bg-canvas'
            }`}
          >
            {mesCorto(m)}
            {enero && <span className="ml-0.5">{m.slice(2, 4)}</span>}
          </button>
        )
      })}
    </div>
  )
}
