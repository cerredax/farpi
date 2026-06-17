'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useStore } from '@/lib/store-context'
import { selectTodayEvents, selectUpcomingEvents } from '@/lib/selectors'
import { TodayEvents } from './TodayEvents'
import { TodayMeals } from './TodayMeals'
import { PendingItems } from './PendingItems'
import { HomeTasks } from './HomeTasks'
import { UpcomingEvents } from './UpcomingEvents'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function HomeView() {
  const { kids, allEvents, tasks, todayMeals, pendingItems, toggleTask, toggleListItem } = useStore()

  const today       = new Date()
  const dayLabel    = capitalize(format(today, "EEEE, d 'de' MMMM", { locale: es }))
  const todayEvents = selectTodayEvents(allEvents)
  const upcoming    = selectUpcomingEvents(allEvents)

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <p className="text-xs font-bold text-[#77716A] uppercase tracking-widest mb-0.5">{dayLabel}</p>
        <h1 className="text-2xl font-extrabold text-[#252525] leading-tight">¿Qué hay hoy?</h1>
      </div>
      <TodayEvents events={todayEvents} kids={kids} />
      <TodayMeals meals={todayMeals} />
      <HomeTasks tasks={tasks} onToggle={toggleTask} />
      <PendingItems items={pendingItems} onToggle={toggleListItem} />
      <UpcomingEvents events={upcoming} kids={kids} />
    </div>
  )
}
