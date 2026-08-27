'use client'

import { AssigneePicker } from '@/components/ui/AssigneePicker'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { isRangeKind } from '@/lib/events'
import type { Event, Child, EventDraft, FamilyMember } from '@/types'
import { EventRecurrenceFields } from './EventRecurrenceFields'
import { EventSeriesDelete } from './EventSeriesDelete'
import { useEventSheet, type EventSheetMode } from './useEventSheet'

interface EventSheetProps {
  open: boolean
  mode: EventSheetMode
  initial?: Event | null
  defaultDate?: Date
  kids: Child[]
  members: FamilyMember[]
  onClose: () => void
  onCreate: (draft: EventDraft) => void
  onCreateSeries?: (draft: EventDraft, weekdays: number[], endDate: string) => void
  onCreateYearlySeries?: (draft: EventDraft, endYear: number) => void
  onUpdate: (id: string, draft: EventDraft) => void
  onDelete: (id: string) => void
  onDeleteSeries?: (groupId: string) => void
}

/**
 * El formulario de un evento, que en realidad son tres: un plan suelto, unas
 * vacaciones de varios días y una serie. El estado y las cuentas viven en
 * `useEventSheet`; aquí queda lo que se ve.
 */
export function EventSheet({
  open, mode, initial, defaultDate, kids, members,
  onClose, onCreate, onCreateSeries, onCreateYearlySeries, onUpdate, onDelete, onDeleteSeries,
}: EventSheetProps) {
  // El ref sale del objeto: dentro, cualquier `s.loQueSea` se lee como acceder
  // a un ref durante el render y el linter lo para, con razón.
  const { firstFieldRef, ...s } = useEventSheet({
    open, mode, initial, defaultDate,
    onClose, onCreate, onCreateSeries, onCreateYearlySeries, onUpdate, onDelete,
  })

  const esSerie = mode === 'edit' && !!initial?.recurrence_group_id && !!onDeleteSeries

  const headerActions = mode !== 'edit' ? undefined : esSerie ? (
    <button
      type="button"
      onClick={() => s.setSeriesDeleteOpen(v => !v)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        s.seriesDeleteOpen ? 'bg-danger text-white' : 'text-danger hover:bg-danger-soft'
      }`}
    >
      Eliminar
    </button>
  ) : (
    <DeleteButton variant="header" confirming={s.confirmDelete} onClick={s.handleDelete} idleLabel="Eliminar" confirmLabel="Confirmar" />
  )

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? 'Apuntar en el calendario' : 'Editar lo apuntado'}
      onClose={onClose}
      headerActions={headerActions}
      footer={
        <SheetFooter
          form="event-form"
          submitLabel={s.submitLabel}
          disabled={!s.canSubmit}
          error={s.formError ?? s.vacacionesError}
        />
      }
    >
      <form id="event-form" onSubmit={s.handleSubmit} className="px-5 pt-1 pb-4 space-y-5">

        {s.seriesDeleteOpen && initial?.recurrence_group_id && onDeleteSeries && (
          <EventSeriesDelete
            onDeleteOne={() => { onDelete(initial.id); onClose() }}
            onDeleteAll={() => { onDeleteSeries(initial.recurrence_group_id!); onClose() }}
            onCancel={() => s.setSeriesDeleteOpen(false)}
          />
        )}

        {/* Qué es se elige al crear y ya no se cambia: unas vacaciones y un plan
            de una tarde no son la misma cosa con otro nombre.

            **Desplegable y no botones** (26-08-2026). Eran cuatro botones en una
            rejilla de dos por dos, y con el cuarto ya ocupaban dos filas enteras
            del formulario para una decisión que se toma una vez y casi siempre
            es la de por defecto. Un desplegable ocupa una línea, y sobre todo
            aguanta el quinto y el sexto tipo sin volver a reordenar nada. */}
        {mode === 'create' && (
          <Field label="Qué es" htmlFor="event-kind">
            <select
              id="event-kind"
              value={s.draft.kind}
              onChange={e => {
                const valor = e.target.value as EventDraft['kind']
                s.patch({
                  kind: valor,
                  // Vacaciones, descansos y festivos son días completos por definición.
                  all_day: isRangeKind(valor) ? true : s.draft.all_day,
                  end_date: isRangeKind(valor) && !s.draft.end_date ? s.draft.date : s.draft.end_date,
                })
              }}
              className="field-input"
            >
              <option value="evento">Un plan</option>
              <option value="vacaciones">Vacaciones</option>
              <option value="descanso">Descanso</option>
              <option value="festivo">Festivo</option>
            </select>
          </Field>
        )}

        {/* En vacaciones y descansos el título sobra: el tipo ya dice lo que es,
            y el placeholder enseña con qué nombre se va a guardar. */}
        <Field label={s.tituloOpcional ? 'Título (opcional)' : 'Título'} htmlFor="event-title">
          <input
            id="event-title"
            ref={firstFieldRef}
            type="text"
            value={s.draft.title}
            onChange={e => s.patch({ title: e.target.value })}
            placeholder={s.esVacaciones ? 'Vacaciones' : s.esDescanso ? 'Descanso' : s.esFestivo ? 'Festivo' : '¿Qué ocurre?'}
            className="field-input"
          />
        </Field>

        <Field label="Descripción (opcional)" htmlFor="event-description">
          <textarea id="event-description" value={s.draft.description} onChange={e => s.patch({ description: e.target.value })} placeholder="Lugar, notas…" rows={2} className="field-input resize-none" />
        </Field>

        {/* Fechas. En vacaciones o descansos son un rango de días; en un plan, uno con horas. */}
        {s.esDeRango ? (
          <div className="flex gap-3">
            <div className="flex-1">
              <Field label="Desde" htmlFor="event-date">
                <input id="event-date" type="date" value={s.draft.date} onChange={e => s.handleDateChange(e.target.value)} className="field-input" />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Hasta" htmlFor="event-end-date">
                <input id="event-end-date" type="date" value={s.draft.end_date} min={s.draft.date} onChange={e => s.patch({ end_date: e.target.value })} className="field-input" />
              </Field>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Field label="Fecha" htmlFor="event-date">
                <input id="event-date" type="date" value={s.draft.date} onChange={e => s.handleDateChange(e.target.value)} className="field-input" />
              </Field>
            </div>
            <div className="flex flex-col items-center gap-1.5 pb-0.5">
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap">Todo el día</span>
              <button type="button" role="switch" aria-checked={s.draft.all_day} onClick={() => s.patch({ all_day: !s.draft.all_day })} className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${s.draft.all_day ? 'bg-primary' : 'bg-line-strong'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${s.draft.all_day ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
        )}

        {!s.draft.all_day && !s.esVacaciones && (
          <div className="flex gap-3">
            <div className="flex-1">
              <Field label="Inicio" htmlFor="event-start">
                <input id="event-start" type="time" value={s.draft.start_time} onChange={e => s.patch({ start_time: e.target.value })} className="field-input" />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Fin" htmlFor="event-end">
                <input id="event-end" type="time" value={s.draft.end_time} onChange={e => s.patch({ end_time: e.target.value })} className="field-input" />
              </Field>
            </div>
          </div>
        )}

        <AssigneePicker value={s.draft} onChange={s.patch} members={members} kids={kids} />

        {mode === 'create' && !s.esDeRango && <EventRecurrenceFields s={s} />}

      </form>
    </BottomSheet>
  )
}
