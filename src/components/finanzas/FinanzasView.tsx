'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { BudgetBar } from './BudgetBar'
import { BudgetSheet } from './BudgetSheet'
import { CuentaDelMes } from './CuentaDelMes'
import { ExpenseRow } from './ExpenseRow'
import { ExpenseSheet } from './ExpenseSheet'
import { FixedEntrySheet } from './FixedEntrySheet'
import { MesTipoPanel } from './MesTipoPanel'
import { QuoteGroupCard } from './QuoteGroupCard'
import { QuoteSheet } from './QuoteSheet'
import { useFinanzasState, type PestañaFinanzas } from './useFinanzasState'
import { EmptyState } from '@/components/ui/EmptyState'
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
 * Nadie cierra nada a mano: lo hace la app al arrancar y el cron diario. Un botón
 * de «cerrar el mes» sería la tarea administrativa que Farpi existe para no pedir,
 * que es la misma razón por la que los fijos no se marcan como pagados.
 *
 * **No sale en Inicio**, igual que Notas y por una razón parecida: Inicio
 * contesta "¿qué tenemos que saber hoy?", y "quedan 758 € este mes" no es de hoy,
 * es del mes. Meterlo ahí convertiría la primera pantalla de la app en un cuadro
 * de mandos, que es justo lo que Farpi no quiere ser.
 */
export function FinanzasView() {
  const s = useFinanzasState()

  const nombreDelMes = capitalize(format(parseISO(`${s.mes}-01`), 'MMMM yyyy', { locale: es }))

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5 lg:max-w-4xl lg:px-6">
      {/* Mismo patrón de pestañas que Ajustes: se arrastran en móvil y caben
          enteras en escritorio. */}
      <div role="tablist" aria-label="Secciones de finanzas" className="flex gap-2">
        {([
          { key: 'mes', label: 'El mes' },
          { key: 'plantilla', label: 'El mes tipo' },
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
          nombreDelMes={nombreDelMes}
          esMesActual={s.esMesActual}
          onAnterior={s.mesAnterior}
          onSiguiente={s.mesSiguiente}
          onVolverAHoy={s.volverAHoy}
          reparto={s.reparto}
          onPonerFijos={() => s.setPestaña('plantilla')}
        />

        <section aria-label="Partidas del mes" className="space-y-2">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Partidas</h2>
            {/* En un mes cerrado no se ofrece añadir: lo que se está mirando es la
                copia de un mes que terminó. El enlace lleva a la plantilla y no
                abre el sheet aquí, porque una partida es del mes tipo y no de un
                mes — abrirla desde enero haría creer que se está creando en enero.

                `-mr-2` y el relleno vertical: el enlace tenía 16 px de alto y
                `movil.spec.ts` lo cazó, que exige 24 (WCAG 2.5.8). El margen
                negativo devuelve el texto a la línea del título para que la
                zona de toque crezca sin que se note. */}
            {s.esMesEditable && (
              <button
                type="button"
                onClick={() => s.setPestaña('plantilla')}
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
              description={s.esMesEditable
                ? 'Reparte el mes en partidas para lo que varía —la compra, el ocio— en «El mes tipo», y aquí verás cuánto llevas de cada una.'
                : 'Ese mes se cerró sin ninguna partida puesta.'}
            />
          ) : (
            s.resumen.map(r => (
              <BudgetBar
                key={r.partida.key}
                resumen={r}
                onEdit={s.esMesEditable && r.partida.budgetId
                  ? () => s.abrirPartidaPorId(r.partida.budgetId as string)
                  : undefined}
              />
            ))
          )}
        </section>

        <section aria-label="El día a día" className="space-y-2">
          <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-muted">
            El día a día {s.delMes.length > 0 && <span className="text-faint">({s.delMes.length})</span>}
          </h2>

          {s.delMes.length === 0 ? (
            <EmptyState
              emoji="🧾"
              title={s.esMesActual ? 'Nada apuntado este mes' : 'Nada apuntado ese mes'}
              description="Apunta lo que se va gastando —y lo que entra sin ser fijo— y la cuenta de arriba se mueve sola."
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

      {/* Los totales salen de la **plantilla de hoy**, no del mes que se esté
          mirando: esta pestaña no tiene mes. Mirando junio y saltando aquí, lo que
          hay que ver es el alquiler que se paga ahora. */}
      <div id="panel-plantilla" role="tabpanel" aria-labelledby="tab-plantilla" hidden={s.pestaña !== 'plantilla'}>
        <MesTipoPanel
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

      {/* El botón de alta es uno y hace lo de la pestaña que se está mirando. Un
          `+` que significara siempre lo mismo obligaría a tener tres, y dos
          estarían inactivos en todo momento.

          En «El mes tipo» abre un gasto fijo: las nóminas se ponen una vez y son
          dos, y lo que se va añadiendo después son recibos. De todos modos el tipo
          es lo primero que hay dentro del sheet, así que corregirlo es un toque, y
          las partidas tienen su propio «+» en su bloque.

          **En un mes cerrado no hay botón.** Apuntar un gasto en enero desde la
          pantalla de enero es justo lo que este cambio vino a impedir; para
          apuntar algo se vuelve a este mes, que está a un toque en la tarjeta. */}
      {!(s.pestaña === 'mes' && !s.esMesEditable) && (
        <button
          type="button"
          onClick={() => {
            if (s.pestaña === 'mes') s.abrirApunte(null)
            else if (s.pestaña === 'plantilla') s.abrirFijoNuevo('gasto')
            else s.abrirPedido(null)
          }}
          aria-label={
            s.pestaña === 'mes' ? 'Nuevo apunte'
              : s.pestaña === 'plantilla' ? 'Nuevo gasto fijo'
                : 'Nuevo presupuesto pedido'
          }
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary-hover lg:bottom-8 lg:right-8"
        >
          <Plus size={24} strokeWidth={2.4} />
        </button>
      )}

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
