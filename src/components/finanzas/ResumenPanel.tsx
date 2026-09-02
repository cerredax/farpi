'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { EmptyState } from '@/components/ui/EmptyState'
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

/**
 * Los seis pasos de la rampa, **del más oscuro al más claro** (ver `globals.css`).
 *
 * En ese orden y no al revés porque el reparto viene ordenado de mayor a menor, y
 * en una rampa secuencial lo más oscuro es lo que más pesa. Al derecho, la porción
 * grande salía en el verde más pálido y la miga de «Sin partida» en el más
 * intenso, que es exactamente lo contrario de lo que la vista entiende.
 */
const RAMPA = [
  'var(--color-chart-ramp-6)',
  'var(--color-chart-ramp-5)',
  'var(--color-chart-ramp-4)',
  'var(--color-chart-ramp-3)',
  'var(--color-chart-ramp-2)',
  'var(--color-chart-ramp-1)',
]

/** El mes en tres letras, que es lo único que cabe bajo una barra a 390 px. */
function mesCorto(mes: string): string {
  return format(parseISO(`${mes}-01`), 'LLL', { locale: es }).replace('.', '')
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
 * El SVG va `aria-hidden` y debajo hay una tabla de verdad, plegada. Es la misma
 * regla de siempre: el dibujo acompaña, los números están escritos.
 */
function BarrasDeMeses({ serie, mes }: { serie: MesDeLaSerie[]; mes: string }) {
  const tope = Math.max(...serie.map(m => Math.max(m.entra, m.sale)), 1)
  const ANCHO_MES = 44
  const ALTO_LADO = 46
  const ancho = serie.length * ANCHO_MES
  const alto = ALTO_LADO * 2

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
          {serie.map((m, i) => {
            const x = i * ANCHO_MES
            const hEntra = Math.max(2, Math.round((m.entra / tope) * (ALTO_LADO - 6)))
            const hSale = Math.max(2, Math.round((m.sale / tope) * (ALTO_LADO - 6)))
            return (
              <g key={m.mes}>
                {/* 4 px de radio arriba y anclada al cero, como el resto de barras
                    de la app. Los 6 px de hueco entre las dos columnas evitan que
                    dos meses seguidos se lean como una sola mancha. */}
                <rect
                  x={x + 6} y={ALTO_LADO - hEntra} width={ANCHO_MES - 18} height={hEntra}
                  rx="3" fill="var(--color-chart-entra)"
                />
                <rect
                  x={x + 6} y={ALTO_LADO} width={ANCHO_MES - 18} height={hSale}
                  rx="3" fill="var(--color-chart-sale)"
                />
              </g>
            )
          })}
          <line
            x1="0" y1={ALTO_LADO} x2={ancho} y2={ALTO_LADO}
            stroke="var(--color-line-strong)" strokeWidth="1"
          />
        </svg>

        {/* Bajo la barra solo va el mes. El importe estuvo aquí y no cabe: a 44 px
            «2.087,65 €» se parte en dos líneas y deja el símbolo colgando solo.
            Los números están en la tabla, que es donde se leen de verdad.

            El mes que se está mirando en «El mes» va en tinta fuerte, para que se
            vea dónde cae dentro de la serie. */}
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

/** Una barra partida en dos: lo que es fijo y lo que se apuntó a mano. */
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
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-canvas" aria-hidden>
        <div style={{ width: `${pct(fijo)}%`, backgroundColor: color }} />
        <div className="opacity-45" style={{ width: `${pct(apuntado)}%`, backgroundColor: color }} />
      </div>
      <p className="text-[10px] text-faint">
        {formatCentsCorto(fijo)} de fijos · {formatCentsCorto(apuntado)} apuntado
        {apuntado === 0 ? ' nada' : ''}
      </p>
    </div>
  )
}

// ─── En qué se va ─────────────────────────────────────────────────────────────

/** Un arco del anillo, en coordenadas de una circunferencia de radio `r`. */
function arco(desde: number, hasta: number, r: number): string {
  const p = (t: number) => [
    50 + r * Math.cos(2 * Math.PI * t - Math.PI / 2),
    50 + r * Math.sin(2 * Math.PI * t - Math.PI / 2),
  ]
  const [x1, y1] = p(desde)
  const [x2, y2] = p(hasta)
  return `M ${x1} ${y1} A ${r} ${r} 0 ${hasta - desde > 0.5 ? 1 : 0} 1 ${x2} ${y2}`
}

/**
 * El anillo de «en qué se va».
 *
 * **Todas las porciones son del mismo verde, en distinta claridad.** No es una
 * paleta categórica y no debe serlo: en Farpi el color dice **de quién** es algo, y
 * una partida no es de nadie —es la razón por la que una partida lleva emoji y no
 * color—. Dar un tono a cada una las haría indistinguibles de una persona en la
 * misma pantalla donde sí hay personas. Aquí el verde solo ordena por cuánto, que
 * es lo que hace una rampa secuencial, y la identidad la llevan el emoji y el
 * nombre de la leyenda.
 */
function Anillo({ reparto }: { reparto: TrozoDelReparto[] }) {
  const total = reparto.reduce((t, r) => t + r.total, 0)

  // Dónde empieza y acaba cada arco. Se calcula con un `reduce` que no toca nada
  // de fuera: acumular en una variable dentro del `map` es mutar durante el
  // render, y el lint lo para con razón —funciona hasta que React repinta a
  // medias—.
  const arcos = reparto.reduce<{ trozo: TrozoDelReparto; desde: number; hasta: number; color: string }[]>(
    (acc, trozo, i) => {
      const desde = acc.length === 0 ? 0 : acc[acc.length - 1].hasta
      return [...acc, {
        trozo,
        desde,
        hasta: desde + trozo.total / total,
        color: RAMPA[Math.min(i, RAMPA.length - 1)],
      }]
    },
    [],
  )

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 flex-shrink-0" aria-hidden>
        {/* El hueco de 0,004 de vuelta es el equivalente circular de los 2 px
            entre barras: sin él, dos pasos seguidos de la rampa se funden. */}
        {arcos.map(({ trozo, desde, hasta, color }) => (
          <path
            key={trozo.key}
            d={arco(desde + 0.004, hasta - 0.004, 40)}
            fill="none"
            stroke={color}
            strokeWidth="16"
          />
        ))}
      </svg>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {reparto.map((trozo, i) => (
          <li key={trozo.key} className="flex items-baseline gap-2 text-[11px]">
            <span
              className="h-2 w-2 flex-shrink-0 translate-y-px rounded-sm"
              style={{ backgroundColor: RAMPA[Math.min(i, RAMPA.length - 1)] }}
              aria-hidden
            />
            {trozo.emoji && <span className="flex-shrink-0" aria-hidden>{trozo.emoji}</span>}
            <span className="min-w-0 flex-1 truncate text-muted">{trozo.nombre}</span>
            <span className="flex-shrink-0 font-bold tabular-nums text-ink">{formatCentsCorto(trozo.total)}</span>
            <span className="w-8 flex-shrink-0 text-right tabular-nums text-faint">{trozo.porcentaje} %</span>
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
 */
export function ResumenPanel({ serie, reparto, cuenta, mes, nombreDelMes }: ResumenPanelProps) {
  const topeBarras = Math.max(
    cuenta.ingresosFijos + cuenta.ingresosApuntados,
    cuenta.gastosFijos + cuenta.gastosApuntados,
    1,
  )

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
          <BarrasDeMeses serie={serie} mes={mes} />
        )}
      </Bloque>

      <Bloque titulo={`${nombreDelMes}: de dónde sale`}>
        <div className="space-y-4">
          <BarraPartida
            etiqueta="Entra"
            fijo={cuenta.ingresosFijos}
            apuntado={cuenta.ingresosApuntados}
            tope={topeBarras}
            color="var(--color-chart-entra)"
          />
          <BarraPartida
            etiqueta="Sale"
            fijo={cuenta.gastosFijos}
            apuntado={cuenta.gastosApuntados}
            tope={topeBarras}
            color="var(--color-chart-sale)"
          />
        </div>
      </Bloque>

      <Bloque
        titulo={`${nombreDelMes}: en qué se va`}
        pie="Todas las porciones son del mismo verde a propósito: en Farpi el color dice de quién es algo, y una partida no es de nadie. Lo que la distingue es su emoji."
      >
        {reparto.length === 0 ? (
          <EmptyState
            emoji="🧾"
            title="Nada gastado este mes"
            description="En cuanto apuntes algún gasto se verá aquí en qué se va."
          />
        ) : (
          <Anillo reparto={reparto} />
        )}
      </Bloque>
    </div>
  )
}
