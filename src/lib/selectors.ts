import { getLocalDateString, isSameLocalDay } from './date-utils'
import type { Event, MealPlan, ListItem, List, PendingItem } from '@/types'

export function selectTodayMeals(meals: MealPlan[], today = getLocalDateString()): MealPlan[] {
  return meals.filter(m => m.date === today)
}

export function selectPendingItems(listItems: ListItem[], lists: List[]): PendingItem[] {
  return listItems
    .filter(i => !i.completed)
    .map(i => ({ ...i, list_name: lists.find(l => l.id === i.list_id)?.name ?? '' }))
}

export function selectTodayEvents(events: Event[]): Event[] {
  const today = new Date()
  return events.filter(e => isSameLocalDay(new Date(e.start_at), today))
}

export function selectUpcomingEvents(events: Event[], limit = 5): Event[] {
  const now = new Date()
  const todayStr = getLocalDateString()
  return events
    .filter(e => {
      const d = new Date(e.start_at)
      return !isSameLocalDay(d, now) && getLocalDateString(d) > todayStr
    })
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, limit)
}
