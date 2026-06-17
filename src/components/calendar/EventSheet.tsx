'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { extractTime } from '@/lib/date-utils'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import type { Event, Child, EventDraft } from '@/types'

type Mode = 'create' | 'edit'

interface EventSheetProps {
  open: boolean
  mode: Mode
  initial?: Event | null
  defaultDate?: Date
  kids: Child[]
  onClose: () => void
  onCreate: (draft: EventDraft) => void
  onUpdate: (id: string, draft: EventDraft) => void
  onDelete: (id: string) => void
}

function initDraft(mode: Mode, initial: Event | null | undefined, defaultDate: Date | undefined): EventDraft {
  if (mode === 'edit' && initial) {
    return {
      title: initial.title,
      description: initial.description ?? '',
      date: initial.start_at.slice(0, 10),
      all_day: initial.all_day,
      start_time: initial.all_day ? '' : extractTime(initial.start_at),
      end_time: initial.end_at && !initial.all_day ? extractTime(initial.end_at) : '',
      child_id: initial.child_id,
    }
  }
  return {
    title: '', description: '',
    date: format(defaultDate ?? new Date(), 'yyyy-MM-dd'),
    all_day: false, start_time: '', end_time: '', child_id: null,
  }
}

export function EventSheet({ open, mode, initial, defaultDate, kids, onClose, onCreate, onUpdate, onDelete }: EventSheetProps) {
  const [draft, setDraft] = useState<EventDraft>(() => initDraft(mode, initial, defaultDate))
  const { confirming: confirmDelete, requestConfirm } = useConfirmAction()
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && mode === 'create') setTimeout(() => titleRef.current?.focus(), 300)
  }, [open, mode])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.title.trim()) return
    if (mode === 'create') onCreate(draft)
    else if (initial) onUpdate(initial.id, draft)
    onClose()
  }

  function handleDelete() {
    if (!initial) return
    requestConfirm(() => { onDelete(initial.id); onClose() })
  }

  const familyOption = { id: null as string | null, name: 'Familia', color: '#E9C46A' }
  const assignees = [familyOption, ...kids.map(c => ({ id: c.id as string | null, name: c.name, color: c.color }))]

  return (
    <>
      <div className={`fixed inset-0 z-50 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[92dvh] flex flex-col ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-[#E0DDD8]" /></div>
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <h3 className="font-extrabold text-[#252525] text-base">{mode === 'create' ? 'Nuevo evento' : 'Editar evento'}</h3>
          <div className="flex items-center gap-2">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${confirmDelete ? 'bg-[#D96C6C] text-white' : 'text-[#D96C6C] hover:bg-[#FDE8E8]'}`}
              >
                <Trash2 size={13} />
                {confirmDelete ? 'Confirmar' : 'Eliminar'}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-[#77716A] hover:bg-[#F0EDE8] transition-colors"><X size={18} /></button>
          </div>
        </div>

        {/* form ocupa el espacio restante como flex-column: campos scrollables + botón fijo abajo */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-5 pt-1 pb-4 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Título</label>
              <input ref={titleRef} type="text" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="¿Qué ocurre?" className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Descripción</label>
              <textarea value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Lugar, notas…" rows={2} className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition resize-none" />
            </div>

            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Fecha</label>
                <input type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition" />
              </div>
              <div className="flex flex-col items-center gap-1.5 pb-0.5">
                <span className="text-[10px] font-bold text-[#77716A] uppercase tracking-widest whitespace-nowrap">Todo el día</span>
                <button type="button" role="switch" aria-checked={draft.all_day} onClick={() => setDraft(d => ({ ...d, all_day: !d.all_day }))} className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${draft.all_day ? 'bg-[#8BA888]' : 'bg-[#D4CFC9]'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${draft.all_day ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {!draft.all_day && (
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Inicio</label>
                  <input type="time" value={draft.start_time} onChange={e => setDraft(d => ({ ...d, start_time: e.target.value }))} className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Fin</label>
                  <input type="time" value={draft.end_time} onChange={e => setDraft(d => ({ ...d, end_time: e.target.value }))} className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Asignar a</label>
              <div className="flex gap-3">
                {assignees.map(a => {
                  const selected = draft.child_id === a.id
                  return (
                    <button key={String(a.id)} type="button" onClick={() => setDraft(d => ({ ...d, child_id: a.id }))} className="flex flex-col items-center gap-1.5 flex-1 py-2 rounded-2xl transition-colors" style={{ backgroundColor: selected ? a.color + '22' : 'transparent' }}>
                      <span className="w-7 h-7 rounded-full transition-all" style={{ backgroundColor: a.color, boxShadow: selected ? `0 0 0 3px white, 0 0 0 5px ${a.color}` : 'none', transform: selected ? 'scale(1.15)' : 'scale(1)' }} />
                      <span className="text-[11px] font-bold transition-colors" style={{ color: selected ? a.color : '#77716A' }}>{a.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Botón dentro del form, fuera del scroll — siempre visible */}
          <div className="flex-shrink-0 px-5 pb-8 pt-3 border-t border-[#F5F2EE]">
            <Button type="submit" fullWidth size="lg" disabled={!draft.title.trim()}>
              {mode === 'create' ? 'Crear evento' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
