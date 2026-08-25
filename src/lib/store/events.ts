import type { Event, EventDraft } from '@/types'
import { buildLocalDateTime } from '../date-utils'
import { isRangeKind } from '../events'
import { buildWeeklyDates, buildYearlyDates } from '../recurrence'
import { db } from './db'

/**
 * En unas vacaciones `end_at` marca el último día; en un evento normal, la hora
 * de fin del mismo día. Es el único punto donde esa diferencia importa.
 */
function endAtFromDraft(draft: EventDraft): string | null {
  if (isRangeKind(draft.kind)) {
    return buildLocalDateTime(draft.end_date || draft.date, '23:59')
  }
  return !draft.all_day && draft.end_time ? buildLocalDateTime(draft.date, draft.end_time) : null
}

function buildEventFromDraft(familyId: string, draft: EventDraft, groupId: string | null = null): Event {
  const now      = new Date().toISOString()
  const start_at = buildLocalDateTime(draft.date, draft.all_day ? '00:00' : (draft.start_time || '00:00'))
  const end_at   = endAtFromDraft(draft)
  return {
    id: crypto.randomUUID(),
    family_id: familyId,
    child_id: draft.child_id,
    member_id: draft.member_id,
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    start_at, end_at,
    all_day: draft.all_day,
    kind: draft.kind,
    color: null,
    recurrence_group_id: groupId,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
}

function applyEventDraft(event: Event, draft: EventDraft): Event {
  const start_at = buildLocalDateTime(draft.date, draft.all_day ? '00:00' : (draft.start_time || '00:00'))
  const end_at   = endAtFromDraft(draft)
  return {
    ...event,
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    start_at, end_at,
    all_day: draft.all_day,
    kind: draft.kind,
    child_id: draft.child_id,
    member_id: draft.member_id,
    updated_at: new Date().toISOString(),
  }
}

export function getEvents(familyId: string): Event[] {
  return db.events.filter(e => e.family_id === familyId)
}

export function createEvent(familyId: string, draft: EventDraft): Event {
  const e = buildEventFromDraft(familyId, draft)
  db.events = [...db.events, e]
  return e
}

export function updateEvent(id: string, draft: EventDraft): void {
  db.events = db.events.map(e => e.id !== id ? e : applyEventDraft(e, draft))
}

export function deleteEvent(id: string): void {
  db.events = db.events.filter(e => e.id !== id)
}

export function deleteEventSeries(groupId: string): void {
  db.events = db.events.filter(e => e.recurrence_group_id !== groupId)
}

export function createYearlySeries(
  familyId: string,
  draft: EventDraft,
  endYear: number,
): Event[] {
  const groupId = crypto.randomUUID()
  const created: Event[] = []
  const startYear = parseInt(draft.date.slice(0, 4), 10)

  for (const date of buildYearlyDates(draft.date.slice(5), startYear, endYear)) {
    const e = buildEventFromDraft(familyId, { ...draft, date }, groupId)
    db.events = [...db.events, e]
    created.push(e)
  }

  return created
}

export function createEventSeries(
  familyId: string,
  draft: EventDraft,
  weekdays: number[],
  endDate: string,
): Event[] {
  const groupId = crypto.randomUUID()
  const created: Event[] = []

  for (const date of buildWeeklyDates(draft.date, endDate, weekdays)) {
    const e = buildEventFromDraft(familyId, { ...draft, date }, groupId)
    db.events = [...db.events, e]
    created.push(e)
  }

  return created
}
