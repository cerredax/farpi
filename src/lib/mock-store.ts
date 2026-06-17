import type {
  Family, FamilyMember, FamilyInvite, Child, Event, Task, MealPlan, List, ListItem, Document,
  ChildDraft, EventDraft, TaskDraft, MealDraft, ListDraft, ListItemDraft, DocumentDraft,
  PendingItem, TaskRecurrence,
} from '@/types'
import { getLocalDateString, buildLocalDateTime } from './date-utils'

// ─── Datos iniciales ──────────────────────────────────────────────────────────

let families: Family[] = [
  { id: 'f1', name: 'Familia García', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
]

let members: FamilyMember[] = [
  { id: 'm1', family_id: 'f1', user_id: 'u1', display_name: 'Laura',  avatar_url: null, role: 'admin',  created_at: '2026-01-01T00:00:00' },
  { id: 'm2', family_id: 'f1', user_id: 'u2', display_name: 'Carlos', avatar_url: null, role: 'member', created_at: '2026-01-02T00:00:00' },
]

let invites: FamilyInvite[] = []

let kids: Child[] = [
  { id: '1', family_id: 'f1', name: 'Ana', birth_date: '2021-03-10', color: '#D8A48F', created_at: '' },
]

let events: Event[] = [
  { id: 'e01', family_id: 'f1', child_id: '1',  title: 'Pediatra Ana',          description: 'Centro de salud Goya',    start_at: '2026-06-02T10:30:00', end_at: null, all_day: false, color: null, created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'e03', family_id: 'f1', child_id: null, title: 'Cena familiar',          description: 'Casa de los abuelos',     start_at: '2026-06-06T21:00:00', end_at: null, all_day: false, color: null, created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'e04', family_id: 'f1', child_id: '1',  title: 'Festival del cole',      description: null,                      start_at: '2026-06-09T09:00:00', end_at: null, all_day: true,  color: null, created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'e06', family_id: 'f1', child_id: '1',  title: 'Revisión dental Ana',    description: null,                      start_at: '2026-06-11T11:30:00', end_at: null, all_day: false, color: null, created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'e07', family_id: 'f1', child_id: null, title: 'Parque con los abuelos', description: null,                      start_at: '2026-06-13T11:00:00', end_at: null, all_day: false, color: null, created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'e09', family_id: 'f1', child_id: '1',  title: 'Tutoría colegio Ana',    description: 'Con la tutora Lucía',     start_at: '2026-06-15T17:00:00', end_at: null, all_day: false, color: null, created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'e10', family_id: 'f1', child_id: null, title: 'Cumple papá',            description: null,                      start_at: '2026-06-17T20:00:00', end_at: null, all_day: false, color: null, created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'e12', family_id: 'f1', child_id: '1',  title: 'Excursión colegio',      description: 'Llevar almuerzo',         start_at: '2026-06-19T08:00:00', end_at: null, all_day: true,  color: null, created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'e14', family_id: 'f1', child_id: null, title: 'Teatro familiar',        description: 'Teatro Español - 18:30h', start_at: '2026-06-24T18:30:00', end_at: null, all_day: false, color: null, created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'e15', family_id: 'f1', child_id: '1',  title: 'Fin de curso Ana',       description: null,                      start_at: '2026-06-25T09:00:00', end_at: null, all_day: true,  color: null, created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'e17', family_id: 'f1', child_id: null, title: 'Cena con amigos',        description: null,                      start_at: '2026-06-27T21:00:00', end_at: null, all_day: false, color: null, created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'e18', family_id: 'f1', child_id: null, title: 'Escapada fin de semana', description: 'Sierra de Guadarrama',    start_at: '2026-06-29T10:00:00', end_at: null, all_day: true,  color: null, created_by: 'u1', created_at: '', updated_at: '' },
]

let tasks: Task[] = [
  { id: 't1', family_id: 'f1', title: 'Comprar medicación Ana',          notes: 'Farmacia Goya, pasillo 3',         priority: 'high',   due_date: '2026-06-14', recurrence: 'none',  recurrence_end: null,         completed: false, completed_at: null,                  created_by: 'u1', created_at: '2026-06-10T09:00:00', updated_at: '2026-06-10T09:00:00' },
  { id: 't3', family_id: 'f1', title: 'Llamar al cole de Ana',           notes: 'Preguntar horario de verano',      priority: 'medium', due_date: '2026-06-16', recurrence: 'none',  recurrence_end: null,         completed: false, completed_at: null,                  created_by: 'u1', created_at: '2026-06-12T08:00:00', updated_at: '2026-06-12T08:00:00' },
  { id: 't4', family_id: 'f1', title: 'Pedir cita pediatra septiembre',  notes: 'Revisión anual Ana',               priority: 'low',    due_date: '2026-06-30', recurrence: 'none',  recurrence_end: null,         completed: false, completed_at: null,                  created_by: 'u1', created_at: '2026-06-13T11:00:00', updated_at: '2026-06-13T11:00:00' },
  { id: 't5', family_id: 'f1', title: 'Preparar mochila excursión Ana',  notes: null,                               priority: 'high',   due_date: '2026-06-18', recurrence: 'none',  recurrence_end: null,         completed: false, completed_at: null,                  created_by: 'u1', created_at: '2026-06-14T07:00:00', updated_at: '2026-06-14T07:00:00' },
  { id: 't8', family_id: 'f1', title: 'Medicación Ana',                  notes: 'Amoxicilina — después de desayuno', priority: 'high',  due_date: '2026-06-17', recurrence: 'daily', recurrence_end: '2026-06-30', completed: false, completed_at: null,                  created_by: 'u1', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
  { id: 't6', family_id: 'f1', title: 'Comprar material escolar',        notes: null,                               priority: 'medium', due_date: null,         recurrence: 'none',  recurrence_end: null,         completed: true,  completed_at: '2026-06-14T18:00:00', created_by: 'u1', created_at: '2026-06-13T20:00:00', updated_at: '2026-06-14T18:00:00' },
  { id: 't7', family_id: 'f1', title: 'Mandar fotos del cumple al cole', notes: null,                               priority: 'low',    due_date: null,         recurrence: 'none',  recurrence_end: null,         completed: true,  completed_at: '2026-06-13T10:00:00', created_by: 'u1', created_at: '2026-06-12T09:00:00', updated_at: '2026-06-13T10:00:00' },
]

let lists: List[] = [
  { id: 'l1', family_id: 'f1', name: 'Compra',      emoji: '🛒', color: null, created_by: 'u1', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
  { id: 'l2', family_id: 'f1', name: 'Farmacia',    emoji: '💊', color: null, created_by: 'u1', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
  { id: 'l3', family_id: 'f1', name: 'Cole de Ana', emoji: '🎒', color: null, created_by: 'u1', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
]

let listItems: ListItem[] = [
  { id: 'li1', list_id: 'l1', family_id: 'f1', text: 'Pañales talla 5',     completed: false, completed_at: null,                  completed_by: null, sort_order: 0, created_by: 'u1', created_at: '2026-06-10T00:00:00' },
  { id: 'li2', list_id: 'l1', family_id: 'f1', text: 'Leche entera',        completed: false, completed_at: null,                  completed_by: null, sort_order: 1, created_by: 'u1', created_at: '2026-06-10T00:00:00' },
  { id: 'li3', list_id: 'l1', family_id: 'f1', text: 'Fruta variada',       completed: true,  completed_at: '2026-06-15T10:00:00', completed_by: 'u1', sort_order: 2, created_by: 'u1', created_at: '2026-06-10T00:00:00' },
  { id: 'li4', list_id: 'l1', family_id: 'f1', text: 'Pan de molde',        completed: false, completed_at: null,                  completed_by: null, sort_order: 3, created_by: 'u1', created_at: '2026-06-11T00:00:00' },
  { id: 'li5', list_id: 'l2', family_id: 'f1', text: 'Ibuprofeno infantil', completed: false, completed_at: null,                  completed_by: null, sort_order: 0, created_by: 'u1', created_at: '2026-06-12T00:00:00' },
  { id: 'li6', list_id: 'l2', family_id: 'f1', text: 'Tiritas',             completed: false, completed_at: null,                  completed_by: null, sort_order: 1, created_by: 'u1', created_at: '2026-06-12T00:00:00' },
  { id: 'li7', list_id: 'l3', family_id: 'f1', text: 'Cuaderno A4',        completed: true,  completed_at: '2026-06-14T08:00:00', completed_by: 'u1', sort_order: 0, created_by: 'u1', created_at: '2026-06-13T00:00:00' },
  { id: 'li8', list_id: 'l3', family_id: 'f1', text: 'Pegamento en barra', completed: false, completed_at: null,                  completed_by: null, sort_order: 1, created_by: 'u1', created_at: '2026-06-13T00:00:00' },
]

let mealPlans: MealPlan[] = [
  { id: 'mp01', family_id: 'f1', date: '2026-06-14', slot: 'lunch',  name: 'Lentejas con chorizo',    notes: null,          created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'mp02', family_id: 'f1', date: '2026-06-14', slot: 'dinner', name: 'Ensalada mixta',          notes: null,          created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'mp03', family_id: 'f1', date: '2026-06-15', slot: 'lunch',  name: 'Macarrones con tomate',   notes: null,          created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'mp04', family_id: 'f1', date: '2026-06-15', slot: 'dinner', name: 'Tortilla de patatas',     notes: 'Sin cebolla', created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'mp05', family_id: 'f1', date: '2026-06-16', slot: 'lunch',  name: 'Arroz con pollo',         notes: null,          created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'mp06', family_id: 'f1', date: '2026-06-16', slot: 'dinner', name: 'Crema de verduras',       notes: null,          created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'mp07', family_id: 'f1', date: '2026-06-17', slot: 'lunch',  name: 'Merluza al horno',        notes: null,          created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'mp08', family_id: 'f1', date: '2026-06-17', slot: 'dinner', name: 'Gazpacho y tostadas',     notes: null,          created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'mp09', family_id: 'f1', date: '2026-06-18', slot: 'lunch',  name: 'Albóndigas',              notes: 'Con patatas', created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'mp10', family_id: 'f1', date: '2026-06-18', slot: 'dinner', name: 'Revuelto de champiñones', notes: null,          created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'mp11', family_id: 'f1', date: '2026-06-19', slot: 'lunch',  name: 'Paella familiar',         notes: null,          created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'mp12', family_id: 'f1', date: '2026-06-19', slot: 'dinner', name: 'Ensalada y pollo',        notes: null,          created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'mp13', family_id: 'f1', date: '2026-06-20', slot: 'lunch',  name: 'Croquetas caseras',       notes: null,          created_by: 'u1', created_at: '', updated_at: '' },
  { id: 'mp14', family_id: 'f1', date: '2026-06-20', slot: 'dinner', name: 'Sopa de verduras',        notes: null,          created_by: 'u1', created_at: '', updated_at: '' },
]

let documents: Document[] = [
  { id: 'd1', family_id: 'f1', child_id: '1',  name: 'Cartilla vacunas Ana',   description: null,                     category: 'salud',    storage_path: 'mock/vacunas-ana.pdf',   mime_type: 'application/pdf', size_bytes: 245760,  created_by: 'u1', created_at: '2026-05-10T00:00:00', updated_at: '2026-05-10T00:00:00' },
  { id: 'd3', family_id: 'f1', child_id: '1',  name: 'Contrato comedor Ana',   description: 'Matriculación sep 2026', category: 'colegio',  storage_path: 'mock/contrato-ana.pdf',  mime_type: 'application/pdf', size_bytes: 512000,  created_by: 'u1', created_at: '2026-04-01T00:00:00', updated_at: '2026-04-01T00:00:00' },
  { id: 'd4', family_id: 'f1', child_id: null, name: 'Seguro médico familiar', description: null,                     category: 'personal', storage_path: 'mock/seguro.pdf',        mime_type: 'application/pdf', size_bytes: 1048576, created_by: 'u1', created_at: '2026-01-15T00:00:00', updated_at: '2026-01-15T00:00:00' },
  { id: 'd5', family_id: 'f1', child_id: null, name: 'DNI Laura',              description: null,                     category: 'personal', storage_path: 'mock/dni-laura.jpg',     mime_type: 'image/jpeg',      size_bytes: 102400,  created_by: 'u1', created_at: '2026-02-20T00:00:00', updated_at: '2026-02-20T00:00:00' },
]

// ─── Persistencia localStorage ────────────────────────────────────────────────

const STORAGE_KEY  = 'nido_store_v1'
const SCHEMA_VER   = 4  // v4: recurrence + recurrence_end en tasks

export function loadFromStorage(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const d = JSON.parse(raw)

    // Si no hay versión o es antigua, descartar y usar defaults
    if (!d._v || d._v < SCHEMA_VER) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    if (Array.isArray(d.families))  families  = d.families
    if (Array.isArray(d.members))   members   = d.members
    if (Array.isArray(d.invites))   invites   = d.invites
    if (Array.isArray(d.kids))      kids      = d.kids
    if (Array.isArray(d.events))    events    = d.events
    if (Array.isArray(d.tasks))     tasks     = d.tasks
    if (Array.isArray(d.lists))     lists     = d.lists
    if (Array.isArray(d.listItems)) listItems = d.listItems
    if (Array.isArray(d.mealPlans)) mealPlans = d.mealPlans
    if (Array.isArray(d.documents)) documents = d.documents
  } catch {
    // Datos corruptos → limpiar y usar defaults
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function persistAll(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      _v: SCHEMA_VER,
      families, members, invites, kids, events, tasks, lists, listItems, mealPlans, documents,
    }))
  } catch { /* ignore */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEventFromDraft(familyId: string, draft: EventDraft): Event {
  const now = new Date().toISOString()
  const start_at = buildLocalDateTime(draft.date, draft.all_day ? '00:00' : (draft.start_time || '00:00'))
  const end_at = !draft.all_day && draft.end_time
    ? buildLocalDateTime(draft.date, draft.end_time)
    : null
  return {
    id: crypto.randomUUID(),
    family_id: familyId,
    child_id: draft.child_id,
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    start_at, end_at,
    all_day: draft.all_day,
    color: null,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
}

function applyEventDraft(event: Event, draft: EventDraft): Event {
  const start_at = buildLocalDateTime(draft.date, draft.all_day ? '00:00' : (draft.start_time || '00:00'))
  const end_at = !draft.all_day && draft.end_time
    ? buildLocalDateTime(draft.date, draft.end_time)
    : null
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

// ─── Lecturas ─────────────────────────────────────────────────────────────────

export function getFamily(familyId: string): Family | undefined {
  return families.find(f => f.id === familyId)
}

export function getMembers(familyId: string): FamilyMember[] {
  return members.filter(m => m.family_id === familyId)
}

export function getKids(familyId: string): Child[] {
  return kids.filter(c => c.family_id === familyId)
}

export function getEvents(familyId: string): Event[] {
  return events.filter(e => e.family_id === familyId)
}

export function getTodayEvents(familyId: string): Event[] {
  const today = new Date().toDateString()
  return getEvents(familyId).filter(e => new Date(e.start_at).toDateString() === today)
}

export function getUpcomingEvents(familyId: string, limit = 5): Event[] {
  const now = new Date()
  const todayStr = now.toDateString()
  return getEvents(familyId)
    .filter(e => { const d = new Date(e.start_at); return d.toDateString() !== todayStr && d > now })
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, limit)
}

export function getTasks(familyId: string): Task[] {
  return tasks.filter(t => t.family_id === familyId)
}

export function getLists(familyId: string): List[] {
  return lists.filter(l => l.family_id === familyId)
}

export function getListItems(familyId: string): ListItem[] {
  return listItems.filter(i => i.family_id === familyId)
}

export function getPendingItems(familyId: string): PendingItem[] {
  const familyLists = getLists(familyId)
  return getListItems(familyId)
    .filter(i => !i.completed)
    .map(i => ({ ...i, list_name: familyLists.find(l => l.id === i.list_id)?.name ?? '' }))
}

export function getMeals(familyId: string): MealPlan[] {
  return mealPlans.filter(m => m.family_id === familyId)
}

export function getTodayMeals(familyId: string): MealPlan[] {
  const today = getLocalDateString()
  return getMeals(familyId).filter(m => m.date === today)
}

export function getDocuments(familyId: string): Document[] {
  return documents.filter(d => d.family_id === familyId)
}

// ─── Escrituras: familia ──────────────────────────────────────────────────────

export function setFamilyName(familyId: string, name: string): Family {
  families = families.map(f => f.id !== familyId ? f : { ...f, name, updated_at: new Date().toISOString() })
  return families.find(f => f.id === familyId)!
}

// ─── Lecturas: invitaciones ───────────────────────────────────────────────────

export function getInvites(familyId: string): FamilyInvite[] {
  return invites.filter(i => i.family_id === familyId && i.status === 'pending')
}

// ─── Escrituras: miembros ─────────────────────────────────────────────────────

export function createInvite(familyId: string, email: string): FamilyInvite {
  // Cancelar invitación pendiente previa al mismo email (upsert semántico)
  invites = invites.map(i =>
    i.family_id === familyId && i.email.toLowerCase() === email.toLowerCase() && i.status === 'pending'
      ? { ...i, status: 'cancelled' as const }
      : i
  )
  const invite: FamilyInvite = {
    id: crypto.randomUUID(),
    family_id: familyId,
    email: email.trim(),
    role: 'member',
    status: 'pending',
    invited_by: 'u1',
    accepted_at: null,
    created_at: new Date().toISOString(),
  }
  invites = [...invites, invite]
  return invite
}

export function cancelInvite(id: string): void {
  invites = invites.map(i => i.id !== id ? i : { ...i, status: 'cancelled' as const })
}

export function updateMemberName(id: string, name: string): void {
  members = members.map(m => m.id !== id ? m : { ...m, display_name: name })
}

export function removeMember(id: string): void {
  members = members.filter(m => m.id !== id)
}

// ─── Escrituras: hijos ────────────────────────────────────────────────────────

export function createKid(familyId: string, draft: ChildDraft): Child {
  const c: Child = {
    id: crypto.randomUUID(),
    family_id: familyId,
    name: draft.name.trim(),
    birth_date: draft.birth_date || null,
    color: draft.color,
    created_at: new Date().toISOString(),
  }
  kids = [...kids, c]
  return c
}

export function updateKid(id: string, draft: ChildDraft): void {
  kids = kids.map(c => c.id !== id ? c : { ...c, name: draft.name.trim(), birth_date: draft.birth_date || null, color: draft.color })
}

export function deleteKid(id: string): void {
  kids = kids.filter(c => c.id !== id)
  // Mirrors ON DELETE SET NULL: clear child_id references in events and documents
  events = events.map(e => e.child_id === id ? { ...e, child_id: null } : e)
  documents = documents.map(d => d.child_id === id ? { ...d, child_id: null } : d)
}

// ─── Escrituras: eventos ──────────────────────────────────────────────────────

export function createEvent(familyId: string, draft: EventDraft): Event {
  const e = buildEventFromDraft(familyId, draft)
  events = [...events, e]
  return e
}

export function updateEvent(id: string, draft: EventDraft): void {
  events = events.map(e => e.id !== id ? e : applyEventDraft(e, draft))
}

export function deleteEvent(id: string): void {
  events = events.filter(e => e.id !== id)
}

// ─── Escrituras: tareas ───────────────────────────────────────────────────────

function nextDueDate(current: string | null, recurrence: TaskRecurrence): string {
  const base = current ? new Date(current + 'T12:00:00') : new Date()
  if (recurrence === 'daily')   base.setDate(base.getDate() + 1)
  if (recurrence === 'weekly')  base.setDate(base.getDate() + 7)
  if (recurrence === 'monthly') base.setMonth(base.getMonth() + 1)
  return getLocalDateString(base)
}

export function createTask(familyId: string, draft: TaskDraft): Task {
  const now = new Date().toISOString()
  const t: Task = {
    id: crypto.randomUUID(),
    family_id: familyId,
    title: draft.title.trim(),
    notes: draft.notes.trim() || null,
    priority: draft.priority,
    due_date: draft.due_date || null,
    recurrence: draft.recurrence,
    recurrence_end: draft.recurrence_end || null,
    completed: false,
    completed_at: null,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
  tasks = [...tasks, t]
  return t
}

export function updateTask(id: string, draft: TaskDraft): void {
  tasks = tasks.map(t => t.id !== id ? t : {
    ...t,
    title: draft.title.trim(),
    notes: draft.notes.trim() || null,
    priority: draft.priority,
    due_date: draft.due_date || null,
    recurrence: draft.recurrence,
    recurrence_end: draft.recurrence_end || null,
    updated_at: new Date().toISOString(),
  })
}

export function deleteTask(id: string): void {
  tasks = tasks.filter(t => t.id !== id)
}

export function toggleTask(id: string): void {
  const now = new Date().toISOString()
  tasks = tasks.map(t => {
    if (t.id !== id) return t
    // Completar tarea no recurrente → marcar como completa
    if (t.completed || t.recurrence === 'none') {
      return { ...t, completed: !t.completed, completed_at: !t.completed ? now : null, updated_at: now }
    }
    // Completar tarea recurrente → avanzar la fecha en vez de marcar como completa
    const next = nextDueDate(t.due_date, t.recurrence)
    const seriesDone = t.recurrence_end ? next > t.recurrence_end : false
    if (seriesDone) {
      // Serie terminada: marcar como completada definitivamente
      return { ...t, completed: true, completed_at: now, updated_at: now }
    }
    // Avanzar al próximo vencimiento
    return { ...t, due_date: next, updated_at: now }
  })
}

// ─── Escrituras: listas ───────────────────────────────────────────────────────

export function createList(familyId: string, draft: ListDraft): List {
  const now = new Date().toISOString()
  const l: List = {
    id: crypto.randomUUID(),
    family_id: familyId,
    name: draft.name.trim(),
    emoji: draft.emoji || null,
    color: null,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
  lists = [...lists, l]
  return l
}

export function updateList(id: string, draft: ListDraft): void {
  lists = lists.map(l => l.id !== id ? l : {
    ...l, name: draft.name.trim(), emoji: draft.emoji || null, updated_at: new Date().toISOString(),
  })
}

export function deleteList(id: string): void {
  lists = lists.filter(l => l.id !== id)
  listItems = listItems.filter(i => i.list_id !== id)
}

// ─── Escrituras: ítems de lista ───────────────────────────────────────────────

export function createListItem(listId: string, familyId: string, draft: ListItemDraft): ListItem {
  const maxOrder = listItems.filter(i => i.list_id === listId).reduce((m, i) => Math.max(m, i.sort_order), -1)
  const item: ListItem = {
    id: crypto.randomUUID(),
    list_id: listId,
    family_id: familyId,
    text: draft.text.trim(),
    completed: false,
    completed_at: null,
    completed_by: null,
    sort_order: maxOrder + 1,
    created_by: 'u1',
    created_at: new Date().toISOString(),
  }
  listItems = [...listItems, item]
  return item
}

export function updateListItem(id: string, draft: ListItemDraft): void {
  listItems = listItems.map(i => i.id !== id ? i : { ...i, text: draft.text.trim() })
}

export function deleteListItem(id: string): void {
  listItems = listItems.filter(i => i.id !== id)
}

export function toggleListItem(id: string): void {
  const now = new Date().toISOString()
  listItems = listItems.map(i => i.id !== id ? i : {
    ...i,
    completed: !i.completed,
    completed_at: !i.completed ? now : null,
    completed_by: !i.completed ? 'u1' : null,
  })
}

// ─── Escrituras: comidas ──────────────────────────────────────────────────────

export function createMeal(familyId: string, draft: MealDraft): MealPlan {
  // Upsert: mirrors unique(family_id, date, slot) — update existing instead of creating a duplicate
  const existing = mealPlans.find(
    m => m.family_id === familyId && m.date === draft.date && m.slot === draft.slot
  )
  if (existing) {
    updateMeal(existing.id, draft)
    return mealPlans.find(m => m.id === existing.id)!
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
  mealPlans = [...mealPlans, m]
  return m
}

export function updateMeal(id: string, draft: MealDraft): void {
  mealPlans = mealPlans.map(m => m.id !== id ? m : {
    ...m,
    date: draft.date,
    slot: draft.slot,
    name: draft.name.trim(),
    notes: draft.notes.trim() || null,
    updated_at: new Date().toISOString(),
  })
}

export function deleteMeal(id: string): void {
  mealPlans = mealPlans.filter(m => m.id !== id)
}

// ─── Escrituras: documentos ───────────────────────────────────────────────────

export function createDocument(familyId: string, draft: DocumentDraft): Document {
  const now = new Date().toISOString()
  const safeName = draft.name.trim().toLowerCase().replace(/\s+/g, '-')
  const ext = draft.mime_type === 'image/jpeg' ? 'jpg' : draft.mime_type === 'image/png' ? 'png' : 'pdf'
  const doc: Document = {
    id: crypto.randomUUID(),
    family_id: familyId,
    child_id: draft.child_id,
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    category: draft.category || null,  // empty string → null
    storage_path: `mock/${Date.now()}_${safeName}.${ext}`,
    mime_type: draft.mime_type,
    size_bytes: draft.size_bytes,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
  documents = [...documents, doc]
  return doc
}

export function updateDocument(id: string, draft: DocumentDraft): void {
  documents = documents.map(d => d.id !== id ? d : {
    ...d,
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    category: draft.category || null,
    child_id: draft.child_id,
    updated_at: new Date().toISOString(),
  })
}

export function deleteDocument(id: string): void {
  documents = documents.filter(d => d.id !== id)
}

// ─── Multi-familia ────────────────────────────────────────────────────────────

export function createFamily(name: string): Family {
  const now = new Date().toISOString()
  const f: Family = { id: crypto.randomUUID(), name: name.trim(), created_at: now, updated_at: now }
  families = [...families, f]
  // Crea un miembro admin demo coherente con el usuario de prueba
  const adminMember: FamilyMember = {
    id: crypto.randomUUID(),
    family_id: f.id,
    user_id: 'u1',
    display_name: 'Laura',
    avatar_url: null,
    role: 'admin',
    created_at: now,
  }
  members = [...members, adminMember]
  return f
}

export function getFamilies(): Family[] {
  return families
}
