'use client'

import { format, parseISO, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { AjusteDelMesSheet } from './AjusteDelMesSheet'
import { BudgetBar } from './BudgetBar'
import { BudgetSheet } from './BudgetSheet'
import { CadaMesPanel } from './CadaMesPanel'
import { CierreDelMes } from './CierreDelMes'
import { CuentaDelMes } from './CuentaDelMes'
import { ExpenseSheet } from './ExpenseSheet'
import { FixedEntrySheet } from './FixedEntrySheet'
import { ListaDeApuntes } from './ListaDeApuntes'
import { QuoteGroupCard } from './QuoteGroupCard'
import { QuoteSheet } from './QuoteSheet'
import { ResumenPanel } from './ResumenPanel'
import { useFinanzasState, type PestañaFinanzas } from './useFinanzasState'
import { EmptyState } from '@/components/ui/EmptyState'
import { ViewHeader } from '@/components/ui/ViewHeader'
import { mesVecino } from '@/lib/budgets'
import { getLocalDateString, parseLocalDate } from '@/lib/date-utils'
import { formatCents } from '@/lib/finanzas'
import { capitalize } from '@/lib/text'

/**
 * Finanzas: qué pasa con el dinero de casa, en cuatro pestañas.
 *
 * **Por qué pestañas y no cuatro pantallas.** Son cuatro preguntas distintas
 * —«¿qué ha pasado este mes?», «¿cómo vamos?», «¿con cuánto contamos?», «¿cuánto
 * va a costar esto?»— que comparten materia. Separarlas en la barra de navegación
 * dejaría la app con diez sitios a los que entrar; mezclarlas en una lista haría
 * ilegibles las cuatro.
 *
 * Y **se ven las cuatro a la vez** desde el 14-09-2026: son una barra segmentada
 * que ocupa el ancho, no cuatro píldoras que se arrastran dejando la última fuera
 * del borde. Un menú de cuatro sitios fijos se enseña entero o no es un menú.
 *
 * **El vocabulario.** «Presupuesto» en español son dos cosas y aquí solo significa
 * una: lo que cuesta algo que aún no has hecho —los tres de la caldera, la
 * reforma del baño—. Lo que se reparte el dinero del mes son **partidas**: la de
 * la compra, la del ocio. Y lo que se apunta a mano es **el día a día**, una fila
 * cada vez, que se llama **apunte** porque el verbo ya era «apuntar» y porque una
 * entrada es un gasto o un ingreso, nunca un presupuesto.
 *
 * «Movimiento» y «tope» estuvieron ahí hasta el 02-09-2026 y se fueron por lo
 * mismo: los dos son palabras de banco. Una casa no tiene movimientos, tiene un
 * día a día; y no se pone un tope a la compra, se le pone una partida.
 *
 * **El mes.** El de hoy al entrar, con flechas para ir atrás. Y cada mes enseña
 * **lo que valía entonces**: el mes en curso refleja la plantilla —cambias un fijo
 * y se ve al momento— y el mes que terminó enseña la copia que se guardó al
 * cerrarlo. Hasta el 02-09-2026 se leían siempre los fijos de hoy, así que mirar
 * mayo enseñaba el alquiler de septiembre.
 *
 * **Hacia delante también se puede ir, pero avisando.** Un mes que no ha empezado
 * enseña lo que quedaría con la plantilla de hoy —para eso sirve mirarlo, para
 * ver si el mes que viene cuadra— y lo dice con esas palabras; lo que no hace es
 * ofrecer apuntar ni cerrar. Hasta el 02-09-2026 octubre se veía exactamente
 * igual que septiembre, con su `+` y su «quedan 2.194 €», y no había forma de
 * saber que se estaba mirando un mes que aún no existe.
 *
 * Nadie cierra nada a mano: lo hace la app al arrancar y el cron diario. Un botón
 * de «cerrar el mes» sería la tarea administrativa que Farpi existe para no pedir,
 * que es la misma razón por la que los fijos no se marcan como pagados.
 *
 * **No sale en Inicio**, igual que Notas y por una razón parecida: Inicio
 * contesta "¿qué tenemos que saber hoy?", y "quedan 758 € este mes" no es de hoy,
 * es del mes. Meterlo ahí convertiría la primera pantalla de la app en un cuadro
 * de mandos, que es justo lo que Farpi no quiere ser.
 */
type EstadoFinanzas = ReturnType<typeof useFinanzasState>

/**
 * Qué dice la cabecera en cada pestaña. Es el hueco de `resumen` de `ViewHeader`,
 * que en las demás pantallas lleva «6 listas de la familia»: aquí no hay una sola
 * cosa que contar, así que cada pestaña cuenta la suya.
 */
const RESUMEN_DE_PESTAÑA: Record<PestañaFinanzas, (s: EstadoFinanzas) => string> = {
  mes: s => `${s.delMes.length} apunte${s.delMes.length === 1 ? '' : 's'} este mes`,
  resumen: s => `${s.serie.length} mes${s.serie.length === 1 ? '' : 'es'} con datos`,
  plantilla: s => `${s.ingresosFijos.length + s.gastosFijos.length} fijos · ${s.partidasPlantilla.length} partidas`,
  presupuestos: s => `${s.grupos.length} trabajo${s.grupos.length === 1 ? '' : 's'} presupuestado${s.grupos.length === 1 ? '' : 's'}`,
}

/**
 * Y qué crea el `+`. Uno solo que hace lo de la pestaña que se mira: tres botones,
 * dos de ellos siempre inactivos, sería peor.
 *
 * En «Fijos» abre un gasto fijo —las nóminas se ponen una vez y son dos, y
 * lo que se añade después son recibos—, y de todos modos el tipo es lo primero que
 * hay dentro del sheet. Las partidas tienen su propio «+» en su bloque.
 *
 * En «Evolución» abre un apunte, igual que en «Este mes»: es lo mismo que se está
 * mirando, y un `+` que no hiciera nada sería peor que uno que hace lo obvio.
 */
const ETIQUETA_DE_ALTA: Record<PestañaFinanzas, string> = {
  mes: 'Nuevo apunte',
  resumen: 'Nuevo apunte',
  plantilla: 'Nuevo gasto fijo',
  presupuestos: 'Nuevo presupuesto pedido',
}

export function FinancesView() {
  const s = useFinanzasState()

  /**
   * Si las partidas están desplegadas. Vive aquí y no en `useFinanzasState`
   * porque no es un dato de la pantalla, es en qué postura la ha dejado quien
   * mira: se abre, se consulta y al salir vuelve a estar plegada, que es como se
   * quiere al entrar. Mismo criterio que `SeccionPlegable` en el calendario.
   *
   * Y **no se cierra al cambiar de mes**: quien la abre suele estar comparando
   * meses —«¿en junio también nos pasamos con la compra?»—, y volver a abrirla en
   * cada salto sería pelearse con la pantalla.
   */
  const [partidasAbiertas, setPartidasAbiertas] = useState(false)

  const nombreDelMes = capitalize(format(parseISO(`${s.mes}-01`), 'MMMM yyyy', { locale: es }))

  /**
   * El rótulo de un día en «El día a día». «Hoy» y «Ayer» tienen nombre y se
   * usan: son los dos días en los que se apunta de verdad, y leer «Sábado 13»
   * para lo que pasó hace un rato obliga a mirar el calendario para saber si eso
   * es hoy.
   *
   * Ayer se saca con `subDays` sobre la fecha local y no restando 86.400.000 ms,
   * que en la madrugada del cambio de hora daría el día equivocado. Es la misma
   * cautela de `date-utils.ts`: un día del calendario no es un instante.
   */
  const ayer = getLocalDateString(subDays(parseLocalDate(s.hoy), 1))
  const rotuloDeDia = (fecha: string) => {
    if (fecha === s.hoy) return 'Hoy'
    if (fecha === ayer) return 'Ayer'
    return capitalize(format(parseISO(fecha), 'EEEE d', { locale: es }))
  }

  /**
   * Y el de un mes en los resultados de una búsqueda, **con el año solo cuando no
   * es el de hoy**, como en la lista de Cumpleaños: «Agosto» es de este año y
   * «Agosto 2025» no, y escribirlo siempre sería repetir cuatro cifras en cada
   * rótulo para el caso que casi nunca pasa.
   */
  const rotuloDeMes = (mes: string) => capitalize(format(
    parseISO(`${mes}-01`),
    mes.slice(0, 4) === s.hoy.slice(0, 4) ? 'MMMM' : 'MMMM yyyy',
    { locale: es },
  ))

  return (
    // Los sheets van fuera del div de la pantalla: lleva `space-y-5`, y ese
    // margen entre hermanos corre hacia arriba el ancla de un `BottomSheet`
    // cerrado —`fixed bottom-0` con `translate-y-full`—, que se queda asomando
    // 20 px por encima de la barra de navegación. Mismo fallo y mismo arreglo
    // que en Inicio (05-09-2026).
    <>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 lg:max-w-4xl lg:px-6">
        {/* El `+` va arriba y no flotando abajo, como en Listas, Tareas, Comidas,
            Notas y Documentos. Finanzas era la única que se había quedado con el
            botón flotante, que es justo la divergencia que `ViewHeader` vino a
            cerrar. El resumen cambia con la pestaña porque el `+` también. */}
        <ViewHeader
          resumen={RESUMEN_DE_PESTAÑA[s.pestaña](s)}
          // **El buscador, solo en «Este mes»** (14-09-2026), que es donde están los
          // apuntes: en «Fijos» hay seis líneas que se leen de un vistazo y en
          // «Evolución» no hay lista que filtrar. Era la única pantalla de
          // contenido de la app que lo tenía apagado a mano, y eso dejaba sin
          // contestar las preguntas que no son de un mes —«¿cuánto llevamos en el
          // dentista?»— salvo yendo mes a mes con la tira.
          buscador={s.pestaña === 'mes' && s.puedeBuscar ? {
            value: s.busqueda,
            onChange: s.setBusqueda,
            placeholder: `Buscar en ${s.totalApuntes} apuntes…`,
            ariaLabel: 'Buscar en los apuntes',
          } : null}
          // El `+` sale en todos los meses, también en los que no han llegado
          // (04-09-2026). Antes no: se daba por hecho que un gasto con fecha de
          // octubre apuntado en septiembre era un recordatorio y no un gasto. Pero
          // el caso normal es el contrario —sabes que en octubre llega el IBI y
          // quieres ver si octubre cuadra contándolo—, y una tarea no suma en la
          // cuenta del mes, así que no contestaba la pregunta.
          onAdd={() => {
            if (s.pestaña === 'plantilla') s.abrirFijoNuevo('gasto')
            else if (s.pestaña === 'presupuestos') s.abrirPedido(null)
            else s.abrirApunte(null)
          }}
          addLabel={ETIQUETA_DE_ALTA[s.pestaña]}
        />

        {/* **Una barra segmentada, no cuatro píldoras sueltas** (14-09-2026).
            Hasta ese día eran cuatro botones con `overflow-x-auto`: a 390 px la
            cuarta se salía del borde y había que arrastrar para verla, así que
            «Presupuestos» era medio invisible y la tira no decía cuántas
            secciones hay. Un menú de cuatro sitios fijos se enseña entero o no es
            un menú.

            **Ocupa el ancho y reparte lo que sobra**, que es lo que deja tenerlas
            las cuatro sin bajar la letra: con `flex-auto` cada una mide lo suyo y
            el hueco restante se reparte a prorrata, en vez de dar cuartos iguales
            —que a 390 px obligaba a bajar a 11 px para que «Presupuestos»
            cupiera—.

            `whitespace-nowrap` porque lo que no puede pasar es que un rótulo
            parta en dos renglones y suba la barra de alto.

            **Y es un segmentado de verdad desde el 14-09-2026, no una pastilla
            verde sobre una caja blanca.** Lo que había —caja blanca con borde y
            la activa en `primary-strong` maciza— era el único verde relleno que
            quedaba en la app: Ajustes se lo quitó el 02-09-2026 y se quedó con el
            tinte. Aquí se va por el otro camino, que es el del control nativo: un
            canal gris (`surface`) y la activa como una **tarjeta blanca con
            sombra**, que es lo que dice «estás aquí» sin pintar nada de color.

            **Los cuatro rótulos van en tinta**, no el activo en tinta y los demás
            en gris, y no es un descuido: `muted` (#6E6861) sobre `surface`
            (#F0EDE8) da 4,24:1, por debajo del 4,5 que pide un texto de 13 px, y
            con `hairline` de canal tampoco llega (4,40:1). Lo que separa al activo
            del resto es la tarjeta y el peso de la letra, que además es
            exactamente lo que hace un segmentado de iOS. Es la regla de la casa
            del 09-09-2026: lo que hay que leer no se apaga con color.

            **En escritorio no se estira** (`lg:w-fit`): ocupar el ancho tiene
            sentido a 390 px, donde el ancho es el que es y repartirlo es lo que
            hace que quepan; a 896 px daría cuatro botones de 220 px para cuatro
            palabras. Es la variante `lg:` de siempre: el valor base no se toca. */}
        <div
          role="tablist"
          aria-label="Secciones de finanzas"
          className="flex gap-1 rounded-2xl bg-surface p-1 lg:w-fit"
        >
          {/* **Cuatro nombres y no cuatro frases** (14-09-2026, pedido). Los de
              antes —«El mes», «Cómo vamos», «Lo fijo», «Presupuestos»— tenían cada
              uno una forma gramatical distinta: artículo y nombre, pregunta,
              adjetivo sustantivado y nombre a secas. Cada uno se había elegido bien
              por su lado y juntos se leían como cuatro ocurrencias en vez de como
              un menú, que es lo que se veía al mirar la barra entera.

              Se pierde algo y consta: «Cómo vamos» nombraba lo que la pestaña
              contesta y «Evolución» nombra lo que enseña, que era justo lo que el
              04-09-2026 se había ido a corregir. A cambio, las cuatro se leen del
              tirón. Las claves no se tocan (`resumen`, `plantilla`): renombrarlas
              no le cambia nada a nadie.

              «Este mes» dice de qué habla la pestaña al entrar, que es el caso
              normal; navegando a agosto el rótulo se queda corto, pero de qué mes
              se está hablando lo dice la tarjeta de debajo con su nombre grande,
              que es donde se mira. */}
          {([
            { key: 'mes', label: 'Este mes' },
            { key: 'resumen', label: 'Evolución' },
            { key: 'plantilla', label: 'Fijos' },
            { key: 'presupuestos', label: 'Presupuestos' },
          ] as { key: PestañaFinanzas; label: string }[]).map(p => (
            <button
              key={p.key}
              type="button"
              role="tab"
              id={`tab-${p.key}`}
              aria-selected={s.pestaña === p.key}
              aria-controls={`panel-${p.key}`}
              onClick={() => s.setPestaña(p.key)}
              className={`min-h-11 flex-auto whitespace-nowrap rounded-xl px-2 text-[13px] text-ink transition-colors ${
                s.pestaña === p.key
                  ? 'bg-white font-bold shadow-sm'
                  : 'font-semibold hover:bg-white/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div id="panel-mes" role="tabpanel" aria-labelledby="tab-mes" hidden={s.pestaña !== 'mes'} className="space-y-5">
          {/* **Lo que se busca manda sobre el mes** (14-09-2026): mientras haya
              algo escrito, esta pestaña enseña lo encontrado y no la cuenta. Es lo
              mismo que hace Documentos con sus categorías —«la búsqueda manda
              sobre el filtro»— y aquí el mes es el filtro: encontrar los dos
              recibos del dentista no puede depender de en qué mes estuvieras
              cuando se te ocurrió buscarlos.

              La cuenta, las partidas y el cierre se van mientras tanto porque son
              de un mes, y lo que se está mirando ya no lo es: dejar «quedan 758 €»
              encima de una lista que cruza julio y septiembre sería una cifra que
              no habla de lo que hay debajo. */}
          {s.buscando ? (
            <section aria-label="Resultados de la búsqueda" className="space-y-5">
              {s.encontrados.length === 0 ? (
                <EmptyState
                  emoji="🔍"
                  title="Sin coincidencias"
                  description={`Ningún apunte con «${s.busqueda.trim()}»`}
                />
              ) : (
                <>
                  {/* La cifra es la mitad de la razón para buscar: «¿cuánto
                      llevamos en el dentista?» no se contesta con una lista. */}
                  <p className="px-1 text-[13px] text-muted">
                    {s.encontrados.length === 1 ? '1 apunte' : `${s.encontrados.length} apuntes`}
                    {' con «'}{s.busqueda.trim()}{'»'}
                    {s.encontrado.gastado > 0 && (
                      <>
                        {'. Se han ido '}
                        <span className="font-bold text-ink">{formatCents(s.encontrado.gastado)}</span>
                      </>
                    )}
                    {s.encontrado.ingresado > 0 && (
                      <>
                        {s.encontrado.gastado > 0 ? ' y entraron ' : '. Entraron '}
                        <span className="font-bold text-primary-strong">{formatCents(s.encontrado.ingresado)}</span>
                      </>
                    )}
                    .
                  </p>

                  <ListaDeApuntes
                    grupos={s.porMeses}
                    rotulo={rotuloDeMes}
                    budgets={s.budgets}
                    members={s.members}
                    kids={s.kids}
                    onEdit={s.abrirApunte}
                  />
                </>
              )}
            </section>
          ) : (
            <>
              <CuentaDelMes
                cuenta={s.cuenta}
                fijos={s.plantilla.fijos}
                nombreDelMes={nombreDelMes}
                meses={s.meses}
                mes={s.mes}
                mesActual={s.mesActual}
                onElegirMes={s.elegirMes}
                reparto={s.repartoPorPersona}
                copiaVacia={s.copiaVacia}
                previsionAbierta={s.previsionAbierta}
                onVerPrevision={s.alternarPrevision}
                onPonerFijos={() => s.setPestaña('plantilla')}
                // Quién se puede tocar lo dice la propia línea: solo las que son el
                // espejo de la plantilla llevan `fixedId`, y las de un mes cerrado no.
                // Lo que abre es el ajuste **de este mes**, no la referencia.
                onAjustarFijo={s.abrirAjusteDelMes}
              />

              {/* En un mes que no ha llegado y sin previsión pedida no se pintan las
                  partidas: no hay nada que medir, y un «Sin partidas» invitando a
                  repartir un mes que no existe es ruido. Con la previsión abierta
                  vuelven, que es lo que se ha ido a ver. */}
              {(!s.esPorVenir || s.previsionAbierta) && (
                <section aria-label="Partidas del mes" className="space-y-2">
                  <div className="flex items-center justify-between gap-3 px-1">
                    {/* **Plegadas al entrar** (14-09-2026, pedido). Ocupaban media
                        pantalla de móvil entre la cuenta del mes y el día a día: con
                        cinco partidas hay que pasar por encima de cinco barras para
                        llegar a lo que se viene a hacer aquí, que es apuntar y mirar
                        lo apuntado. Las partidas se consultan cuando se pregunta por
                        ellas —«¿cuánto queda de la compra?»—, y esa pregunta se hace
                        de vez en cuando; el día a día es de todos los días.

                        Se pliega esto en vez de subir el día a día por encima porque
                        el orden de la pestaña dice algo: la cuenta del mes, cómo se
                        reparte y luego el detalle. Subiendo el día a día, las
                        partidas se quedan al fondo detrás de setenta filas, que es
                        esconderlas más y no menos.

                        El número va en el título porque plegado es lo único que se ve,
                        igual que en «El día a día» de abajo: sin él, la línea no
                        distingue «no hay ninguna» de «hay cinco». */}
                    <h2 className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setPartidasAbiertas(v => !v)}
                        aria-expanded={partidasAbiertas}
                        aria-controls="partidas-del-mes"
                        className="-ml-2 flex min-h-11 items-center gap-1.5 px-2 text-xs font-bold uppercase tracking-widest text-muted transition-colors hover:text-ink"
                      >
                        Partidas
                        {s.resumen.length > 0 && (
                          <span className="tabular-nums">({s.resumen.length})</span>
                        )}
                        <ChevronDown
                          size={14}
                          strokeWidth={2.4}
                          aria-hidden
                          className={`transition-transform ${partidasAbiertas ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </h2>
                    {/* Solo se ofrece añadir donde las partidas son las vivas: en un mes
                        pasado —cerrado o no— lo que se mira es lo que hubo, y no hay nada
                        que tocar ahí.

                        **Abre el sheet aquí mismo** (03-09-2026). Hasta ese día mandaba a
                        «Fijos», por una razón de vocabulario —una partida es de la
                        plantilla y no de un mes, y crearla desde enero haría creer que se
                        está creando en enero— que ya no hace falta defender con un salto de
                        pestaña: de eso se encarga `planVivo`, que es lo que impide que este
                        botón exista en enero. Lo que quedaba era mandar a otra pantalla a
                        quien está mirando sus partidas y quiere una más.

                        `-mr-2` y el relleno vertical: el enlace tenía 16 px de alto y
                        `movil.spec.ts` lo cazó, que exige 24 (WCAG 2.5.8). El margen
                        negativo devuelve el texto a la línea del título para que la
                        zona de toque crezca sin que se note. */}
                    {s.planVivo && (
                      <button
                        type="button"
                        onClick={() => s.abrirPartida(null)}
                        className="-mr-2 flex min-h-11 items-center gap-1 px-2 text-xs font-bold text-primary-strong"
                      >
                        <Plus size={14} strokeWidth={2.6} aria-hidden />
                        Nueva partida
                      </button>
                    )}
                  </div>

                  {partidasAbiertas && (
                    <div id="partidas-del-mes" className="space-y-2">
                      {s.resumen.length === 0 ? (
                        /* Las tres ramas están en el título y no en una descripción
                            debajo, porque no explican para qué sirven las partidas: dicen
                            por qué no hay ninguna, y no es lo mismo un mes al que no se
                            le puso ninguna que uno del que no se guardó el plan. Sin esa
                            distinción, un "Sin partidas" a secas afirmaría algo que no
                            consta. */
                        <EmptyState
                          emoji="🎯"
                          title={s.planVivo
                            ? 'Sin partidas'
                            : s.planCongelado
                              ? 'Ese mes se cerró sin partidas'
                              : 'De ese mes no se guardó el plan'}
                        />
                      ) : (
                        s.resumen.map(r => (
                          <BudgetBar
                            key={r.partida.key}
                            resumen={r}
                            members={s.members}
                            kids={s.kids}
                            onEdit={s.planVivo && r.partida.budgetId
                              ? () => s.abrirPartidaPorId(r.partida.budgetId as string)
                              : undefined}
                            onEditApunte={s.abrirApunte}
                          />
                        ))
                      )}
                    </div>
                  )}
                </section>
              )}

              <section aria-label="El día a día" className="space-y-2">
                <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-muted">
                  El día a día {s.delMes.length > 0 && <span className="text-muted">({s.delMes.length})</span>}
                </h2>

                {/* En un mes que no ha llegado el hueco **invita**, no explica
                    (04-09-2026). Decía «Aquí se apunta lo que ya ha pasado. Cuando llegue
                    el mes, esto se llena», que además de largo ya no es verdad: desde ese
                    día se puede apuntar lo que sabes que va a llegar, y eso es justo para
                    lo que se entra en octubre. */}
                {s.delMes.length === 0 ? (
                  <EmptyState
                    emoji={s.esPorVenir ? '📆' : '🧾'}
                    title={s.esPorVenir
                      ? 'Nada apuntado todavía'
                      : s.esMesActual ? 'Nada apuntado este mes' : 'Nada apuntado ese mes'}
                  />
                ) : (
                  /* Repartido por días desde el 14-09-2026, con la cifra de cada uno.
                     Antes era una sola tarjeta con todas las filas seguidas: setenta
                     renglones iguales en los que la fecha, en gris de 11 px, era lo
                     único que los separaba. */
                  <ListaDeApuntes
                    grupos={s.porDias}
                    rotulo={rotuloDeDia}
                    conFecha={false}
                    budgets={s.budgets}
                    members={s.members}
                    kids={s.kids}
                    onEdit={s.abrirApunte}
                  />
                )}
                {/* Aquí había una nota —«Hay 3 gastos sin partida: no cuentan para
                    ninguna»— y se fue el 04-09-2026. Contaba una consecuencia del sistema
                    en vez de algo que pase en la casa, y estaba todo el rato aunque no
                    hubiera nada que hacer con ella. Lo que dice sigue estando donde
                    importa: en «en qué se va», «Sin partida» sale como un trozo más. */}
              </section>

              {/* **Al pie de la pestaña, lo último de todo** (04-09-2026, pedido).
                  Estuvo pegado debajo de la tarjeta desde el 03-09 con el argumento de
                  que era lo que se hace con el mes que la tarjeta acaba de resumir; la
                  pega de tenerlo ahí es que se cruza en el camino cada vez que se entra
                  a mirar el mes, y cerrar es lo que se hace **cuando has terminado de
                  mirarlo**. Aquí abajo se lee como «he acabado con esto», que es lo que
                  es, y no compite con las partidas ni con el día a día. */}
              <CierreDelMes
                nombreDelMes={nombreDelMes}
                sePuedeCerrar={s.sePuedeCerrarYa}
                sePuedeReabrir={s.sePuedeReabrir}
                sePuedePonerACero={s.sePuedePonerACero}
                onCerrar={s.cerrarMesYa}
                onReabrir={s.reabrirMes}
                onPonerACero={s.ponerMesACero}
              />
            </>
          )}
        </div>

        <div id="panel-resumen" role="tabpanel" aria-labelledby="tab-resumen" hidden={s.pestaña !== 'resumen'}>
          <ResumenPanel
            serie={s.serie}
            reparto={s.reparto}
            mes={s.mes}
            nombreDelMes={nombreDelMes}
            acumulado={s.acumulado}
            ritmo={s.ritmo}
            diaDeHoy={s.diaDeHoy}
            esMesActual={s.esMesActual}
            sePasan={s.sePasan}
            entrada={s.entrada}
            mesAnterior={format(parseISO(`${mesVecino(s.mes, -1)}-01`), 'MMMM', { locale: es })}
          />
        </div>

        {/* Los totales salen de la **plantilla de hoy**, no del mes que se esté
            mirando: esta pestaña no tiene mes. Mirando junio y saltando aquí, lo que
            hay que ver es el alquiler que se paga ahora. */}
        <div id="panel-plantilla" role="tabpanel" aria-labelledby="tab-plantilla" hidden={s.pestaña !== 'plantilla'}>
          <CadaMesPanel
            ingresos={s.ingresosFijos}
            gastos={s.gastosFijos}
            partidas={s.partidasPlantilla}
            totalIngresos={s.totalIngresosFijos}
            totalGastos={s.totalGastosFijos}
            totalPartidas={s.totalPartidas}
            paraElMes={s.totalIngresosFijos - s.totalGastosFijos}
            members={s.members}
            kids={s.kids}
            onNuevoFijo={s.abrirFijoNuevo}
            onEditarFijo={s.abrirFijo}
            onNuevaPartida={() => s.abrirPartida(null)}
            onEditarPartida={s.abrirPartida}
          />
        </div>

        <div
          id="panel-presupuestos"
          role="tabpanel"
          aria-labelledby="tab-presupuestos"
          hidden={s.pestaña !== 'presupuestos'}
          className="space-y-3"
        >
          <p className="px-1 text-xs text-muted">
            Lo que cuesta algo que aún no has hecho: el fontanero, el dentista, la
            reforma. Apunta varios para lo mismo y se comparan solos.
          </p>

          {s.grupos.length === 0 ? (
            <EmptyState
              emoji="📄"
              title="Sin presupuestos pedidos"
            />
          ) : (
            s.grupos.map(grupo => (
              <QuoteGroupCard
                key={grupo.titulo}
                grupo={grupo}
                hoy={s.hoy}
                onEdit={quote => s.abrirPedido(quote)}
                onStatus={(id, estado) => s.setQuoteStatus(id, estado)}
                onApuntar={s.abrirApunteDeUnPresupuesto}
              />
            ))
          )}
        </div>
      </div>

      <FixedEntrySheet
        key={s.fixedKey}
        open={s.fixedSheetOpen}
        initial={s.editingFixed}
        kindPorDefecto={s.kindNuevoFijo}
        onClose={() => s.setFixedSheetOpen(false)}
        onSave={s.guardarFijo}
        onDelete={s.deleteFixedEntry}
      />

      {/* Lo que un fijo costó **en este mes**. Solo se abre desde el desglose de
          «Este mes», y por eso el mes que ajusta es siempre el que se está mirando:
          no hay selector de mes dentro, sería otra pantalla. */}
      <AjusteDelMesSheet
        key={s.ajusteKey}
        open={s.ajusteSheetOpen}
        fijo={s.ajustando}
        nombreDelMes={nombreDelMes}
        onClose={() => s.setAjusteSheetOpen(false)}
        onSave={s.guardarAjuste}
        onQuitar={s.quitarAjuste}
        onEditarFijo={() => s.ajustando?.fixedId && s.abrirFijoPorId(s.ajustando.fixedId)}
      />

      <ExpenseSheet
        key={s.expenseKey}
        open={s.expenseSheetOpen}
        initial={s.editingExpense}
        // Un apunte nuevo nace hoy si se está mirando este mes; si se está
        // mirando otro, el día 1 de ese, que es lo que se estaba haciendo:
        // rellenar un mes pasado. Poner "hoy" ahí lo colaría en un mes que no se
        // está mirando y desaparecería de la lista al guardarlo.
        fechaPorDefecto={s.esMesActual ? s.hoy : `${s.mes}-01`}
        // Lo que se sabe del gasto de un presupuesto aceptado: cuánto y para qué
        // era. La fecha no viaja —el presupuesto no sabe cuándo se paga— y la
        // partida tampoco, que no es algo que un presupuesto tenga.
        empezado={s.apunteDeUnPresupuesto}
        budgets={s.budgets}
        onClose={() => s.setExpenseSheetOpen(false)}
        onSave={s.guardarApunte}
        onDelete={s.deleteExpense}
      />

      <BudgetSheet
        key={s.budgetKey}
        open={s.budgetSheetOpen}
        initial={s.editingBudget}
        onClose={() => s.setBudgetSheetOpen(false)}
        onSave={s.guardarPartida}
        onDelete={s.deleteBudget}
      />

      <QuoteSheet
        key={s.quoteKey}
        open={s.quoteSheetOpen}
        initial={s.editingQuote}
        titulos={s.titulos}
        onClose={() => s.setQuoteSheetOpen(false)}
        onSave={s.guardarPedido}
        onDelete={s.deleteQuote}
      />
    </>
  )
}
