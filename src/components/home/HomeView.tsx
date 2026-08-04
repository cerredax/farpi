'use client'

import { format, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store-context'
import { selectTodayEvents, selectUpcomingEvents } from '@/lib/selectors'
import { TodayEvents } from './TodayEvents'
import { TodayMeals } from './TodayMeals'
import { PendingItems } from './PendingItems'
import { HomeTasks } from './HomeTasks'
import { UpcomingEvents } from './UpcomingEvents'
import { BottomSheet } from '@/components/ui/BottomSheet'
import type { Task } from '@/types'

function OffDayConfirmSheet({ open, task, onConfirm, onCancel }: { open: boolean; task: Task | null; onConfirm: () => void; onCancel: () => void }) {
  const dueLabel = task?.due_date ? format(parseISO(task.due_date), "d 'de' MMMM", { locale: es }) : ''
  return (
    <BottomSheet
      open={open}
      title="Confirmar tarea"
      onClose={onCancel}
      footer={
        <div className="px-5 py-4 space-y-2">
          <button
            onClick={onConfirm}
            className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
          >
            Sí, marcar como hecha
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-muted hover:bg-surface transition-colors"
          >
            Cancelar
          </button>
        </div>
      }
    >
      <div className="px-5 pb-4">
        <p className="text-sm text-muted mb-1">
          Esta tarea es para el <strong>{dueLabel}</strong>, no para hoy.
        </p>
        <p className="text-sm text-muted">¿Marcarla como hecha hoy igualmente?</p>
      </div>
    </BottomSheet>
  )
}

export function HomeView() {
  const { kids, members, allEvents, pendingTasks, todayMeals, pendingItems, toggleTask, toggleListItem } = useStore()
  const [confirmTask, setConfirmTask] = useState<Task | null>(null)

  function handleTaskToggle(id: string) {
    const task = pendingTasks.find(t => t.id === id)
    if (task && task.due_date && !isToday(parseISO(task.due_date))) {
      setConfirmTask(task)
    } else {
      toggleTask(id)
    }
  }

  const todayEvents = useMemo(() => selectTodayEvents(allEvents), [allEvents])
  const upcoming    = useMemo(() => selectUpcomingEvents(allEvents), [allEvents])
  const calmMessage = todayEvents.length === 0 && pendingTasks.length === 0 && pendingItems.length === 0
    ? 'Hoy pinta tranquilo. La casa respira un poco.'
    : 'Lo importante está apuntado. Vamos paso a paso.'

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* El saludo y la fecha viven en la cabecera: aquí ocupaban media pantalla
          de móvil para decir algo que no se toca. */}
      <div className="relative overflow-hidden rounded-[2rem] border border-line bg-warm p-4 shadow-sm">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-accent/25" />
        <div className="absolute -bottom-14 left-10 h-28 w-28 rounded-full bg-primary/20" />
        <div className="relative space-y-3">
          <p className="field-label">Planes de hoy</p>

          <TodayEvents events={todayEvents} kids={kids} members={members} calmMessage={calmMessage} />

          {kids.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {kids.map(child => (
                <span
                  key={child.id}
                  className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#4F4A43] shadow-sm"
                  style={{ border: `1px solid ${child.color}33` }}
                >
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: child.color }} />
                  {child.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Después de hoy, lo que se toca a diario: la compra pendiente y las
          tareas. Lo que viene y el menú cierran. */}
      <PendingItems items={pendingItems} onToggle={toggleListItem} />
      <HomeTasks pendingTasks={pendingTasks} onToggle={handleTaskToggle} />
      <UpcomingEvents events={upcoming} kids={kids} members={members} />
      <TodayMeals meals={todayMeals} />

      <OffDayConfirmSheet
        open={!!confirmTask}
        task={confirmTask}
        onConfirm={() => { if (confirmTask) toggleTask(confirmTask.id); setConfirmTask(null) }}
        onCancel={() => setConfirmTask(null)}
      />

      <p className="pb-2 text-center text-xs text-muted">Nido está aquí para bajar un poco el ruido.</p>
    </div>
  )
}
