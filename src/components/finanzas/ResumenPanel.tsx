'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { EmptyState } from '@/components/ui/EmptyState'
import { mediaQueQueda, mesCorto } from '@/lib/budgets'
import { formatCentsCorto } from '@/lib/finanzas'
import { capitalize } from '@/lib/text'
import type {
  MesDeLaSerie, PartidaQueSePasa, RepartoDeLoQueEntra, TrozoDelReparto,
} from '@/lib/budgets'

interface ResumenPanelProps {
  serie: MesDeLaSerie[]
  reparto: TrozoDelReparto[]
  /** `YYYY-MM` del mes que se está mirando, para señalarlo en la serie. */
  mes: string
  nombreDelMes: string
  /** Lo gastado acumulado día a día en el mes en curso, y el ritmo de siempre. */
  acumulado: number[]
  ritmo: number[]
  /** Qué día es hoy, del 1 al 31. Es hasta dónde llega la línea de este mes. */
  diaDeHoy: number
  /** Si lo que se mira es el mes en curso: solo entonces hay ritmo que juzgar. */
  esMesActual: boolean
  /** Las que se pasan más veces de las que no. */
  sePasan: PartidaQueSePasa[]
  /** En qué se reparte lo que entra, o `null` si no entra nada. */
  entrada: RepartoDeLoQueEntra | null
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

// ─── ¿Cómo va el mes? ─────────────────────────────────────────────────────────

/**
 * Lo que llevas gastado, día a día, contra lo que sueles llevar.
 *
 * **Es el bloque que contesta la pregunta de mitad de mes** —«¿voy bien o voy
 * rápido?»— y hasta el 04-09-2026 no la contestaba nadie: «El mes» dice cuánto
 * queda, que es un saldo, no un ritmo. Un saldo bueno el día 5 y el mismo saldo el
 * día 25 son dos meses distintos.
 *
 * **Dos líneas y no una.** Una sola dice cuánto llevas y no dice lo único que
 * importa, que es si eso es mucho para esta casa. La de este mes se corta en hoy
 * —dibujarla hasta fin de mes la dejaría plana y parecería que se ha dejado de
 * gastar—; la habitual sigue hasta el final, porque es a donde se va a llegar.
 *
 * El ritmo va en gris y punteado a propósito: **no es un dato del mes**, es una
 * referencia. Con los dos trazos del mismo peso, el ojo no sabe cuál mirar.
 *
 * `aria-hidden` y la frase encima con las dos cifras exactas, como el resto de los
 * gráficos de la app: el dibujo dice la forma y el texto dice el número.
 */
function RitmoDelMes({ acumulado, ritmo, diaDeHoy }: {
  acumulado: number[]
  ritmo: number[]
  diaDeHoy: number
}) {
  const dias = acumulado.length
  const hasta = Math.min(diaDeHoy, dias)
  const llevas = acumulado[hasta - 1] ?? 0
  const sueles = ritmo[hasta - 1] ?? 0

  const ANCHO = 300
  const ALTO = 96
  // La escala la manda el mayor de los dos al acabar el mes, no el de hoy: si se
  // reescalara cada día, la línea de este mes tocaría siempre el techo y las dos
  // parecerían iguales pase lo que pase.
  const tope = Math.max(acumulado[dias - 1], ritmo[Math.min(dias, ritmo.length) - 1], 1)
  const x = (dia: number) => ((dia - 1) / (dias - 1)) * ANCHO
  const y = (valor: number) => ALTO - (valor / tope) * ALTO

  const trazo = (valores: number[], hastaDia: number) =>
    valores.slice(0, hastaDia).map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i + 1).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted">
        A día {hasta} llevas <span className="font-bold text-ink">{formatCentsCorto(llevas)}</span>.
        {' '}A estas alturas sueles llevar {formatCentsCorto(sueles)}.
      </p>

      <svg viewBox={`0 0 ${ANCHO} ${ALTO + 16}`} className="w-full" aria-hidden>
        {/* Lo habitual, por detrás: es el suelo contra el que se lee la otra. */}
        <path
          d={trazo(ritmo, dias)}
          fill="none"
          stroke="var(--color-line-strong)"
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
        <path
          d={trazo(acumulado, hasta)}
          fill="none"
          stroke="var(--color-chart-sale)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* El punto de hoy: sin él, la línea cortada parece un dibujo a medias. */}
        <circle cx={x(hasta)} cy={y(llevas)} r="3.5" fill="var(--color-chart-sale)" />

        <text x="0" y={ALTO + 13} fontSize="9" fontWeight="600" fill="var(--color-faint)">1</text>
        <text x={ANCHO} y={ALTO + 13} textAnchor="end" fontSize="9" fontWeight="600" fill="var(--color-faint)">
          {dias}
        </text>
      </svg>

      {/* Leyenda escrita: son dos series y aquí el color **sí** las distingue, así
          que hay que decir cuál es cuál con palabras. Es la excepción que confirma
          la regla del resto de gráficos, donde no hay leyenda porque no hay dos
          cosas que separar. */}
      <div className="flex justify-center gap-4 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-chart-sale" aria-hidden />
          Este mes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-line-strong" aria-hidden />
          Lo de siempre
        </span>
      </div>
    </div>
  )
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
  // **El mejor y el peor**, no «el mayor en magnitud» (04-09-2026). Con todos los
  // meses en positivo —lo normal en una casa que va cuadrando— aquel etiquetaba
  // siempre el mejor y nunca el peor, que es el que se quiere encontrar. `reduce` y
  // no un `sort`: hay que quedarse con la posición, no con el valor.
  const iMejor = serie.reduce((mejor, m, i) => (m.queda > serie[mejor].queda ? i : mejor), 0)
  const iPeor = serie.reduce((peor, m, i) => (m.queda < serie[peor].queda ? i : peor), 0)
  const iMirado = serie.findIndex(m => m.mes === mes)
  // La media, **dibujada** y no solo escrita encima. Sin ella hay que comparar seis
  // alturas de memoria para saber qué mes se salió de lo normal, que es justo lo
  // que un gráfico tendría que ahorrar. Con un solo mes no se pinta: la media
  // sería la propia barra.
  const media = mediaQueQueda(serie)
  const yMedia = cero - (media / tope) * (media >= 0 ? ALTO_ARRIBA : -ALTO_ABAJO)

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
            const etiquetada = i === iMejor || i === iPeor || i === iMirado
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

          {/* La media, por encima de las barras para que se lea contra ellas.
              Punteada y en el gris de los bordes: es una referencia, no un mes. */}
          {serie.length > 1 && (
            <line
              x1="0" y1={yMedia} x2={ancho} y2={yMedia}
              stroke="var(--color-muted-soft)" strokeWidth="1" strokeDasharray="3 3"
            />
          )}
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
 *
 * **Cada fila dice cuánto ha cambiado** desde el 04-09-2026. «Compra 291 €» es una
 * foto; «Compra 291 €, +18% que el mes pasado» es una señal, y es lo que hace que
 * mirar aquí sirva para algo más que confirmar lo que ya sabías. Cuando no hay con
 * qué comparar no se escribe nada: `null` no es cero, y un «+100%» en la primera
 * vez que se gasta en algo sería ruido con pinta de dato.
 *
 * El signo lo lleva el texto y no solo el color, como siempre en esta app: un «+»
 * delante se lee sin distinguir el verde del salmón.
 */
function EnQueSeVa({ reparto, sePasan }: {
  reparto: TrozoDelReparto[]
  sePasan: PartidaQueSePasa[]
}) {
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
              {trozo.variacion !== null && (
                <span className={`flex-shrink-0 font-semibold tabular-nums ${
                  trozo.variacion > 0 ? 'text-chart-sale' : 'text-primary-strong'
                }`}>
                  {trozo.variacion > 0 ? '+' : ''}{trozo.variacion} %
                </span>
              )}
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

      {/* Lo único de toda la pestaña que señala algo **que se puede arreglar**, y
          por eso está: no habla de este mes, habla de que el límite está mal
          puesto. Se escribe «3 de los últimos 4» y no «casi siempre» para que
          quien lo lee juzgue por su cuenta; un adverbio ahí suena a regañina. */}
      {sePasan.length > 0 && (
        <p className="border-t border-hairline pt-2.5 text-[11px] text-muted">
          {sePasan.map(p => (
            <span key={p.nombre} className="block">
              <span className="font-semibold text-ink">{p.nombre}</span> se pasó {p.veces} de
              los últimos {p.de} meses.
            </span>
          ))}
        </p>
      )}
    </div>
  )
}

// ─── De cada 100 € que entran ─────────────────────────────────────────────────

/**
 * En qué se reparte **lo que entra**: los fijos, las partidas, lo demás y lo que
 * sobra.
 *
 * Es la única del panel que cambia el denominador, y ahí está su valor: el resto
 * dice cuánto sale y en qué, y ninguna contesta «¿cuánto de lo que ganamos se lo
 * lleva el alquiler?». Esa proporción no se deduce de las cifras sueltas y es la
 * que apenas cambia de un mes a otro, así que es la que dice cómo está montada
 * esta casa.
 *
 * **Cuatro segmentos con dos colores**, que son los dos que hay. Los tres de gasto
 * son el mismo `sale` con la opacidad bajando, y lo que queda es `entra`. La
 * opacidad separa por claridad y no por tono, así que aguanta en protanopía —que
 * es justo por lo que la paleta de gráficos tiene dos colores y no seis—, y de
 * todos modos el color no lleva el mensaje solo: las cuatro cifras van escritas
 * debajo con su porcentaje.
 *
 * **Un mes que se fue de las manos no se dibuja partido.** Con `queda` negativo no
 * hay proporción que repartir —lo que sale no cabe en lo que entra— así que la
 * barra se llena de gasto y el exceso se dice con palabras, que es la regla de
 * siempre en esta pantalla.
 */
function DeCadaCien({ entrada }: { entrada: RepartoDeLoQueEntra }) {
  const { entra, gastosFijos, enPartidas, otrosGastos, queda } = entrada
  const trozos = [
    { key: 'fijos', nombre: 'Gastos fijos', valor: gastosFijos, color: 'var(--color-chart-sale)', opacidad: 1 },
    { key: 'partidas', nombre: 'Partidas', valor: enPartidas, color: 'var(--color-chart-sale)', opacidad: 0.7 },
    { key: 'otros', nombre: 'Lo demás', valor: otrosGastos, color: 'var(--color-chart-sale)', opacidad: 0.4 },
    { key: 'queda', nombre: 'Queda', valor: queda, color: 'var(--color-chart-entra)', opacidad: 1 },
  ].filter(t => t.valor > 0)

  // El ancho se reparte sobre lo que se pinta, no sobre lo que entra: en un mes
  // pasado de vueltas «queda» está fuera y los tres de gasto tienen que llenar la
  // barra igual, o quedaría un hueco que no significa nada.
  const pintado = trozos.reduce((total, t) => total + t.valor, 0) || 1

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted">
        Entran <span className="font-bold text-ink">{formatCentsCorto(entra)}</span>
        {queda < 0
          ? <> y se van <span className="font-bold text-danger-strong">{formatCentsCorto(-queda)}</span> de más.</>
          : <> y se queda el <span className="font-bold text-ink">{Math.round((queda / entra) * 100)} %</span>.</>}
      </p>

      <div className="flex h-4 w-full overflow-hidden rounded-full bg-canvas" aria-hidden>
        {trozos.map(t => (
          <div
            key={t.key}
            style={{ width: `${(t.valor / pintado) * 100}%`, backgroundColor: t.color, opacity: t.opacidad }}
          />
        ))}
      </div>

      <ul className="space-y-1.5">
        {trozos.map(t => (
          <li key={t.key} className="flex items-baseline gap-2 text-[11px]">
            <span
              className="h-2 w-2 flex-shrink-0 self-center rounded-sm"
              style={{ backgroundColor: t.color, opacity: t.opacidad }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-muted">{t.nombre}</span>
            <span className="flex-shrink-0 font-bold tabular-nums text-ink">{formatCentsCorto(t.valor)}</span>
            <span className="w-9 flex-shrink-0 text-right tabular-nums text-faint">
              {Math.round((t.valor / entra) * 100)} %
            </span>
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
 * «Cómo vamos»: cuatro preguntas sobre el dinero de la casa, cada una con su
 * cifra y su dibujo.
 *
 * **Se llamaba «Resumen» hasta el 04-09-2026**, y el nombre sobraba por dos
 * motivos: no resumía nada que no estuviera ya en «El mes», y prometía un resumen
 * donde lo que hay son respuestas. La clave interna sigue siendo `resumen` y el
 * archivo conserva su nombre, como `CadaMesPanel`: renombrarlos no le cambia nada
 * a nadie y rompe el historial del archivo.
 *
 * **Es una pestaña y no un trozo de «El mes»** porque la serie de varios meses no
 * cabe dentro de un mes concreto sin quedar rara, y porque «El mes» es la pantalla
 * del uso diario —apuntar y mirar cuánto queda— y meterle cuatro gráficos delante
 * pone un scroll entero entre quien entra y lo que venía a hacer.
 *
 * **Las cuatro preguntas, y por qué esas cuatro.** El criterio no fue «qué se
 * puede dibujar» sino «qué se pregunta una casa y hoy no contesta nadie»:
 *
 * 1. *¿Voy bien este mes?* — el ritmo, contra el de siempre. Era el hueco grande:
 *    «El mes» da un saldo, y un saldo bueno el día 5 y el mismo el día 25 son dos
 *    meses distintos. Solo sale en el mes en curso, que es cuando la pregunta
 *    tiene sentido.
 * 2. *¿Estamos ahorrando más que antes?* — la serie de lo que quedó, con la media
 *    dibujada y el mejor y el peor señalados.
 * 3. *¿En qué se va, y qué ha cambiado?* — el desglose por partida, ahora con la
 *    variación frente al mes pasado y con las partidas que se pasan a menudo.
 * 4. *¿Cómo está montada esta casa?* — en qué se reparte lo que entra. Es la única
 *    que cambia el denominador, y por eso dice algo que las otras tres no pueden.
 *
 * Se descartaron dos que parecían buenas. **El reparto por persona a lo largo del
 * tiempo**, porque en cuanto una app de casa acumula quién ha puesto más deja de
 * ser una app de casa y empieza a ser una cuenta pendiente — es la misma decisión
 * que ya impide los saldos en «El mes». Y **la estacionalidad**, que con cuatro
 * meses de datos sería una línea entre dos puntos disfrazada de tendencia.
 *
 * **Cada bloque empieza por la frase y sigue por el dibujo.** Un gráfico contesta
 * «¿cómo de distinto?» y no contesta «¿cuánto?»; la cifra va primero porque es lo
 * primero que se quiere saber, y el dibujo detrás, a explicar la forma. Ninguno
 * lleva pie: por qué el gráfico es como es se cuenta aquí, no en la pantalla.
 *
 * Salvo el primero, todos hablan **del mes que se esté mirando en «El mes»**, y por
 * eso lo dicen en su título: aquí no hay selector, que sería un segundo sitio donde
 * navegar meses.
 */
export function ResumenPanel({
  serie, reparto, mes, nombreDelMes, acumulado, ritmo, diaDeHoy, esMesActual,
  sePasan, entrada,
}: ResumenPanelProps) {
  const media = mediaQueQueda(serie)
  // El ritmo solo se enseña donde significa algo: en el mes en curso y habiendo
  // meses cerrados con los que compararse. En un mes cerrado la pregunta «¿voy
  // bien?» ya no tiene respuesta que sirva, y sin referencia una línea sola no
  // dice si vas rápido.
  const hayRitmo = esMesActual && ritmo.length > 0 && acumulado.length > 0

  return (
    <div className="space-y-5">
      {hayRitmo && (
        <Bloque titulo="Cómo va el mes">
          <RitmoDelMes acumulado={acumulado} ritmo={ritmo} diaDeHoy={diaDeHoy} />
        </Bloque>
      )}

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
          <EnQueSeVa reparto={reparto} sePasan={sePasan} />
        )}
      </Bloque>

      {/* Sin nada que entre no hay proporción que dar, y el bloque no se pinta en
          vez de enseñar un hueco: es lo que pasa en un mes sin fijos puestos, que
          ya tiene su propio aviso en «El mes». */}
      {entrada && (
        <Bloque titulo={`${nombreDelMes}: de cada 100 € que entran`}>
          <DeCadaCien entrada={entrada} />
        </Bloque>
      )}
    </div>
  )
}
