'use client'

import { Field } from '@/components/ui/Field'
import type { useEventSheet } from './useEventSheet'

// L M X J V S D → getDay(): lunes=1 … domingo=0
const WEEKDAY_BUTTONS = [
  { label: 'L', day: 1 },
  { label: 'M', day: 2 },
  { label: 'X', day: 3 },
  { label: 'J', day: 4 },
  { label: 'V', day: 5 },
  { label: 'S', day: 6 },
  { label: 'D', day: 0 },
]

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
  return (
    <div className="space-y-3">
      <label className="field-label">Repetición</label>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1">
        {([
          { valor: 'none' as const, etiqueta: 'No se repite', onClick: s.setNone },
          { valor: 'weekly' as const, etiqueta: 'Cada semana', onClick: s.setWeekly },
          { valor: 'yearly' as const, etiqueta: 'Cada año', onClick: s.setYearly },
        ]).map(({ valor, etiqueta, onClick }) => (
          <button
            key={valor}
            type="button"
            onClick={onClick}
            className={`rounded-xl px-2 py-2 text-xs font-bold transition-colors ${
              s.recurrence === valor ? 'bg-white text-ink shadow-sm' : 'text-muted'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {s.recurrence === 'weekly' && (
        <div className="space-y-4">
          <Field label="Repetir los días" spacing="group">
            <div className="flex gap-1">
              {WEEKDAY_BUTTONS.map(({ label, day }) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => s.toggleWeekday(day)}
                  className={`flex-1 h-9 rounded-xl text-xs font-black transition-colors ${
                    s.recurrenceWeekdays.includes(day)
                      ? 'bg-primary text-white'
                      : 'bg-canvas border border-line text-muted hover:border-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Termina el" htmlFor="event-rec-end">
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
              frase={`se añadirá los ${s.previewDaysText} hasta el ${s.previewEndText}.`}
              total={`Se crearán ${s.seriesCount} eventos.`}
            />
          )}

          {s.seriesError && <p className="text-xs font-bold text-danger">{s.seriesError}</p>}
        </div>
      )}

      {s.recurrence === 'yearly' && (
        <div className="space-y-4">
          <Field label="Repetir hasta el año" htmlFor="event-rec-year">
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
              frase={`se añadirá cada año el mismo día hasta ${s.recurrenceEndYear}.`}
              total={`Se crearán ${s.yearlyCount} evento${s.yearlyCount !== 1 ? 's' : ''}.`}
            />
          )}

          {s.yearlyError && <p className="text-xs font-bold text-danger">{s.yearlyError}</p>}
        </div>
      )}
    </div>
  )
}

/** Lo que va a pasar, en una frase, antes de que pase. */
function SeriesPreview({ titulo, frase, total }: { titulo: string; frase: string; total: string }) {
  return (
    <div className="rounded-2xl bg-primary-tint border border-primary/25 p-3.5 space-y-1">
      <p className="text-sm text-ink leading-snug">
        <span className="font-semibold">{titulo.trim() || 'El evento'}</span>{' '}{frase}
      </p>
      <p className="text-sm font-bold text-primary">{total}</p>
      <p className="text-xs text-muted">Podrás editar cada evento por separado.</p>
    </div>
  )
}
