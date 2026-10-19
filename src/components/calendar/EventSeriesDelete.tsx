'use client'

import { useT } from '@/lib/i18n/contexto'

interface EventSeriesDeleteProps {
  onDeleteOne: () => void
  onDeleteAll: () => void
  onCancel: () => void
}

/**
 * Al borrar un evento que se repite hay que preguntar: quien quita el martes
 * que no puede ir no quiere quitar todos los martes del trimestre. Y quien deja
 * la actividad tampoco quiere ir borrando semana a semana.
 */
export function EventSeriesDelete({ onDeleteOne, onDeleteAll, onCancel }: EventSeriesDeleteProps) {
  const t = useT().calendario.borrarSerie
  return (
    <div className="rounded-2xl border border-danger-line bg-danger-tint p-3.5 space-y-2">
      <p className="text-sm font-bold text-ink">{t.seRepite}</p>
      <p className="text-xs text-muted">{t.queEliminar}</p>
      <button
        type="button"
        onClick={onDeleteOne}
        className="w-full rounded-xl border border-danger-line py-2.5 text-sm font-semibold text-danger-strong transition-colors hover:bg-danger-soft"
      >
        {t.soloEste}
      </button>
      <button
        type="button"
        onClick={onDeleteAll}
        className="w-full rounded-xl bg-danger-strong py-2.5 text-sm font-semibold text-white transition-colors"
      >
        {t.todaLaSerie}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="w-full rounded-xl py-2 text-sm font-semibold text-muted"
      >
        {t.cancelar}
      </button>
    </div>
  )
}
