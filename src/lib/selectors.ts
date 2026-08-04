import { getLocalDateString, isSameLocalDay } from './date-utils'
import { eventCoversDay } from './events'
import { MEAL_SLOTS, TASK_PRIORITIES } from './constants'
import { normalizaParaBuscar } from './text'
import type { Event, MealPlan, MealSlot, Task, TaskPriority, ListItem, List, PendingItem, ItemMatch } from '@/types'

const TASK_PRIORITY_WEIGHT = Object.fromEntries(
  TASK_PRIORITIES.map((priority, index) => [priority.value, index])
) as Record<TaskPriority, number>

const MEAL_SLOT_WEIGHT = Object.fromEntries(
  MEAL_SLOTS.map(slot => [slot.key, slot.order])
) as Record<MealSlot, number>

export function selectTodayMeals(meals: MealPlan[], today = getLocalDateString()): MealPlan[] {
  return meals.filter(m => m.date === today)
}

export function selectPendingTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => !t.completed)
}

export function selectTaskGroups(tasks: Task[], today = getLocalDateString()): { pending: Task[]; completed: Task[] } {
  const pending: Task[] = []
  const completed: Task[] = []

  for (const task of tasks) {
    if (task.completed) completed.push(task)
    else pending.push(task)
  }

  pending.sort((a, b) => {
    const aOverdue = a.due_date ? a.due_date < today : false
    const bOverdue = b.due_date ? b.due_date < today : false
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
    if (!a.due_date && !b.due_date) return TASK_PRIORITY_WEIGHT[a.priority] - TASK_PRIORITY_WEIGHT[b.priority]
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    const dateCompare = a.due_date.localeCompare(b.due_date)
    return dateCompare !== 0 ? dateCompare : TASK_PRIORITY_WEIGHT[a.priority] - TASK_PRIORITY_WEIGHT[b.priority]
  })

  completed.sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))

  return { pending, completed }
}

export function selectPendingItems(listItems: ListItem[], lists: List[]): PendingItem[] {
  const listNamesById = new Map(lists.map(list => [list.id, list.name]))

  return listItems
    .filter(i => !i.completed)
    .map(i => ({ ...i, list_name: listNamesById.get(i.list_id) ?? '' }))
}

/**
 * Busca un texto en los ítems de todas las listas. Sirve para la pregunta
 * "¿en qué lista apunté esto?", que si no obliga a abrirlas una a una.
 *
 * Los pendientes van antes que los ya hechos: buscas para actuar, y lo tachado
 * es historial. Dentro de cada grupo se respeta el orden de la lista.
 */
export function selectItemMatches(listItems: ListItem[], lists: List[], query: string): ItemMatch[] {
  const consulta = normalizaParaBuscar(query.trim())
  if (!consulta) return []

  const listsById = new Map(lists.map(list => [list.id, list]))

  return listItems
    .filter(item => normalizaParaBuscar(item.text).includes(consulta))
    .map(item => {
      const list = listsById.get(item.list_id)
      return { ...item, list_name: list?.name ?? '', list_emoji: list?.emoji ?? null }
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const porLista = a.list_name.localeCompare(b.list_name)
      return porLista !== 0 ? porLista : a.sort_order - b.sort_order
    })
}

export function selectSortedMeals(meals: MealPlan[]): MealPlan[] {
  return [...meals].sort((a, b) => MEAL_SLOT_WEIGHT[a.slot] - MEAL_SLOT_WEIGHT[b.slot])
}

export function selectMealsByCell(meals: MealPlan[]): Map<string, MealPlan> {
  return new Map(meals.map(meal => [`${meal.date}:${meal.slot}`, meal]))
}

export function selectOccupiedMealSlots(meals: MealPlan[], date?: string): MealSlot[] {
  if (!date) return []
  return meals.filter(meal => meal.date === date).map(meal => meal.slot)
}

export function selectTodayEvents(events: Event[]): Event[] {
  const today = new Date()
  // Cubre también las vacaciones en curso, que empezaron otro día.
  return events.filter(e => eventCoversDay(e, today))
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
