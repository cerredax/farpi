'use client'

import { Field } from '@/components/ui/Field'
import { SelectChip } from '@/components/ui/SelectChip'
import { useT } from '@/lib/i18n/contexto'
import type { useEventSheet } from './useEventSheet'

// De lunes a domingo → getDay(): lunes=1 … domingo=0. La letra de cada uno sale de `iniciales`.
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]

// Sin el ref: aquí no hay campo que enfocar al abrir, y arrastrarlo haría que
// cualquier `s.loQueSea` contara como leer un ref durante el render.
type EstadoSheet = Omit<ReturnType<typeof useEventSheet>, 'firstFieldRef'>

/**
 * La parte de "esto se repite": el selector, los días, hasta cuándo y la vista
 * previa que dice cuántos eventos van a salir.
 *
 * Solo aparece al crear. Editar una serie entera desde aquí obligaría a decidir
 * qué pasa con las ocurrencias ya tocadas a mano, y cada evento se edita por
 * separado a propósito.
 */
export function EventRecurrenceFields({ s }: { s: EstadoSheet }) {
  const t = useT().calendario
  return (
    <div className="space-y-3">
      <label className="field-label">{t.repeticion.titulo}</label>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1">
        {([
          { valor: 'none' as const, etiqueta: t.repeticion.opciones.none, onClick: s.setNone },
          { valor: 'weekly' as const, etiqueta: t.repeticion.opciones.weekly, onClick: s.setWeekly },
          { valor: 'yearly' as const, etiqueta: t.repeticion.opciones.yearly, onClick: s.setYearly },
        ]).map(({ valor, etiqueta, onClick }) => (
          <button
            key={valor}
            type="button"
            onClick={onClick}
            className={`flex min-h-11 items-center justify-center rounded-xl px-2 text-xs font-bold transition-colors ${
              s.recurrence === valor ? 'bg-white text-ink shadow-sm' : 'text-muted'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {s.recurrence === 'weekly' && (
        <div className="space-y-4">
          <Field label={t.repeticion.repetirLosDias} spacing="group">
            <div className="flex gap-1">
              {WEEKDAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => s.toggleWeekday(day)}
                  className={`h-11 flex-1 rounded-xl text-xs font-black transition-colors ${
                    s.recurrenceWeekdays.includes(day)
                      ? 'bg-primary-strong text-white'
                      : 'bg-canvas border border-line text-muted hover:border-primary-strong'
                  }`}
                >
                  {t.iniciales[(day + 6) % 7]}
                </button>
              ))}
            </div>
          </Field>

          {/* Cada semana o una sí y una no: el turno de trabajo de quien libra
              alternos, o la recogida del cole de cada quince días. */}
          <Field label={t.repeticion.cada} spacing="group">
            <div className="flex gap-2">
              <SelectChip selected={s.recurrenceEvery === 1} onClick={() => s.setRecurrenceEvery(1)}>{t.repeticion.cadaSemana}</SelectChip>
              <SelectChip selected={s.recurrenceEvery === 2} onClick={() => s.setRecurrenceEvery(2)}>{t.repeticion.cadaDosSemanas}</SelectChip>
            </div>
          </Field>

          <Field label={t.repeticion.terminaEl} htmlFor="event-rec-end" hint={t.repeticion.opcional}>
            <input
              id="event-rec-end"
              type="date"
              value={s.recurrenceEnd}
              min={s.draft.date}
              max={s.maxEnd}
              onChange={e => s.setRecurrenceEnd(e.target.value)}
              className="field-input"
            />
          </Field>

          {s.previewReady && (
            <SeriesPreview
              titulo={s.draft.title}
              frase={t.repeticion.semanal(s.previewDaysText, s.previewEndText, s.recurrenceEvery === 2, s.sinFin)}
              total={t.repeticion.seCrearan(s.seriesCount)}
            />
          )}

          {s.seriesError && <p className="text-xs font-bold text-danger-strong">{s.seriesError}</p>}
        </div>
      )}

      {s.recurrence === 'yearly' && (
        <div className="space-y-4">
          <Field label={t.repeticion.repetirHastaElAno} htmlFor="event-rec-year">
            <select
              id="event-rec-year"
              value={s.recurrenceEndYear}
              onChange={e => s.setRecurrenceEndYear(Number(e.target.value))}
              className="field-input"
            >
              {Array.from({ length: 31 }, (_, i) => s.startYear + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </Field>

          {s.yearlyCount > 0 && !s.yearlyError && (
            <SeriesPreview
              titulo={s.draft.title}
              frase={t.repeticion.anual(s.recurrenceEndYear)}
              total={t.repeticion.seCrearan(s.yearlyCount)}
            />
          )}

          {s.yearlyError && <p className="text-xs font-bold text-danger-strong">{s.yearlyError}</p>}
        </div>
      )}
    </div>
  )
}

/** Lo que va a pasar, en una frase, antes de que pase. */
function SeriesPreview({ titulo, frase, total }: { titulo: string; frase: string; total: string }) {
  const t = useT().calendario.repeticion
  return (
    <div className="rounded-2xl bg-primary-tint border border-primary/25 p-3.5 space-y-1">
      <p className="text-sm text-ink leading-snug">
        <span className="font-semibold">{titulo.trim() || t.elEvento}</span>{' '}{frase}
      </p>
      <p className="text-sm font-bold text-primary-strong">{total}</p>
      <p className="text-xs text-muted">{t.porSeparado}</p>
    </div>
  )
}
