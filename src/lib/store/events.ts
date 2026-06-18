import type { Event, EventDraft } from '@/types'
import { buildLocalDateTime, getLocalDateString } from '../date-utils'
import { isSameLocalDay } from '../date-utils'
import { db } from './db'

function buildEventFromDraft(familyId: string, draft: EventDraft, groupId: string | null = null): Event {
  const now      = new Date().toISOString()
  const start_at = buildLocalDateTime(draft.date, draft.all_day ? '00:00' : (draft.start_time || '00:00'))
  const end_at   = !draft.all_day && draft.end_time ? buildLocalDateTime(draft.date, draft.end_time) : null
  return {
    id: crypto.randomUUID(),
    family_id: familyId,
    child_id: draft.child_id,
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    start_at, end_at,
    all_day: draft.all_day,
    color: null,
    recurrence_group_id: groupId,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
}

function applyEventDraft(event: Event, draft: EventDraft): Event {
  const start_at = buildLocalDateTime(draft.date, draft.all_day ? '00:00' : (draft.start_time || '00:00'))
  const end_at   = !draft.all_day && draft.end_time ? buildLocalDateTime(draft.date, draft.end_time) : null
  return {
    ...event,
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    start_at, end_at,
    all_day: draft.all_day,
    child_id: draft.child_id,
    updated_at: new Date().toISOString(),
  }
}

export function getEvents(familyId: string): Event[] {
  return db.events.filter(e => e.family_id === familyId)
}

export function getTodayEvents(familyId: string): Event[] {
  const today = new Date()
  return getEvents(familyId).filter(e => isSameLocalDay(new Date(e.start_at), today))
}

export function getUpcomingEvents(familyId: string, limit = 5): Event[] {
  const now      = new Date()
  const todayStr = getLocalDateString()
  return getEvents(familyId)
    .filter(e => { const d = new Date(e.start_at); return !isSameLocalDay(d, now) && getLocalDateString(d) > todayStr })
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, limit)
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

export function createYearlySeries(
  familyId: string,
  draft: EventDraft,
  endYear: number,
): Event[] {
  const groupId = crypto.randomUUID()
  const created: Event[] = []
  const startYear = parseInt(draft.date.slice(0, 4), 10)
  const mmdd = draft.date.slice(5) // "MM-DD"

  for (let year = startYear; year <= endYear; year++) {
    const e = buildEventFromDraft(familyId, { ...draft, date: `${year}-${mmdd}` }, groupId)
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
  const cur = new Date(draft.date + 'T12:00:00')
  const end = new Date(endDate + 'T12:00:00')

  while (cur <= end) {
    if (weekdays.includes(cur.getDay())) {
      const y = cur.getFullYear()
      const m = String(cur.getMonth() + 1).padStart(2, '0')
      const d = String(cur.getDate()).padStart(2, '0')
      const e = buildEventFromDraft(familyId, { ...draft, date: `${y}-${m}-${d}` }, groupId)
      db.events = [...db.events, e]
      created.push(e)
    }
    cur.setDate(cur.getDate() + 1)
  }

  return created
}
