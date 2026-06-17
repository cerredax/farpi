import type { MealPlan, MealDraft } from '@/types'
import { getLocalDateString } from '../date-utils'
import { db } from './db'

export function getMeals(familyId: string): MealPlan[] {
  return db.mealPlans.filter(m => m.family_id === familyId)
}

export function getTodayMeals(familyId: string): MealPlan[] {
  const today = getLocalDateString()
  return getMeals(familyId).filter(m => m.date === today)
}

export function createMeal(familyId: string, draft: MealDraft): MealPlan {
  // Upsert: mirrors unique(family_id, date, slot)
  const existing = db.mealPlans.find(
    m => m.family_id === familyId && m.date === draft.date && m.slot === draft.slot
  )
  if (existing) {
    updateMeal(existing.id, draft)
    return db.mealPlans.find(m => m.id === existing.id)!
  }
  const now = new Date().toISOString()
  const m: MealPlan = {
    id: crypto.randomUUID(),
    family_id: familyId,
    date: draft.date,
    slot: draft.slot,
    name: draft.name.trim(),
    notes: draft.notes.trim() || null,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
  db.mealPlans = [...db.mealPlans, m]
  return m
}

export function updateMeal(id: string, draft: MealDraft): void {
  db.mealPlans = db.mealPlans.map(m =>
    m.id !== id ? m : {
      ...m,
      date: draft.date,
      slot: draft.slot,
      name: draft.name.trim(),
      notes: draft.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }
  )
}

export function deleteMeal(id: string): void {
  db.mealPlans = db.mealPlans.filter(m => m.id !== id)
}
