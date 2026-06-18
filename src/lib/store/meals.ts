import type { MealPlan, MealDraft } from '@/types'
import { getLocalDateString } from '../date-utils'
import { db } from './db'

function parseLocalDate(date: string): Date {
  return new Date(`${date}T00:00:00`)
}

function nextLocalDate(date: string): string {
  const d = parseLocalDate(date)
  d.setDate(d.getDate() + 1)
  return getLocalDateString(d)
}

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

export function copyMealDay(familyId: string, sourceDate: string, targetDate: string, repeatUntil?: string): MealPlan[] {
  const sourceMeals = getMeals(familyId).filter(m => m.date === sourceDate)
  if (sourceMeals.length === 0) return []

  const copied: MealPlan[] = []
  const endDate = repeatUntil && repeatUntil >= targetDate ? repeatUntil : targetDate
  let currentDate = targetDate

  while (currentDate <= endDate) {
    if (currentDate !== sourceDate) {
      db.mealPlans = db.mealPlans.filter(m => !(m.family_id === familyId && m.date === currentDate))
      for (const meal of sourceMeals) {
        copied.push(createMeal(familyId, {
          date: currentDate,
          slot: meal.slot,
          name: meal.name,
          notes: meal.notes ?? '',
        }))
      }
    }
    currentDate = nextLocalDate(currentDate)
  }

  return copied
}
