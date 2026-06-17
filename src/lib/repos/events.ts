import { getEvents as storeGetEvents, getTodayEvents as storeToday, getUpcomingEvents as storeUpcoming } from '@/lib/mock-store'
import type { Event } from '@/types'

// TODO: reemplazar con → supabase.from('events').select('*').eq('family_id', familyId)
export async function getEvents(familyId: string): Promise<Event[]> {
  return storeGetEvents(familyId)
}

export async function getTodayEvents(familyId: string): Promise<Event[]> {
  return storeToday(familyId)
}

export async function getUpcomingEvents(familyId: string, limit = 5): Promise<Event[]> {
  return storeUpcoming(familyId, limit)
}
