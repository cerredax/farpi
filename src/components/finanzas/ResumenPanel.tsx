'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { EmptyState } from '@/components/ui/EmptyState'
import { mediaQueQueda } from '@/lib/budgets'
import { formatCentsCorto } from '@/lib/finanzas'
import { capitalize } from '@/lib/text'
import type { CuentaDelMes, MesDeLaSerie, TrozoDelReparto } from '@/lib/budgets'

interface ResumenPanelProps {
  serie: MesDeLaSerie[]
  reparto: TrozoDelReparto[]
  cuenta: CuentaDelMes
  /** `YYYY-MM` del mes que se está mirando, para señalarlo en la serie. */
  mes: string
  nombreDelMes: string
}

/** El mes en tres letras, que es lo único que cabe bajo una barra a 390 px. */
function mesCorto(mes: string): string {
  return format(parseISO(`${mes}-01`), 'LLL', { locale: es }).replace('.', '')
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
 * Barras divergentes: lo que entra sube del cero y lo que sale baja.
 *
 * **La posición es la que lleva el mensaje, no el color.** Entra y sale no son dos
 * categorías sino los dos lados de una misma cosa, y separarlos por la línea del
 * cero los distingue sin depender de distinguir dos tonos — que en esta paleta,
 * medido, no se distinguen: el verde y el salmón de marca están a ΔE 2,3 en
 * protanopía. Cada barra lleva además su etiqueta.
 *
 * **Qué cambió el 02-09-2026, la segunda vez.** El dibujo era el mismo pero medía
 * 46 px por lado y no llevaba una sola cifra: dos meses parecidos se veían
 * exactamente iguales y no había nada contra lo que medir una barra, así que el
 * gráfico no contestaba nada que no contestara ya la tabla. Ahora:
 *
 * - **el doble de alto**, que es lo que hace visible la diferencia entre meses;
 * - **la barra más grande lleva su cifra escrita**, arriba y abajo, y con ella el
 *   resto tienen escala. Solo esas dos: un número sobre cada barra es ruido y no
 *   se lee (y la tabla ya está debajo);
 * - **el mes que se está mirando va sobre un fondo crema**, en vez de solo con la
 *   etiqueta en negrita. En una fila de seis barras iguales, encontrar cuál es
 *   septiembre era una búsqueda;
 * - **1 px de aire a cada lado del cero**, para que las dos barras de un mes no se
 *   lean como una sola columna partida por una raya.
 *
 * El SVG va `aria-hidden` y debajo hay una tabla de verdad, plegada. Es la misma
 * regla de siempre: el dibujo acompaña, los números están escritos.
 */
function BarrasDeMeses({ serie, mes }: { serie: MesDeLaSerie[]; mes: string }) {
  const tope = Math.max(...serie.map(m => Math.max(m.entra, m.sale)), 1)
  // La columna se estira para llenar la tarjeta —318 px es lo que queda dentro a
  // 390 px— y se para en 72: con cuatro meses, seis barras de 46 px dejaban el
  // dibujo encogido en el centro de un blanco enorme. La barra en cambio no
  // crece más de 28: una columna de 54 px de ancho deja de ser una barra.
  const ANCHO_MES = Math.min(72, Math.floor(318 / serie.length))
  const ANCHO_BARRA = Math.min(28, ANCHO_MES - 16)
  const ALTO_LADO = 52
  /** Hueco arriba y abajo para las dos cifras que se escriben en el dibujo. */
  const AIRE = 14
  const ancho = serie.length * ANCHO_MES
  const alto = ALTO_LADO * 2 + AIRE * 2
  const cero = AIRE + ALTO_LADO

  const alturaDe = (v: number) => Math.max(2, Math.round((v / tope) * ALTO_LADO))
  // Los dos extremos, que son los únicos que se etiquetan. `reduce` y no un
  // `sort`: hay que quedarse con la posición, no con el valor.
  const iEntra = serie.reduce((mejor, m, i) => (m.entra > serie[mejor].entra ? i : mejor), 0)
  const iSale = serie.reduce((mejor, m, i) => (m.sale > serie[mejor].sale ? i : mejor), 0)

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
          {/* El mes que se está mirando en «El mes», señalado por detrás. */}
          {serie.map((m, i) => m.mes === mes && (
            <rect
              key={`fondo-${m.mes}`}
              x={i * ANCHO_MES + 2} y="0" width={ANCHO_MES - 4} height={alto}
              rx="8" fill="var(--color-canvas)"
            />
          ))}

          {serie.map((m, i) => {
            const x = i * ANCHO_MES
            const centro = x + ANCHO_MES / 2
            const hEntra = alturaDe(m.entra)
            const hSale = alturaDe(m.sale)
            return (
              <g key={m.mes}>
                {/* 3 px de radio y ancladas al cero, como el resto de barras de la
                    app. El 1 px de separación del cero es el equivalente del hueco
                    que llevan las barras apiladas de abajo. */}
                <rect
                  x={centro - ANCHO_BARRA / 2} y={cero - 1 - hEntra} width={ANCHO_BARRA} height={hEntra}
                  rx="3" fill="var(--color-chart-entra)"
                />
                <rect
                  x={centro - ANCHO_BARRA / 2} y={cero + 1} width={ANCHO_BARRA} height={hSale}
                  rx="3" fill="var(--color-chart-sale)"
                />
                {i === iEntra && (
                  <text
                    x={centro} y={cero - 5 - hEntra} textAnchor="middle"
                    fontSize="9" fontWeight="700" fill="var(--color-muted)"
                  >
                    {enEuros(m.entra)}
                  </text>
                )}
                {i === iSale && (
                  <text
                    x={centro} y={cero + 12 + hSale} textAnchor="middle"
                    fontSize="9" fontWeight="700" fill="var(--color-muted)"
                  >
                    {enEuros(m.sale)}
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

      {/* Leyenda: con dos series es obligatoria, y aquí además es lo que dice cuál
          es cuál sin depender del color. */}
      <div className="mt-3 flex justify-center gap-4">
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: 'var(--color-chart-entra)' }} aria-hidden />
          Entra
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: 'var(--color-chart-sale)' }} aria-hidden />
          Sale
        </span>
      </div>

      <details className="mt-2">
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

// ─── De dónde sale ────────────────────────────────────────────────────────────

/**
 * Una barra partida en dos: lo que es fijo y lo que se apuntó a mano.
 *
 * Las dos barras del bloque comparten `tope`, que es lo que las hace comparables:
 * el carril gris de detrás mide lo mismo en las dos, así que se ve de un vistazo
 * cuánto le falta a lo que sale para alcanzar a lo que entra.
 */
function BarraPartida({ etiqueta, fijo, apuntado, tope, color }: {
  etiqueta: string
  fijo: number
  apuntado: number
  tope: number
  color: string
}) {
  const pct = (v: number) => (tope === 0 ? 0 : (v / tope) * 100)

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted">{etiqueta}</span>
        <span className="font-bold tabular-nums text-ink">{formatCentsCorto(fijo + apuntado)}</span>
      </div>
      {/* Los 2 px de hueco separan los dos trozos sin necesitar un borde: dos
          verdes pegados se leen como uno. El radio lo pone **el contenedor**, no
          los trozos: con `rounded-full` en cada uno, el de «apuntado» —que suele
          ser estrecho— salía como una bolita suelta al final de la barra. */}
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-canvas" aria-hidden>
        <div style={{ width: `${pct(fijo)}%`, backgroundColor: color }} />
        <div className="opacity-45" style={{ width: `${pct(apuntado)}%`, backgroundColor: color }} />
      </div>
      {/* El pie decía «0 € apuntado nada» cuando no había nada apuntado: el «nada»
          se añadía detrás en vez de sustituir al importe. */}
      <p className="text-[10px] text-faint">
        {apuntado === 0
          ? `${formatCentsCorto(fijo)} de fijos, nada apuntado a mano`
          : `${formatCentsCorto(fijo)} de fijos · ${formatCentsCorto(apuntado)} apuntado`}
      </p>
    </div>
  )
}

/**
 * El bloque entero de «de dónde sale»: las dos barras, qué significa el trozo
 * pálido y la resta.
 *
 * **La leyenda va una vez y no en cada barra.** Lo que distingue los dos trozos de
 * una barra —fijo y apuntado a mano— es lo mismo en las dos, así que explicarlo
 * dos veces era repetir; y la resta de abajo es la conclusión que las dos barras
 * dibujan pero ninguna escribe.
 */
function DeDondeSale({ cuenta }: { cuenta: CuentaDelMes }) {
  const entra = cuenta.ingresosFijos + cuenta.ingresosApuntados
  const sale = cuenta.gastosFijos + cuenta.gastosApuntados
  const tope = Math.max(entra, sale, 1)

  return (
    <div className="space-y-4">
      <BarraPartida
        etiqueta="Entra"
        fijo={cuenta.ingresosFijos}
        apuntado={cuenta.ingresosApuntados}
        tope={tope}
        color="var(--color-chart-entra)"
      />
      <BarraPartida
        etiqueta="Sale"
        fijo={cuenta.gastosFijos}
        apuntado={cuenta.gastosApuntados}
        tope={tope}
        color="var(--color-chart-sale)"
      />

      <div className="flex items-center gap-3 text-[10px] text-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-muted-soft" aria-hidden />
          De fijos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-muted-soft opacity-45" aria-hidden />
          Apuntado a mano
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-3 border-t border-hairline pt-2.5 text-[11px]">
        <span className="font-semibold text-muted">{entra >= sale ? 'Queda' : 'Se ha ido de más'}</span>
        <span className={`font-bold tabular-nums ${entra < sale ? 'text-danger-strong' : 'text-ink'}`}>
          {formatCentsCorto(Math.abs(entra - sale))}
        </span>
      </div>
    </div>
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
 * **Todas las barras son del mismo color, y ahora sí del todo.** El anillo pintaba
 * cada porción con un paso distinto de una rampa de verdes, que era una forma
 * elegante de decir dos veces lo mismo: el tamaño ya ordenaba, y el tono repetía
 * ese orden gastando el único canal libre que quedaba. Un solo color —el mismo
 * «sale» de los otros dos gráficos, porque esto es exactamente el desglose de lo
 * que sale— y la identidad la llevan el emoji y el nombre, que es la regla del
 * proyecto: el color dice **de quién** es algo, y una partida no es de nadie.
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

function Bloque({ titulo, pie, children }: {
  titulo: string
  pie?: string
  children: React.ReactNode
}) {
  return (
    <section aria-label={titulo} className="space-y-2">
      <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-muted">{titulo}</h2>
      <div className="rounded-2xl border border-surface bg-white px-4 py-4 shadow-sm">{children}</div>
      {pie && <p className="px-1 text-[10px] leading-relaxed text-faint">{pie}</p>}
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
 * lo dice en el título de cada bloque: aquí no hay flechas para cambiarlo, que
 * serían un segundo sitio donde navegar meses.
 *
 * **Cada bloque empieza por la frase y sigue por el dibujo.** Un gráfico contesta
 * «¿cómo de distinto?» y no contesta «¿cuánto?»; la media de lo que queda al mes,
 * o lo que se ha ido en total, son una línea de texto y son lo primero que se
 * quiere saber. El dibujo va detrás, a explicar la forma.
 */
export function ResumenPanel({ serie, reparto, cuenta, mes, nombreDelMes }: ResumenPanelProps) {
  const media = mediaQueQueda(serie)

  return (
    <div className="space-y-5">
      <Bloque
        titulo="Cómo van los meses"
        pie="Siempre los últimos meses hasta hoy, mires el mes que mires. Los que nunca llegaron a cerrarse no salen: de esos no se sabe qué había puesto, y una barra a cero diría que no gastasteis nada."
      >
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
            <BarrasDeMeses serie={serie} mes={mes} />
          </div>
        )}
      </Bloque>

      <Bloque titulo={`${nombreDelMes}: de dónde sale`}>
        <DeDondeSale cuenta={cuenta} />
      </Bloque>

      <Bloque
        titulo={`${nombreDelMes}: en qué se va`}
        pie="Todas las barras son del mismo color a propósito: en Farpi el color dice de quién es algo, y una partida no es de nadie. Lo que la distingue es su emoji."
      >
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
