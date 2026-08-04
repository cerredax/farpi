import { buildLocalDateTime } from '../date-utils'
import { buildWeeklyDates, buildYearlyDates } from '../recurrence'
import { createClient } from '../supabase/client'
import { assertNoError, currentUserId } from './shared'
import type { Event, EventDraft } from '@/types'
import type { EventsRepo } from '../repos/types'

function localDateTimeToIso(date: string, time = '00:00'): string {
  return new Date(buildLocalDateTime(date, time)).toISOString()
}

/** En vacaciones `end_at` es el último día; en un evento normal, la hora de fin. */
function endAtFromDraft(draft: EventDraft): string | null {
  if (draft.kind === 'vacaciones') {
    return localDateTimeToIso(draft.end_date || draft.date, '23:59')
  }
  return !draft.all_day && draft.end_time ? localDateTimeToIso(draft.date, draft.end_time) : null
}

function eventInsert(familyId: string, userId: string, draft: EventDraft, groupId: string | null = null) {
  return {
    family_id: familyId,
    child_id: draft.child_id,
    member_id: draft.member_id,
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    start_at: localDateTimeToIso(draft.date, draft.all_day ? '00:00' : (draft.start_time || '00:00')),
    end_at: endAtFromDraft(draft),
    all_day: draft.all_day,
    kind: draft.kind,
    color: null,
    recurrence_group_id: groupId,
    created_by: userId,
  }
}

function eventUpdate(draft: EventDraft) {
  return {
    child_id: draft.child_id,
    member_id: draft.member_id,
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    start_at: localDateTimeToIso(draft.date, draft.all_day ? '00:00' : (draft.start_time || '00:00')),
    end_at: endAtFromDraft(draft),
    all_day: draft.all_day,
    kind: draft.kind,
  }
}

export const eventsRepo: EventsRepo = {
  async getEvents(familyId: string): Promise<Event[]> {
    const supabase = createClient()
    const { data, error } = await supabase.from('events').select('*').eq('family_id', familyId).order('start_at')
    assertNoError(error)
    return data ?? []
  },

  async createEvent(familyId: string, draft: EventDraft): Promise<Event> {
    const supabase = createClient()
    const userId = await currentUserId()
    const { data, error } = await supabase.from('events').insert(eventInsert(familyId, userId, draft)).select('*').single()
    assertNoError(error)
    return data
  },

  // Las series se materializan: una fila por ocurrencia, atadas por
  // `recurrence_group_id` para poder borrarlas de golpe.
  async createEventSeries(familyId: string, draft: EventDraft, weekdays: number[], endDate: string): Promise<Event[]> {
    const supabase = createClient()
    const userId = await currentUserId()
    const groupId = crypto.randomUUID()
    const rows = buildWeeklyDates(draft.date, endDate, weekdays)
      .map(date => eventInsert(familyId, userId, { ...draft, date }, groupId))

    if (rows.length === 0) return []
    const { data, error } = await supabase.from('events').insert(rows).select('*').order('start_at')
    assertNoError(error)
    return data ?? []
  },

  async createYearlySeries(familyId: string, draft: EventDraft, endYear: number): Promise<Event[]> {
    const supabase = createClient()
    const userId = await currentUserId()
    const groupId = crypto.randomUUID()
    const startYear = parseInt(draft.date.slice(0, 4), 10)
    const rows = buildYearlyDates(draft.date.slice(5), startYear, endYear)
      .map(date => eventInsert(familyId, userId, { ...draft, date }, groupId))
    const { data, error } = await supabase.from('events').insert(rows).select('*').order('start_at')
    assertNoError(error)
    return data ?? []
  },

  async updateEvent(id: string, draft: EventDraft): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('events').update(eventUpdate(draft)).eq('id', id)
    assertNoError(error)
  },

  async deleteEvent(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('events').delete().eq('id', id)
    assertNoError(error)
  },

  async deleteEventSeries(groupId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('events').delete().eq('recurrence_group_id', groupId)
    assertNoError(error)
  },
}
