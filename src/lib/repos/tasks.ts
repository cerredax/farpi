import { getTasks as storeGetTasks } from '@/lib/mock-store'
import type { Task } from '@/types'

// TODO: reemplazar con → supabase.from('tasks').select('*').eq('family_id', familyId)
export async function getTasks(familyId: string): Promise<Task[]> {
  return storeGetTasks(familyId)
}
