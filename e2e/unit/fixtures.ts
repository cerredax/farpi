// Constructores de datos de prueba para los tests unitarios.
// Cada uno devuelve una entidad válida con valores por defecto razonables;
// se sobrescribe solo lo que importe en cada test.
import type { ListItem, MealPlan, Task, TaskPriority, TaskRecurrence, MealSlot, Event, List } from '@/types'

let n = 0
const id = () => `id-${++n}`

export function task(over: Partial<Task> = {}): Task {
  return {
    id: id(),
    family_id: 'f1',
    title: 'Tarea',
    notes: null,
    priority: 'medium' as TaskPriority,
    due_date: null,
    recurrence: 'none' as TaskRecurrence,
    recurrence_end: null,
    completed: false,
    completed_at: null,
    created_by: 'u1',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...over,
  }
}

export function meal(over: Partial<MealPlan> = {}): MealPlan {
  return {
    id: id(),
    family_id: 'f1',
    date: '2026-08-03',
    slot: 'lunch' as MealSlot,
    name: 'Plato',
    notes: null,
    created_by: 'u1',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...over,
  }
}

export function list(over: Partial<List> = {}): List {
  return {
    id: id(),
    family_id: 'f1',
    name: 'Lista',
    emoji: null,
    color: null,
    created_by: 'u1',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...over,
  }
}

export function listItem(over: Partial<ListItem> = {}): ListItem {
  return {
    id: id(),
    list_id: 'l1',
    family_id: 'f1',
    text: 'Ítem',
    completed: false,
    completed_at: null,
    completed_by: null,
    sort_order: 0,
    created_by: 'u1',
    created_at: '2026-08-01T10:00:00Z',
    ...over,
  }
}

export function event(over: Partial<Event> = {}): Event {
  return {
    id: id(),
    family_id: 'f1',
    child_id: null,
    member_id: null,
    title: 'Evento',
    description: null,
    start_at: '2026-08-03T10:00:00',
    end_at: null,
    all_day: false,
    kind: 'evento',
    color: null,
    recurrence_group_id: null,
    created_by: 'u1',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...over,
  }
}
