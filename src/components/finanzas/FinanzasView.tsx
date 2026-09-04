'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { BudgetBar } from './BudgetBar'
import { BudgetSheet } from './BudgetSheet'
import { CadaMesPanel } from './CadaMesPanel'
import { CierreDelMes } from './CierreDelMes'
import { CuentaDelMes } from './CuentaDelMes'
import { ExpenseRow } from './ExpenseRow'
import { ExpenseSheet } from './ExpenseSheet'
import { FixedEntrySheet } from './FixedEntrySheet'
import { QuoteGroupCard } from './QuoteGroupCard'
import { QuoteSheet } from './QuoteSheet'
import { ResumenPanel } from './ResumenPanel'
import { useFinanzasState, type PestañaFinanzas } from './useFinanzasState'
import { EmptyState } from '@/components/ui/EmptyState'
import { ViewHeader } from '@/components/ui/ViewHeader'
import { capitalize } from '@/lib/text'

/**
 * Finanzas: qué pasa con el dinero de casa, en tres pestañas.
 *
 * **Por qué tres y no tres pantallas.** Son tres preguntas distintas —«¿con
 * cuánto contamos?», «¿qué ha pasado este mes?», «¿cuánto va a costar esto?»— que
 * comparten materia. Separarlas en la barra de navegación dejaría la app con diez
 * sitios a los que entrar; mezclarlas en una lista haría ilegibles las tres.
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
 * En «Lo fijo» abre un gasto fijo —las nóminas se ponen una vez y son dos, y
 * lo que se añade después son recibos—, y de todos modos el tipo es lo primero que
 * hay dentro del sheet. Las partidas tienen su propio «+» en su bloque.
 *
 * En «Resumen» abre un apunte, igual que en «El mes»: es lo mismo que se está
 * mirando, y un `+` que no hiciera nada sería peor que uno que hace lo obvio.
 */
const ETIQUETA_DE_ALTA: Record<PestañaFinanzas, string> = {
  mes: 'Nuevo apunte',
  resumen: 'Nuevo apunte',
  plantilla: 'Nuevo gasto fijo',
  presupuestos: 'Nuevo presupuesto pedido',
}

export function FinanzasView() {
  const s = useFinanzasState()

  const nombreDelMes = capitalize(format(parseISO(`${s.mes}-01`), 'MMMM yyyy', { locale: es }))

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5 lg:max-w-4xl lg:px-6">
      {/* El `+` va arriba y no flotando abajo, como en Listas, Tareas, Comidas,
          Notas y Documentos. Finanzas era la única que se había quedado con el
          botón flotante, que es justo la divergencia que `ViewHeader` vino a
          cerrar. El resumen cambia con la pestaña porque el `+` también. */}
      <ViewHeader
        resumen={RESUMEN_DE_PESTAÑA[s.pestaña](s)}
        buscador={null}
        // Mirando un mes que aún no ha empezado no hay `+`: las dos pestañas que
        // hablan de un mes concreto —«El mes» y «Resumen»— apuntarían un gasto en
        // octubre desde septiembre, y eso no es un gasto. Las otras dos no tienen
        // mes, así que ahí el botón sigue.
        onAdd={s.esPorVenir && (s.pestaña === 'mes' || s.pestaña === 'resumen')
          ? undefined
          : () => {
            if (s.pestaña === 'plantilla') s.abrirFijoNuevo('gasto')
            else if (s.pestaña === 'presupuestos') s.abrirPedido(null)
            else s.abrirApunte(null)
          }}
        addLabel={ETIQUETA_DE_ALTA[s.pestaña]}
      />

      {/* Mismo patrón de pestañas que Ajustes: se arrastran en móvil y caben
          enteras en escritorio. Con la cuarta ya no caben a 390 px, así que el
          `overflow-x-auto` dejó de ser precaución y es lo que evita el desborde
          que `movil.spec.ts` vigila. */}
      <div
        role="tablist"
        aria-label="Secciones de finanzas"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-x-visible lg:px-0"
      >
        {([
          { key: 'mes', label: 'El mes' },
          { key: 'resumen', label: 'Resumen' },
          { key: 'plantilla', label: 'Lo fijo' },
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
            className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              s.pestaña === p.key ? 'bg-primary text-white' : 'bg-white border border-line text-muted hover:bg-surface'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div id="panel-mes" role="tabpanel" aria-labelledby="tab-mes" hidden={s.pestaña !== 'mes'} className="space-y-5">
        <CuentaDelMes
          cuenta={s.cuenta}
          fijos={s.plantilla.fijos}
          nombreDelMes={nombreDelMes}
          onAnterior={s.mesAnterior}
          onSiguiente={s.mesSiguiente}
          reparto={s.repartoPorPersona}
          copiaVacia={s.copiaVacia}
          previsionAbierta={s.previsionAbierta}
          onVerPrevision={s.alternarPrevision}
          onPonerFijos={() => s.setPestaña('plantilla')}
        />

        {/* Debajo de la tarjeta y no al pie de la pantalla (03-09-2026): es lo
            que se hace con el mes que la tarjeta acaba de resumir, y abajo había
            que pasar por las partidas y por todos los apuntes para encontrarlo. */}
        <CierreDelMes
          nombreDelMes={nombreDelMes}
          sePuedeCerrar={s.sePuedeCerrarYa}
          sePuedeReabrir={s.sePuedeReabrir}
          sePuedePonerACero={s.sePuedePonerACero}
          onCerrar={s.cerrarMesYa}
          onReabrir={s.reabrirMes}
          onPonerACero={s.ponerMesACero}
        />

        {/* En un mes que no ha llegado y sin previsión pedida no se pintan las
            partidas: no hay nada que medir, y un «Sin partidas» invitando a
            repartir un mes que no existe es ruido. Con la previsión abierta
            vuelven, que es lo que se ha ido a ver. */}
        {(!s.esPorVenir || s.previsionAbierta) && (
          <section aria-label="Partidas del mes" className="space-y-2">
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Partidas</h2>
              {/* Solo se ofrece añadir donde las partidas son las vivas: en un mes
                  pasado —cerrado o no— lo que se mira es lo que hubo, y no hay nada
                  que tocar ahí.

                  **Abre el sheet aquí mismo** (03-09-2026). Hasta ese día mandaba a
                  «Lo fijo», por una razón de vocabulario —una partida es de la
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
                  className="-mr-2 flex min-h-6 items-center gap-1 px-2 py-1 text-xs font-bold text-primary-strong"
                >
                  <Plus size={14} strokeWidth={2.6} aria-hidden />
                  Nueva partida
                </button>
              )}
            </div>

            {s.resumen.length === 0 ? (
              <EmptyState
                emoji="🎯"
                title="Sin partidas"
                description={s.planVivo
                  ? 'Reparte el mes en partidas para lo que varía —la compra, el ocio— en «Lo fijo», y aquí verás cuánto llevas de cada una.'
                  : s.planCongelado
                    ? 'Ese mes se cerró sin ninguna partida puesta.'
                    : 'De ese mes no se guardó el plan, así que no se sabe qué partidas había.'}
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
          </section>
        )}

        <section aria-label="El día a día" className="space-y-2">
          <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-muted">
            El día a día {s.delMes.length > 0 && <span className="text-faint">({s.delMes.length})</span>}
          </h2>

          {s.delMes.length === 0 ? (
            <EmptyState
              emoji={s.esPorVenir ? '📆' : '🧾'}
              title={s.esPorVenir
                ? 'Ese mes aún no ha empezado'
                : s.esMesActual ? 'Nada apuntado este mes' : 'Nada apuntado ese mes'}
              description={s.esPorVenir
                ? 'Aquí se apunta lo que ya ha pasado. Cuando llegue el mes, esto se llena.'
                : 'Apunta lo que se va gastando —y lo que entra sin ser fijo— y la cuenta de arriba se mueve sola.'}
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm divide-y divide-hairline">
              {s.delMes.map(apunte => (
                <ExpenseRow
                  key={apunte.id}
                  expense={apunte}
                  budgets={s.budgets}
                  members={s.members}
                  kids={s.kids}
                  onEdit={() => s.abrirApunte(apunte)}
                />
              ))}
            </div>
          )}

          {s.sinPartida.length > 0 && (
            <p className="px-1 text-[11px] text-faint">
              {s.sinPartida.length === 1
                ? 'Hay 1 gasto sin partida: no cuenta para ninguna.'
                : `Hay ${s.sinPartida.length} gastos sin partida: no cuentan para ninguna.`}
            </p>
          )}
        </section>
      </div>

      <div id="panel-resumen" role="tabpanel" aria-labelledby="tab-resumen" hidden={s.pestaña !== 'resumen'}>
        <ResumenPanel
          serie={s.serie}
          reparto={s.reparto}
          mes={s.mes}
          nombreDelMes={nombreDelMes}
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
            description="Apunta lo que te pasen y, si pides otro para lo mismo, saldrán juntos con el más barato marcado."
          />
        ) : (
          s.grupos.map(grupo => (
            <QuoteGroupCard
              key={grupo.titulo}
              grupo={grupo}
              hoy={s.hoy}
              onEdit={quote => s.abrirPedido(quote)}
              onStatus={(id, estado) => s.setQuoteStatus(id, estado)}
            />
          ))
        )}
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

      <ExpenseSheet
        key={s.expenseKey}
        open={s.expenseSheetOpen}
        initial={s.editingExpense}
        // Un apunte nuevo nace hoy si se está mirando este mes; si se está
        // mirando otro, el día 1 de ese, que es lo que se estaba haciendo:
        // rellenar un mes pasado. Poner "hoy" ahí lo colaría en un mes que no se
        // está mirando y desaparecería de la lista al guardarlo.
        fechaPorDefecto={s.esMesActual ? s.hoy : `${s.mes}-01`}
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
    </div>
  )
}
