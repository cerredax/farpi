'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { EmptyState } from '@/components/ui/EmptyState'
import { mediaQueQueda, mesCorto } from '@/lib/budgets'
import { formatCentsCorto } from '@/lib/finanzas'
import { capitalize } from '@/lib/text'
import type { MesDeLaSerie, TrozoDelReparto } from '@/lib/budgets'

interface ResumenPanelProps {
  serie: MesDeLaSerie[]
  reparto: TrozoDelReparto[]
  /** `YYYY-MM` del mes que se está mirando, para señalarlo en la serie. */
  mes: string
  nombreDelMes: string
}

/**
 * Un importe en euros enteros, para las etiquetas que van **dentro** del dibujo.
 *
 * A 9 px, «1.234,56 €» mide más que la columna de un mes y se mete en la del
 * vecino. Redondear al euro deja «1.235 €», que cabe y que como referencia de
 * escala dice lo mismo. Los importes exactos están en la tabla de debajo, que es
 * donde se leen de verdad.
 */
function enEuros(centimos: number): string {
  return formatCentsCorto(Math.round(centimos / 100) * 100)
}

// ─── Cómo van los meses ───────────────────────────────────────────────────────

/**
 * Una barra por mes: **lo que quedó**, hacia arriba si sobró y hacia abajo si no.
 *
 * **Eran entra y sale hasta el 03-09-2026**, dos barras por mes con su leyenda.
 * Dos series para contestar una pregunta de una sola cifra: seis meses en los
 * 318 px que caben a 390 px daban doce barras, y comparar agosto con junio
 * obligaba a mirar cuatro y restar de cabeza. Entra y sale siguen estando,
 * escritos y exactos, en la tabla de debajo, que es donde se leen.
 *
 * Con una sola serie **no hay leyenda**: no hay dos cosas que distinguir. Lo que
 * lleva el mensaje es la posición respecto al cero, y el tono solo acompaña —el
 * verde y el salmón de marca no se distinguen en protanopía (ΔE 2,3), por eso
 * nunca se les pide que distingan nada—.
 *
 * Se etiqueta **el mes más grande** y, si es otro, el que se está mirando. Un
 * número sobre cada barra es ruido y no se lee a 9 px; sin ninguno, no hay escala
 * contra la que medir el resto.
 *
 * El SVG va `aria-hidden` y debajo hay una tabla de verdad, plegada. Es la misma
 * regla de siempre: el dibujo acompaña, los números están escritos.
 */
function QuedaPorMes({ serie, mes }: { serie: MesDeLaSerie[]; mes: string }) {
  const tope = Math.max(...serie.map(m => Math.abs(m.queda)), 1)
  // La columna se estira para llenar la tarjeta —318 px es lo que queda dentro a
  // 390 px— y se para en 72: con cuatro meses, barras estrechas dejaban el dibujo
  // encogido en el centro de un blanco enorme. La barra en cambio no crece más de
  // 32: una columna de 54 px de ancho deja de ser una barra.
  const ANCHO_MES = Math.min(72, Math.floor(318 / serie.length))
  const ANCHO_BARRA = Math.min(32, ANCHO_MES - 14)
  /**
   * Cada lado se lleva su alto **solo si hay algo que pintar ahí**. Con los seis
   * meses en positivo —lo normal en una casa que va cuadrando— reservar los dos
   * lados dejaba media tarjeta en blanco bajo la línea del cero, y el dibujo se
   * leía como si faltara algo. Sin barras hacia abajo el lado de abajo se queda
   * en el hueco justo para la línea y las etiquetas del mes.
   */
  const ALTO = 92
  const hayArriba = serie.some(m => m.queda >= 0)
  const hayAbajo = serie.some(m => m.queda < 0)
  const ALTO_ARRIBA = hayArriba ? (hayAbajo ? ALTO / 2 : ALTO) : 0
  const ALTO_ABAJO = hayAbajo ? (hayArriba ? ALTO / 2 : ALTO) : 0
  /** Hueco arriba y abajo para las cifras que se escriben en el dibujo. */
  const AIRE = 14
  const ancho = serie.length * ANCHO_MES
  const alto = ALTO_ARRIBA + ALTO_ABAJO + AIRE * 2
  const cero = AIRE + ALTO_ARRIBA

  const alturaDe = (v: number) =>
    Math.max(2, Math.round((Math.abs(v) / tope) * (v >= 0 ? ALTO_ARRIBA : ALTO_ABAJO)))
  // El mes más grande en magnitud, y el que se está mirando si sale en la serie.
  // `reduce` y no un `sort`: hay que quedarse con la posición, no con el valor.
  const iMayor = serie.reduce((mejor, m, i) => (Math.abs(m.queda) > Math.abs(serie[mejor].queda) ? i : mejor), 0)
  const iMirado = serie.findIndex(m => m.mes === mes)

  return (
    <>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${ancho} ${alto}`}
          width={ancho}
          height={alto}
          className="mx-auto block"
          aria-hidden
        >
          {/* El mes que se está mirando en «El mes», señalado por detrás: en una
              fila de seis barras iguales, encontrar cuál es septiembre era una
              búsqueda. */}
          {iMirado >= 0 && (
            <rect
              x={iMirado * ANCHO_MES + 2} y="0" width={ANCHO_MES - 4} height={alto}
              rx="8" fill="var(--color-canvas)"
            />
          )}

          {serie.map((m, i) => {
            const centro = i * ANCHO_MES + ANCHO_MES / 2
            const h = alturaDe(m.queda)
            const sobra = m.queda >= 0
            // 1 px de aire sobre el cero, para que la barra no se lea pegada a la
            // línea, y 3 px de radio como el resto de barras de la app.
            const y = sobra ? cero - 1 - h : cero + 1
            const etiquetada = i === iMayor || i === iMirado
            return (
              <g key={m.mes}>
                {/* Los dos `var()` van escritos enteros y no armados con una
                    plantilla: Tailwind v4 solo emite las variables del tema que
                    encuentra **literales** en el código, así que partir el nombre
                    las deja fuera del CSS y el `fill` cae en negro. Pasó justo
                    aquí el 03-09-2026 y solo se vio mirando la pantalla. */}
                <rect
                  x={centro - ANCHO_BARRA / 2} y={y} width={ANCHO_BARRA} height={h}
                  rx="3" fill={sobra ? 'var(--color-chart-entra)' : 'var(--color-chart-sale)'}
                />
                {etiquetada && (
                  <text
                    x={centro} y={sobra ? cero - 5 - h : cero + 12 + h} textAnchor="middle"
                    fontSize="9" fontWeight="700" fill="var(--color-muted)"
                  >
                    {enEuros(m.queda)}
                  </text>
                )}
              </g>
            )
          })}

          <line
            x1="0" y1={cero} x2={ancho} y2={cero}
            stroke="var(--color-line-strong)" strokeWidth="1"
          />
        </svg>

        {/* Bajo la barra solo va el mes. El importe estuvo aquí y no cabe: a 46 px
            «2.087,65 €» se parte en dos líneas y deja el símbolo colgando solo.
            Los números están en la tabla, que es donde se leen de verdad. */}
        <div className="mx-auto flex" style={{ width: ancho }}>
          {serie.map(m => (
            <div key={m.mes} className="text-center" style={{ width: ANCHO_MES }}>
              <p className={`text-[10px] ${m.mes === mes ? 'font-bold text-ink' : 'font-semibold text-muted'}`}>
                {mesCorto(m.mes)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer list-none text-center text-[11px] text-primary-strong">
          Ver los números
        </summary>
        <table className="mt-2 w-full text-[11px]">
          <thead>
            <tr className="text-muted">
              <th scope="col" className="py-1 text-left font-semibold">Mes</th>
              <th scope="col" className="py-1 text-right font-semibold">Entra</th>
              <th scope="col" className="py-1 text-right font-semibold">Sale</th>
              <th scope="col" className="py-1 text-right font-semibold">Queda</th>
            </tr>
          </thead>
          <tbody>
            {serie.map(m => (
              <tr key={m.mes} className="border-t border-hairline">
                <th scope="row" className="py-1 text-left font-normal text-muted">
                  {capitalize(format(parseISO(`${m.mes}-01`), 'LLLL', { locale: es }))}
                </th>
                <td className="py-1 text-right tabular-nums text-ink">{formatCentsCorto(m.entra)}</td>
                <td className="py-1 text-right tabular-nums text-ink">{formatCentsCorto(-m.sale)}</td>
                <td className={`py-1 text-right font-semibold tabular-nums ${m.queda < 0 ? 'text-danger-strong' : 'text-ink'}`}>
                  {formatCentsCorto(m.queda)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}

// ─── En qué se va ─────────────────────────────────────────────────────────────

/**
 * En qué se va el mes: una fila por partida, ordenadas de más a menos.
 *
 * **Era un anillo hasta el 02-09-2026.** Un donut contesta bien «¿esto es la mitad
 * o una esquina?» y mal todo lo demás: con cinco porciones y «Otras», dos partidas
 * parecidas eran dos arcos parecidos, la leyenda iba aparte —había que ir y venir
 * entre el color y el nombre— y en un móvil el dibujo se comía un cuarto de la
 * tarjeta para decir menos que seis filas. Las barras se leen de arriba abajo, en
 * el orden en el que ya venían, con el nombre pegado a su barra.
 *
 * Todas del mismo color, y a propósito: el tamaño ya ordena, y en Farpi el color
 * dice **de quién** es algo — y una partida no es de nadie. Lo que la distingue es
 * su emoji.
 *
 * La barra se mide contra **la partida más grande**, no contra el total: contra el
 * total, un mes repartido entre seis partidas serían seis barras cortas y todas
 * iguales. El peso sobre el total lo dice el porcentaje, que va escrito.
 */
function EnQueSeVa({ reparto }: { reparto: TrozoDelReparto[] }) {
  const total = reparto.reduce((t, r) => t + r.total, 0)
  // El mayor, y no el primero: «Otras» se añade al final aunque sume más que la
  // quinta partida, así que la lista no siempre acaba ordenada del todo.
  const mayor = Math.max(...reparto.map(r => r.total))

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted">
        Se han ido <span className="font-bold text-ink">{formatCentsCorto(total)}</span>
      </p>

      <ul className="space-y-2.5">
        {reparto.map(trozo => (
          <li key={trozo.key} className="space-y-1">
            <div className="flex items-baseline gap-2 text-[11px]">
              {trozo.emoji && <span className="flex-shrink-0" aria-hidden>{trozo.emoji}</span>}
              <span className="min-w-0 flex-1 truncate text-muted">{trozo.nombre}</span>
              <span className="flex-shrink-0 font-bold tabular-nums text-ink">{formatCentsCorto(trozo.total)}</span>
              <span className="w-9 flex-shrink-0 text-right tabular-nums text-faint">{trozo.porcentaje} %</span>
            </div>
            {/* `aria-hidden`: la barra no dice nada que no esté escrito en la
                línea de encima, con el importe exacto y el porcentaje. */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-canvas" aria-hidden>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(3, (trozo.total / mayor) * 100)}%`,
                  backgroundColor: 'var(--color-chart-sale)',
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── La pestaña ───────────────────────────────────────────────────────────────

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titulo} className="space-y-2">
      <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-muted">{titulo}</h2>
      <div className="rounded-2xl border border-surface bg-white px-4 py-4 shadow-sm">{children}</div>
    </section>
  )
}

/**
 * Resumen: los mismos datos de «El mes», dibujados.
 *
 * **Es una pestaña y no un trozo de «El mes»** porque la serie de varios meses no
 * cabe dentro de un mes concreto sin quedar rara, y porque «El mes» es la pantalla
 * del uso diario —apuntar y mirar cuánto queda— y meterle dos gráficos delante
 * pone medio scroll entre quien entra y lo que venía a hacer.
 *
 * El mes del que habla es **el mismo que se esté mirando en «El mes»**, y por eso
 * lo dice en el título del segundo bloque: aquí no hay flechas para cambiarlo, que
 * serían un segundo sitio donde navegar meses.
 *
 * **Cada bloque empieza por la frase y sigue por el dibujo.** Un gráfico contesta
 * «¿cómo de distinto?» y no contesta «¿cuánto?»; la media de lo que queda al mes,
 * o lo que se ha ido en total, son una línea de texto y son lo primero que se
 * quiere saber. El dibujo va detrás, a explicar la forma.
 *
 * **Son dos bloques y no tres desde el 03-09-2026**, y sin pies. Había uno más,
 * «de dónde sale», con dos barras partidas en fijo y apuntado: decía exactamente
 * lo mismo que el desglose de la tarjeta de «El mes» —ingresos fijos, gastos
 * fijos, apuntados, queda— pero dibujado y con su propia leyenda. Y con él se
 * fueron los pies de cada bloque, tres párrafos que explicaban por qué el gráfico
 * era como es: eso es de esta documentación, no de la pantalla, y ocupaban más
 * alto que los dibujos que acompañaban.
 */
export function ResumenPanel({ serie, reparto, mes, nombreDelMes }: ResumenPanelProps) {
  const media = mediaQueQueda(serie)

  return (
    <div className="space-y-5">
      <Bloque titulo="Cómo van los meses">
        {serie.length === 0 ? (
          <EmptyState
            emoji="📈"
            title="Todavía no hay meses que comparar"
            description="En cuanto termine este mes se guardará su foto y aquí empezará a verse la serie."
          />
        ) : (
          <div className="space-y-3">
            {/* Con un solo mes no hay media que sacar: sería el mismo número
                otra vez, dicho como si fuera una conclusión. */}
            {serie.length > 1 && (
              <p className="text-[11px] text-muted">
                {media < 0 ? 'De media se van ' : 'De media quedan '}
                <span className={`font-bold ${media < 0 ? 'text-danger-strong' : 'text-ink'}`}>
                  {formatCentsCorto(Math.abs(media))}
                </span>
                {media < 0 ? ' de más al mes.' : ' al mes.'}
              </p>
            )}
            <QuedaPorMes serie={serie} mes={mes} />
          </div>
        )}
      </Bloque>

      <Bloque titulo={`${nombreDelMes}: en qué se va`}>
        {reparto.length === 0 ? (
          <EmptyState
            emoji="🧾"
            title="Nada gastado este mes"
            description="En cuanto apuntes algún gasto se verá aquí en qué se va."
          />
        ) : (
          <EnQueSeVa reparto={reparto} />
        )}
      </Bloque>
    </div>
  )
}
