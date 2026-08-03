import { buildLocalDateTime, getLocalDateString, parseLocalDate } from './date-utils'
import { buildWeeklyDates, buildYearlyDates, getNextOccurrence } from './recurrence'
import { createClient } from './supabase/client'
import type {
  Child,
  ChildDraft,
  Document,
  DocumentDraft,
  Event,
  EventDraft,
  Family,
  FamilyInvite,
  FamilyMember,
  List,
  ListDraft,
  ListItem,
  ListItemDraft,
  MealDraft,
  MealPlan,
  Task,
  TaskDraft,
} from '@/types'
import type { Repos } from './repos/types'

type Role = 'admin' | 'member'

function fail(message: string): never {
  throw new Error(message)
}

function assertNoError(error: { message: string } | null | undefined): void {
  if (error) fail(error.message)
}

async function currentUserId(): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  assertNoError(error)
  return data.user?.id ?? fail('Usuario no autenticado')
}

function localDateTimeToIso(date: string, time = '00:00'): string {
  return new Date(buildLocalDateTime(date, time)).toISOString()
}

function eventInsert(familyId: string, userId: string, draft: EventDraft, groupId: string | null = null) {
  return {
    family_id: familyId,
    child_id: draft.child_id,
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    start_at: localDateTimeToIso(draft.date, draft.all_day ? '00:00' : (draft.start_time || '00:00')),
    end_at: !draft.all_day && draft.end_time ? localDateTimeToIso(draft.date, draft.end_time) : null,
    all_day: draft.all_day,
    color: null,
    recurrence_group_id: groupId,
    created_by: userId,
  }
}

function eventUpdate(draft: EventDraft) {
  return {
    child_id: draft.child_id,
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    start_at: localDateTimeToIso(draft.date, draft.all_day ? '00:00' : (draft.start_time || '00:00')),
    end_at: !draft.all_day && draft.end_time ? localDateTimeToIso(draft.date, draft.end_time) : null,
    all_day: draft.all_day,
  }
}

function safeFileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'documento'
}

export const supabaseRepos: Repos = {
  family: {
    async getFamily(familyId: string): Promise<Family | undefined> {
      const supabase = createClient()
      const { data, error } = await supabase.from('families').select('*').eq('id', familyId).maybeSingle()
      assertNoError(error)
      return data ?? undefined
    },

    async getFamilies(): Promise<Family[]> {
      const supabase = createClient()
      const { data, error } = await supabase.from('families').select('*').order('created_at')
      assertNoError(error)
      return data ?? []
    },

    async setFamilyName(familyId: string, name: string): Promise<Family> {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('families')
        .update({ name: name.trim() })
        .eq('id', familyId)
        .select('*')
        .single()
      assertNoError(error)
      return data
    },

    async createFamily(name: string): Promise<Family> {
      const supabase = createClient()
      const { data: familyId, error } = await supabase.rpc('create_family_with_admin', { family_name: name.trim() })
      assertNoError(error)
      return this.getFamily(familyId) as Promise<Family>
    },
  },

  members: {
    async getMembers(familyId: string): Promise<FamilyMember[]> {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at')
      assertNoError(error)
      return data ?? []
    },

    async updateMemberName(id: string, name: string): Promise<void> {
      const supabase = createClient()
      const { error } = await supabase.rpc('update_my_family_profile', {
        member_id: id,
        display_name: name.trim(),
        avatar_url: null,
      })
      assertNoError(error)
    },

    async updateMemberRole(id: string, role: Role): Promise<void> {
      const supabase = createClient()
      const { error } = await supabase.rpc('update_family_member_role', { p_member_id: id, p_role: role })
      assertNoError(error)
    },

    async removeMember(id: string): Promise<void> {
      const supabase = createClient()
      const { error } = await supabase.rpc('remove_family_member', { p_member_id: id })
      assertNoError(error)
    },
  },

  invites: {
    async getInvites(familyId: string): Promise<FamilyInvite[]> {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('family_invites')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      assertNoError(error)
      return data ?? []
    },

    async createInvite(familyId: string, email: string): Promise<FamilyInvite> {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId, email }),
      })
      const body = await res.json().catch(() => ({})) as { error?: string; inviteId?: string }
      if (!res.ok) fail(body.error ?? 'Error al enviar la invitación')
      const supabase = createClient()
      const { data, error } = await supabase.from('family_invites').select('*').eq('id', body.inviteId).single()
      assertNoError(error)
      return data
    },

    async cancelInvite(id: string): Promise<void> {
      const supabase = createClient()
      const { error } = await supabase.from('family_invites').update({ status: 'cancelled' }).eq('id', id)
      assertNoError(error)
    },
  },

  children: {
    async getKids(familyId: string): Promise<Child[]> {
      const supabase = createClient()
      const { data, error } = await supabase.from('children').select('*').eq('family_id', familyId).order('created_at')
      assertNoError(error)
      return data ?? []
    },

    async createKid(familyId: string, draft: ChildDraft): Promise<Child> {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('children')
        .insert({ family_id: familyId, name: draft.name.trim(), birth_date: draft.birth_date || null, color: draft.color })
        .select('*')
        .single()
      assertNoError(error)
      return data
    },

    async updateKid(id: string, draft: ChildDraft): Promise<void> {
      const supabase = createClient()
      const { error } = await supabase
        .from('children')
        .update({ name: draft.name.trim(), birth_date: draft.birth_date || null, color: draft.color })
        .eq('id', id)
      assertNoError(error)
    },

    async deleteKid(id: string): Promise<void> {
      const supabase = createClient()
      const { error } = await supabase.from('children').delete().eq('id', id)
      assertNoError(error)
    },
  },

  events: {
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
  },

  tasks: {
    async getTasks(familyId: string): Promise<Task[]> {
      const supabase = createClient()
      const { data, error } = await supabase.from('tasks').select('*').eq('family_id', familyId).order('created_at')
      assertNoError(error)
      return data ?? []
    },

    async createTask(familyId: string, draft: TaskDraft): Promise<Task> {
      const supabase = createClient()
      const userId = await currentUserId()
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          family_id: familyId,
          title: draft.title.trim(),
          notes: draft.notes.trim() || null,
          priority: draft.priority,
          due_date: draft.due_date || null,
          recurrence: draft.recurrence,
          recurrence_end: draft.recurrence_end || null,
          created_by: userId,
        })
        .select('*')
        .single()
      assertNoError(error)
      return data
    },

    async updateTask(id: string, draft: TaskDraft): Promise<void> {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({
          title: draft.title.trim(),
          notes: draft.notes.trim() || null,
          priority: draft.priority,
          due_date: draft.due_date || null,
          recurrence: draft.recurrence,
          recurrence_end: draft.recurrence_end || null,
        })
        .eq('id', id)
      assertNoError(error)
    },

    async deleteTask(id: string): Promise<void> {
      const supabase = createClient()
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      assertNoError(error)
    },

    async toggleTask(id: string): Promise<void> {
      const supabase = createClient()
      const { data: task, error: getError } = await supabase.from('tasks').select('*').eq('id', id).single()
      assertNoError(getError)
      const now = new Date().toISOString()

      if (task.completed || task.recurrence === 'none') {
        const completed = !task.completed
        const { error } = await supabase
          .from('tasks')
          .update({ completed, completed_at: completed ? now : null })
          .eq('id', id)
        assertNoError(error)
        return
      }

      const next = getNextOccurrence(task.due_date, task.recurrence)
      const seriesDone = task.recurrence_end ? next > task.recurrence_end : false
      const { error } = await supabase
        .from('tasks')
        .update(seriesDone ? { completed: true, completed_at: now } : { due_date: next })
        .eq('id', id)
      assertNoError(error)
    },
  },

  lists: {
    async getLists(familyId: string): Promise<List[]> {
      const supabase = createClient()
      const { data, error } = await supabase.from('lists').select('*').eq('family_id', familyId).order('created_at')
      assertNoError(error)
      return data ?? []
    },

    async createList(familyId: string, draft: ListDraft): Promise<List> {
      const supabase = createClient()
      const userId = await currentUserId()
      const { data, error } = await supabase
        .from('lists')
        .insert({ family_id: familyId, name: draft.name.trim(), emoji: draft.emoji || null, color: null, created_by: userId })
        .select('*')
        .single()
      assertNoError(error)
      return data
    },

    async updateList(id: string, draft: ListDraft): Promise<void> {
      const supabase = createClient()
      const { error } = await supabase.from('lists').update({ name: draft.name.trim(), emoji: draft.emoji || null }).eq('id', id)
      assertNoError(error)
    },

    async deleteList(id: string): Promise<void> {
      const supabase = createClient()
      const { error } = await supabase.from('lists').delete().eq('id', id)
      assertNoError(error)
    },
  },

  listItems: {
    async getListItems(familyId: string): Promise<ListItem[]> {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('list_items')
        .select('*')
        .eq('family_id', familyId)
        .order('sort_order')
      assertNoError(error)
      return data ?? []
    },

    async createListItem(listId: string, familyId: string, draft: ListItemDraft): Promise<ListItem> {
      const supabase = createClient()
      const userId = await currentUserId()
      const { data: existing, error: orderError } = await supabase
        .from('list_items')
        .select('sort_order')
        .eq('list_id', listId)
        .order('sort_order', { ascending: false })
        .limit(1)
      assertNoError(orderError)
      const sortOrder = ((existing?.[0]?.sort_order as number | undefined) ?? -1) + 1
      const { data, error } = await supabase
        .from('list_items')
        .insert({ list_id: listId, family_id: familyId, text: draft.text.trim(), sort_order: sortOrder, created_by: userId })
        .select('*')
        .single()
      assertNoError(error)
      return data
    },

    async updateListItem(id: string, draft: ListItemDraft): Promise<void> {
      const supabase = createClient()
      const { error } = await supabase.from('list_items').update({ text: draft.text.trim() }).eq('id', id)
      assertNoError(error)
    },

    async deleteListItem(id: string): Promise<void> {
      const supabase = createClient()
      const { error } = await supabase.from('list_items').delete().eq('id', id)
      assertNoError(error)
    },

    async toggleListItem(id: string): Promise<void> {
      const supabase = createClient()
      const userId = await currentUserId()
      const { data: item, error: getError } = await supabase.from('list_items').select('*').eq('id', id).single()
      assertNoError(getError)
      const completed = !item.completed
      const { error } = await supabase
        .from('list_items')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? userId : null,
        })
        .eq('id', id)
      assertNoError(error)
    },
  },

  meals: {
    async getMeals(familyId: string): Promise<MealPlan[]> {
      const supabase = createClient()
      const { data, error } = await supabase.from('meal_plans').select('*').eq('family_id', familyId).order('date')
      assertNoError(error)
      return data ?? []
    },

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

    async copyMealDay(familyId: string, sourceDate: string, targetDate: string, repeatUntil?: string): Promise<void> {
      const supabase = createClient()
      const userId = await currentUserId()
      const sourceMeals = (await this.getMeals(familyId)).filter(meal => meal.date === sourceDate)
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
  },

  documents: {
    async getDocuments(familyId: string): Promise<Document[]> {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
      assertNoError(error)
      return data ?? []
    },

    async createDocument(familyId: string, draft: DocumentDraft): Promise<Document> {
      const file = draft.file ?? fail('Selecciona un archivo para subirlo')
      const supabase = createClient()
      const userId = await currentUserId()
      const id = crypto.randomUUID()
      const storagePath = `${familyId}/${id}/${safeFileName(file.name)}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })
      assertNoError(uploadError)

      const { data, error } = await supabase
        .from('documents')
        .insert({
          id,
          family_id: familyId,
          child_id: draft.child_id,
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          category: draft.category || null,
          storage_path: storagePath,
          mime_type: draft.mime_type,
          size_bytes: draft.size_bytes,
          created_by: userId,
        })
        .select('*')
        .single()

      if (error) {
        await supabase.storage.from('documents').remove([storagePath])
        fail(error.message)
      }
      return data
    },

    async updateDocument(id: string, draft: DocumentDraft): Promise<void> {
      const supabase = createClient()
      const { error } = await supabase
        .from('documents')
        .update({
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          category: draft.category || null,
          child_id: draft.child_id,
        })
        .eq('id', id)
      assertNoError(error)
    },

    async deleteDocument(id: string): Promise<void> {
      const supabase = createClient()
      const { data: doc, error: getError } = await supabase.from('documents').select('storage_path').eq('id', id).single()
      assertNoError(getError)
      const { error: deleteError } = await supabase.from('documents').delete().eq('id', id)
      assertNoError(deleteError)
      if (doc?.storage_path) {
        const { error: storageError } = await supabase.storage.from('documents').remove([doc.storage_path])
        assertNoError(storageError)
      }
    },

    async getDownloadUrl(document: Document): Promise<string> {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.storage_path, 60)
      assertNoError(error)
      return data?.signedUrl ?? fail('No se pudo generar el enlace del documento')
    },
  },
}
