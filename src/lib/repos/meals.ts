import { getTodayMeals as storeGetMeals } from '@/lib/mock-store'
import type { MealPlan } from '@/types'

// TODO: reemplazar con → supabase.from('meal_plans').select('*').eq('family_id', familyId).eq('date', date)
export async function getTodayMeals(familyId: string): Promise<MealPlan[]> {
  return storeGetMeals(familyId)
}
