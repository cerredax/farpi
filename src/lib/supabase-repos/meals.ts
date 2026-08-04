import { getLocalDateString, parseLocalDate } from '../date-utils'
import { createClient } from '../supabase/client'
import { assertNoError, currentUserId } from './shared'
import type { MealDraft, MealPlan } from '@/types'
import type { MealsRepo } from '../repos/types'

export const mealsRepo: MealsRepo = {
  async getMeals(familyId: string): Promise<MealPlan[]> {
    const supabase = createClient()
    const { data, error } = await supabase.from('meal_plans').select('*').eq('family_id', familyId).order('date')
    assertNoError(error)
    return data ?? []
  },

  // Upsert por (familia, día, momento): solo hay una comida por hueco, así que
  // volver a guardar el mismo hueco pisa lo que hubiera en vez de duplicarlo.
  async createMeal(familyId: string, draft: MealDraft): Promise<MealPlan> {
    const supabase = createClient()
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('meal_plans')
      .upsert({
        family_id: familyId,
        date: draft.date,
        slot: draft.slot,
        name: draft.name.trim(),
        notes: draft.notes.trim() || null,
        created_by: userId,
      }, { onConflict: 'family_id,date,slot' })
      .select('*')
      .single()
    assertNoError(error)
    return data
  },

  async updateMeal(id: string, draft: MealDraft): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('meal_plans')
      .update({ date: draft.date, slot: draft.slot, name: draft.name.trim(), notes: draft.notes.trim() || null })
      .eq('id', id)
    assertNoError(error)
  },

  async deleteMeal(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('meal_plans').delete().eq('id', id)
    assertNoError(error)
  },

  /**
   * Copiar un día pisa el destino entero: se borra lo que hubiera y se calca el
   * origen. El día de origen nunca se toca, aunque caiga dentro del rango.
   */
  async copyMealDay(familyId: string, sourceDate: string, targetDate: string, repeatUntil?: string): Promise<void> {
    const supabase = createClient()
    const userId = await currentUserId()
    const sourceMeals = (await mealsRepo.getMeals(familyId)).filter(meal => meal.date === sourceDate)
    if (sourceMeals.length === 0) return
    const endDate = repeatUntil && repeatUntil >= targetDate ? repeatUntil : targetDate
    let currentDate = targetDate
    while (currentDate <= endDate) {
      if (currentDate !== sourceDate) {
        const { error: deleteError } = await supabase
          .from('meal_plans')
          .delete()
          .eq('family_id', familyId)
          .eq('date', currentDate)
        assertNoError(deleteError)

        const rows = sourceMeals.map(meal => ({
          family_id: familyId,
          date: currentDate,
          slot: meal.slot,
          name: meal.name,
          notes: meal.notes,
          created_by: userId,
        }))

        const { error: insertError } = await supabase.from('meal_plans').insert(rows)
        assertNoError(insertError)
      }
      const next = parseLocalDate(currentDate)
      next.setDate(next.getDate() + 1)
      currentDate = getLocalDateString(next)
    }
  },
}
