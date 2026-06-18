import type {
  Family, FamilyMember, FamilyInvite, Child, Event, Task,
  MealPlan, List, ListItem, Document, PendingItem,
  ChildDraft, EventDraft, TaskDraft, MealDraft,
  ListDraft, ListItemDraft, DocumentDraft,
} from '@/types'

// ─── Contratos de repositorios ─────────────────────────────────────────────────
// Cada repo expone operaciones async. La implementación actual es mock;
// se sustituirá por llamadas Supabase sin cambiar los contratos.

export interface FamilyRepo {
  getFamily(familyId: string): Promise<Family | undefined>
  getFamilies(): Promise<Family[]>
  setFamilyName(familyId: string, name: string): Promise<Family>
  createFamily(name: string): Promise<Family>
}

export interface MembersRepo {
  getMembers(familyId: string): Promise<FamilyMember[]>
  updateMemberName(id: string, name: string): Promise<void>
  updateMemberRole(id: string, role: 'admin' | 'member'): Promise<void>
  removeMember(id: string): Promise<void>
}

export interface InvitesRepo {
  getInvites(familyId: string): Promise<FamilyInvite[]>
  createInvite(familyId: string, email: string): Promise<FamilyInvite>
  cancelInvite(id: string): Promise<void>
}

export interface ChildrenRepo {
  getKids(familyId: string): Promise<Child[]>
  createKid(familyId: string, draft: ChildDraft): Promise<Child>
  updateKid(id: string, draft: ChildDraft): Promise<void>
  deleteKid(id: string): Promise<void>
}

export interface EventsRepo {
  getEvents(familyId: string): Promise<Event[]>
  getTodayEvents(familyId: string): Promise<Event[]>
  getUpcomingEvents(familyId: string, limit?: number): Promise<Event[]>
  createEvent(familyId: string, draft: EventDraft): Promise<Event>
  createEventSeries(familyId: string, draft: EventDraft, weekdays: number[], endDate: string): Promise<Event[]>
  createYearlySeries(familyId: string, draft: EventDraft, endYear: number): Promise<Event[]>
  updateEvent(id: string, draft: EventDraft): Promise<void>
  deleteEvent(id: string): Promise<void>
}

export interface TasksRepo {
  getTasks(familyId: string): Promise<Task[]>
  createTask(familyId: string, draft: TaskDraft): Promise<Task>
  updateTask(id: string, draft: TaskDraft): Promise<void>
  deleteTask(id: string): Promise<void>
  toggleTask(id: string): Promise<void>
}

export interface ListsRepo {
  getLists(familyId: string): Promise<List[]>
  createList(familyId: string, draft: ListDraft): Promise<List>
  updateList(id: string, draft: ListDraft): Promise<void>
  deleteList(id: string): Promise<void>
}

export interface ListItemsRepo {
  getListItems(familyId: string): Promise<ListItem[]>
  getPendingItems(familyId: string): Promise<PendingItem[]>
  createListItem(listId: string, familyId: string, draft: ListItemDraft): Promise<ListItem>
  updateListItem(id: string, draft: ListItemDraft): Promise<void>
  deleteListItem(id: string): Promise<void>
  toggleListItem(id: string): Promise<void>
}

export interface MealsRepo {
  getMeals(familyId: string): Promise<MealPlan[]>
  createMeal(familyId: string, draft: MealDraft): Promise<MealPlan>
  updateMeal(id: string, draft: MealDraft): Promise<void>
  deleteMeal(id: string): Promise<void>
  copyMealDay(familyId: string, sourceDate: string, targetDate: string, repeatUntil?: string): Promise<void>
}

export interface DocumentsRepo {
  getDocuments(familyId: string): Promise<Document[]>
  createDocument(familyId: string, draft: DocumentDraft): Promise<Document>
  updateDocument(id: string, draft: DocumentDraft): Promise<void>
  deleteDocument(id: string): Promise<void>
}

// ─── Aggregate ────────────────────────────────────────────────────────────────

export interface Repos {
  family: FamilyRepo
  members: MembersRepo
  invites: InvitesRepo
  children: ChildrenRepo
  events: EventsRepo
  tasks: TasksRepo
  lists: ListsRepo
  listItems: ListItemsRepo
  meals: MealsRepo
  documents: DocumentsRepo
}
