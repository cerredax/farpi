'use client'

import { format, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Heart } from 'lucide-react'
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
import { capitalize } from '@/lib/text'

function getGreeting(date: Date) {
  const hour = date.getHours()
  if (hour < 12) return 'Buenos días, familia'
  if (hour < 20) return 'Buenas tardes, familia'
  return 'Buenas noches, familia'
}

function formatEventMoment(event: { all_day: boolean; start_at: string }) {
  if (event.all_day) return 'Todo el día'
  return format(new Date(event.start_at), 'HH:mm')
}

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

  const today       = new Date()
  const dayLabel    = capitalize(format(today, "EEEE, d 'de' MMMM", { locale: es }))
  const greeting    = getGreeting(today)
  const todayEvents = useMemo(() => selectTodayEvents(allEvents), [allEvents])
  const upcoming    = useMemo(() => selectUpcomingEvents(allEvents), [allEvents])
  const nextEvent   = todayEvents[0] ?? upcoming[0]
  const calmMessage = todayEvents.length === 0 && pendingTasks.length === 0 && pendingItems.length === 0
    ? 'Hoy pinta tranquilo. La casa respira un poco.'
    : 'Lo importante está apuntado. Vamos paso a paso.'

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-line bg-warm p-5 shadow-sm">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-accent/25" />
        <div className="absolute -bottom-14 left-10 h-28 w-28 rounded-full bg-primary/20" />
        <div className="relative space-y-4">
          <div>
            <p className="field-label mb-1">{dayLabel}</p>
            <h1 className="text-2xl font-black text-ink leading-tight">{greeting}</h1>
          </div>

          <div className="flex items-center gap-2.5 rounded-3xl bg-white/80 border border-white px-4 py-2.5 shadow-sm">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F1E6D8] text-[#9A6B55]">
              <Heart size={16} fill="currentColor" strokeWidth={2.4} />
            </span>
            <p className="min-w-0 text-sm font-bold text-ink leading-snug">
              {nextEvent ? `${nextEvent.title} · ${formatEventMoment(nextEvent)}` : calmMessage}
            </p>
          </div>

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

      {/* Primero lo accionable: qué hay que hacer hoy. Después el resto. */}
      <HomeTasks pendingTasks={pendingTasks} onToggle={handleTaskToggle} />
      <TodayEvents events={todayEvents} kids={kids} members={members} />
      <TodayMeals meals={todayMeals} />
      <PendingItems items={pendingItems} onToggle={toggleListItem} />
      <UpcomingEvents events={upcoming} kids={kids} />

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
