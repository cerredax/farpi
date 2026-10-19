'use client'

import { format, parseISO } from 'date-fns'
import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { BetaBadge } from '@/components/ui/BetaBadge'
import { ArrowLeft, FileText, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/lib/store-context'
import { mesDe, plantillaDelMes } from '@/lib/budgets'
import { getLocalDateString } from '@/lib/date-utils'
import { formatCents } from '@/lib/finanzas'
import { leerArchivoDeExtracto } from '@/lib/extractos'
import { useIdioma, useT } from '@/lib/i18n/contexto'
import { localeDeFechas } from '@/lib/i18n/fechas'
import { resumenDeRevision, revisarExtracto, type FilaDeRevision } from '@/lib/importacion'
import { capitalize } from '@/lib/text'

/**
 * Traer el extracto del banco a «El día a día».
 *
 * **Pantalla propia y no un sheet**: aquí se revisan decenas de filas de una
 * sentada, y eso no cabe en una hoja que sube desde abajo. Se entra desde «Este
 * mes», que es donde estaba la pregunta, y se vuelve al terminar.
 *
 * Lo que hace, en orden: se lee el fichero, se cuadra con lo que el propio banco
 * dice de él, se marca lo que es un gasto de la casa y se desmarca lo que ya
 * está contado en otro sitio, con el motivo escrito. **Nada entra sin que
 * alguien lo confirme.** La razón está en `src/lib/importacion.ts`: la cuenta del
 * mes ya suma los fijos, así que apuntar la nómina otra vez la contaría dos
 * veces.
 *
 * El trabajo de verdad no está aquí sino en `n43.ts`, `extractos.ts` e
 * `importacion.ts`, que se prueban sin navegador. Esto es el sitio donde se tocan
 * las casillas.
 */
export function ImportarExtracto() {
  const { budgets, expenses, fixedEntries, fixedOverrides, monthPlans, createExpenses, isSaving } = useStore()
  const t = useT().finanzas
  const locale = localeDeFechas(useIdioma())

  const [nombreDelArchivo, setNombreDelArchivo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [avisos, setAvisos] = useState<string[]>([])
  const [filas, setFilas] = useState<FilaDeRevision[]>([])
  const [apuntados, setApuntados] = useState<number | null>(null)
  const archivoRef = useRef<HTMLInputElement>(null)

  const hoy = getLocalDateString()
  const mesActual = mesDe(hoy)

  // Las huellas de lo que ya entró de otro extracto. Sale de los apuntes que hay
  // en la familia, que es el único sitio donde queda constancia.
  const huellasApuntadas = useMemo(
    () => new Set(expenses.map(apunte => apunte.import_ref).filter((ref): ref is string => ref !== null)),
    [expenses],
  )

  async function elegirArchivo(archivo: File) {
    setApuntados(null)
    setNombreDelArchivo(archivo.name)

    const lectura = await leerArchivoDeExtracto(new Uint8Array(await archivo.arrayBuffer()), t.extracto)
    if (!lectura.ok) {
      setError(lectura.error)
      setAvisos([])
      setFilas([])
      return
    }

    // Los fijos que se comparan son los de **los meses que toca el extracto**, no
    // los de hoy: un extracto de agosto que se importa en septiembre tiene que
    // mirar el alquiler de agosto.
    const meses = new Set(lectura.extracto.cuentas.flatMap(cuenta => cuenta.movimientos.map(m => mesDe(m.fecha))))
    const fijos = [...meses].flatMap(mes =>
      plantillaDelMes(mes, mesActual, fixedEntries, fixedOverrides, budgets, monthPlans).fijos)

    setError(null)
    setAvisos(lectura.extracto.avisos)
    setFilas(revisarExtracto(lectura.extracto, {
      apuntes: expenses, huellasApuntadas, fijos, partidas: budgets, textos: t.importar.revision,
    }))
  }

  function marcar(huella: string, marcada: boolean) {
    setFilas(filas.map(fila => (fila.huella === huella ? { ...fila, marcada } : fila)))
  }

  function ponerPartida(huella: string, budgetId: string | null) {
    setFilas(filas.map(fila => (fila.huella === huella ? { ...fila, budgetId } : fila)))
  }

  async function apuntar() {
    const entran = filas.filter(fila => fila.marcada)
    if (entran.length === 0) return

    const cuantos = await createExpenses(entran.map(fila => ({
      kind: fila.movimiento.kind,
      // `createExpense` espera lo que se teclea, no céntimos: el importe pasa por
      // `parseAmountToCents` en el mismo sitio que el del formulario, que es lo
      // que hace que «12,50» valga igual venga de donde venga.
      amount: (fila.movimiento.amountCents / 100).toFixed(2).replace('.', ','),
      date: fila.movimiento.fecha,
      description: fila.descripcion,
      budget_id: fila.movimiento.kind === 'ingreso' ? null : fila.budgetId,
      child_id: null,
      member_id: null,
      import_ref: fila.huella,
    })))

    if (cuantos === null) return
    setApuntados(cuantos)
    setFilas([])
    setAvisos([])
    setNombreDelArchivo(null)
  }

  const resumen = resumenDeRevision(filas)
  const porDia = agrupaPorDia(filas)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-4">
      <div className="flex items-center gap-2">
        <Link
          href="/finances"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
          aria-label={t.importar.volver}
        >
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-base font-bold text-ink">{t.diaADia.traerExtracto}</h2>
        <BetaBadge />
      </div>

      {filas.length === 0 && (
        <div className="space-y-4">
          {apuntados !== null && (
            <p className="rounded-2xl border border-primary-line bg-primary-tint px-4 py-3 text-sm font-semibold text-ink">
              {apuntados === 0
                ? t.importar.ningunoEntro
                : t.importar.yaApuntados(apuntados)}
            </p>
          )}

          <div className="rounded-2xl border border-line bg-white px-4 py-6 text-center">
            <FileText size={28} className="mx-auto mb-3 text-muted" aria-hidden />
            <p className="text-base font-bold text-ink">{t.importar.eligeArchivo}</p>
            {/* Dónde está el archivo es lo único que hay que saber para usar esta
                pantalla, y no se puede adivinar: va aquí y no en la ayuda. */}
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              {t.importar.ayuda}
            </p>
          </div>

          {/* Un botón de verdad que abre el selector, y el `input` escondido con
              `hidden`. Con el input visible pero en `sr-only` mide 1×1 px, y eso
              es un control por debajo del mínimo táctil: lo cazaría
              `e2e/movil.spec.ts`, y con razón. */}
          <Button fullWidth size="lg" onClick={() => archivoRef.current?.click()}>
            {t.importar.elegirBoton}
          </Button>
          <input
            ref={archivoRef}
            type="file"
            // Los bancos lo dan con muchas extensiones distintas —.n43, .q43,
            // .txt— y algunos sin ninguna, así que no se filtra por extensión:
            // quien lo valida es el propio lector, que distingue la norma, el
            // .txt del Sabadell y el Excel del BBVA por lo que llevan dentro.
            className="hidden"
            onChange={event => {
              const archivo = event.target.files?.[0]
              if (archivo) void elegirArchivo(archivo)
              // Para poder volver a elegir el mismo archivo si algo salió mal.
              event.target.value = ''
            }}
          />

          {error && (
            <p className="rounded-2xl border border-danger-line bg-danger-soft px-4 py-3 text-sm text-ink">
              <span className="font-semibold">{nombreDelArchivo}</span>: {error}
            </p>
          )}
        </div>
      )}

      {filas.length > 0 && (
        <>
          {avisos.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-sand bg-warm px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-ink">
                <TriangleAlert size={16} aria-hidden /> {t.importar.miraEsto}
              </p>
              {avisos.map(aviso => (
                <p key={aviso} className="text-xs text-ink">{aviso}</p>
              ))}
            </div>
          )}

          <p className="text-xs text-muted">
            {t.importar.enElArchivo(resumen.total)}
            {resumen.cubiertosPorFijo > 0 && t.importar.cubiertosPorFijo(resumen.cubiertosPorFijo)}
            {resumen.yaApuntados > 0 && t.importar.yaEstabanApuntados(resumen.yaApuntados)}
            {resumen.traspasos > 0 && t.importar.traspasos(resumen.traspasos)}
          </p>

          {porDia.map(([dia, delDia]) => (
            <section key={dia} className="space-y-2">
              <h3 className="px-1 text-xs font-bold uppercase tracking-widest text-muted">
                {capitalize(format(parseISO(dia), t.fechas.diaLargo, { locale }))}
              </h3>

              <ul className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm divide-y divide-hairline">
                {delDia.map(fila => (
                  <li key={fila.huella} className="flex items-start gap-3 px-3 py-2.5">
                    <label className="flex min-h-11 min-w-11 flex-shrink-0 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        checked={fila.marcada}
                        onChange={event => marcar(fila.huella, event.target.checked)}
                        className="h-5 w-5 accent-[var(--color-primary-strong)]"
                        aria-label={t.importar.apuntarAria(fila.descripcion || t.importar.esteMovimiento, formatCents(fila.movimiento.amountCents))}
                      />
                    </label>

                    <div className="min-w-0 flex-1 py-1.5">
                      <p className="truncate text-sm font-semibold text-ink">
                        {fila.descripcion || t.importar.movimiento}
                      </p>
                      {fila.explicacion && (
                        <p className="mt-0.5 text-[11px] text-muted">{fila.explicacion}</p>
                      )}
                      {fila.marcada && fila.movimiento.kind === 'gasto' && budgets.length > 0 && (
                        <select
                          value={fila.budgetId ?? ''}
                          onChange={event => ponerPartida(fila.huella, event.target.value || null)}
                          aria-label={t.importar.partidaAria(fila.descripcion || t.importar.esteMovimiento)}
                          className="mt-1.5 min-h-11 w-full max-w-[12rem] rounded-xl border border-line bg-canvas px-2 text-xs text-ink"
                        >
                          <option value="">{t.apunte.sinPartida}</option>
                          {budgets.map(partida => (
                            <option key={partida.id} value={partida.id}>
                              {partida.emoji ? `${partida.emoji} ` : ''}{partida.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <p className={`flex-shrink-0 py-1.5 text-sm font-bold tabular-nums ${fila.movimiento.kind === 'ingreso' ? 'text-primary-strong' : 'text-ink'}`}>
                      {fila.movimiento.kind === 'ingreso' ? '+' : ''}{formatCents(fila.movimiento.amountCents)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="space-y-2 pt-2">
            <Button fullWidth size="lg" onClick={() => void apuntar()} disabled={isSaving || resumen.entran === 0}>
              {resumen.entran === 0
                ? t.importar.ninguno
                : t.importar.apuntarN(resumen.entran)}
            </Button>
            <Button fullWidth variant="ghost" onClick={() => { setFilas([]); setAvisos([]); setNombreDelArchivo(null) }}>
              {t.importar.dejarlo}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

/** Las filas por días, en el orden del banco. */
function agrupaPorDia(filas: FilaDeRevision[]): [string, FilaDeRevision[]][] {
  const dias = new Map<string, FilaDeRevision[]>()
  for (const fila of filas) {
    dias.set(fila.movimiento.fecha, [...(dias.get(fila.movimiento.fecha) ?? []), fila])
  }
  return [...dias.entries()].sort(([a], [b]) => a.localeCompare(b))
}
