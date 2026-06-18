'use client'

import { format, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Heart, ListChecks, Utensils } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useStore } from '@/lib/store-context'
import { selectTodayEvents, selectUpcomingEvents } from '@/lib/selectors'
import { TodayEvents } from './TodayEvents'
import { TodayMeals } from './TodayMeals'
import { PendingItems } from './PendingItems'
import { HomeTasks } from './HomeTasks'
import { UpcomingEvents } from './UpcomingEvents'
import type { Task } from '@/types'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function getGreeting(date: Date) {
  const hour = date.getHours()
  if (hour < 12) return 'Buenos dias, familia'
  if (hour < 20) return 'Buenas tardes, familia'
  return 'Buenas noches, familia'
}

function formatEventMoment(event: { all_day: boolean; start_at: string }) {
  if (event.all_day) return 'Todo el dia'
  return format(new Date(event.start_at), 'HH:mm')
}

function HomeStat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-[#FAF7F2] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[#8BA888]">
        {icon}
        <span className="text-lg font-black text-[#252525]">{value}</span>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#77716A]">{label}</p>
    </div>
  )
}

function OffDayConfirmSheet({ task, onConfirm, onCancel }: { task: Task; onConfirm: () => void; onCancel: () => void }) {
  const dueLabel = task.due_date ? format(parseISO(task.due_date), "d 'de' MMMM", { locale: es }) : ''
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onCancel} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 max-w-lg mx-auto">
        <div className="flex justify-center mb-4">
          <span className="w-10 h-1 rounded-full bg-[#E0DDD8]" />
        </div>
        <h3 className="font-extrabold text-[#252525] text-base mb-2">Confirmar tarea</h3>
        <p className="text-sm text-[#77716A] mb-1">
          Esta tarea es para el <strong>{dueLabel}</strong>, no para hoy.
        </p>
        <p className="text-sm text-[#77716A] mb-6">¿Marcarla como hecha hoy igualmente?</p>
        <div className="space-y-2">
          <button
            onClick={onConfirm}
            className="w-full py-3 rounded-2xl bg-[#8BA888] text-white text-sm font-semibold hover:bg-[#7a9877] transition-colors"
          >
            Sí, marcar como hecha
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-[#77716A] hover:bg-[#F0EDE8] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}

export function HomeView() {
  const { kids, allEvents, pendingTasks, todayMeals, pendingItems, toggleTask, toggleListItem } = useStore()
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
    : 'Lo importante esta apuntado. Vamos paso a paso.'

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#EFE7DC] bg-[#FFF8EF] p-5 shadow-sm">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#D8A48F]/25" />
        <div className="absolute -bottom-14 left-10 h-28 w-28 rounded-full bg-[#8BA888]/20" />
        <div className="relative space-y-4">
          <div>
            <p className="text-xs font-bold text-[#77716A] uppercase tracking-widest mb-1">{dayLabel}</p>
            <h1 className="text-3xl font-black text-[#252525] leading-tight">{greeting}</h1>
            <p className="mt-2 text-sm text-[#6F6A62] leading-relaxed">
              Un vistazo tranquilo a los planes, comidas y pequenas cosas de casa.
            </p>
          </div>

          <div className="rounded-3xl bg-white/80 border border-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#F1E6D8] text-[#9A6B55]">
                <Heart size={16} fill="currentColor" strokeWidth={2.4} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#77716A]">Hoy en casa</p>
                <p className="text-sm font-bold text-[#252525]">
                  {nextEvent ? `${nextEvent.title} · ${formatEventMoment(nextEvent)}` : calmMessage}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <HomeStat icon={<CalendarDays size={15} />} value={todayEvents.length} label="Planes" />
              <HomeStat icon={<ListChecks size={15} />} value={pendingTasks.length} label="Tareas" />
              <HomeStat icon={<Utensils size={15} />} value={todayMeals.length} label="Comidas" />
            </div>
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

      <TodayEvents events={todayEvents} kids={kids} />
      <TodayMeals meals={todayMeals} />
      {confirmTask && (
        <OffDayConfirmSheet
          task={confirmTask}
          onConfirm={() => { toggleTask(confirmTask.id); setConfirmTask(null) }}
          onCancel={() => setConfirmTask(null)}
        />
      )}
      <HomeTasks pendingTasks={pendingTasks} onToggle={handleTaskToggle} />
      <PendingItems items={pendingItems} onToggle={toggleListItem} />
      <UpcomingEvents events={upcoming} kids={kids} />

      <div className="rounded-3xl border border-[#EFE7DC] bg-white px-4 py-4 text-center shadow-sm">
        <p className="text-sm font-bold text-[#252525]">Respirad. Lo importante esta apuntado.</p>
        <p className="mt-1 text-xs text-[#77716A]">Nido esta aqui para bajar un poco el ruido.</p>
      </div>
    </div>
  )
}
