'use client'

import { createContext, useContext, useState } from 'react'
import * as store from './mock-store'
import { DEFAULT_FAMILY_ID, writeActiveFamilyId } from './family-config'
import { selectTodayMeals, selectPendingItems } from './selectors'
import type {
  Family, FamilyMember, FamilyInvite, Child, Event, Task, MealPlan, List, ListItem, Document,
  ChildDraft, EventDraft, TaskDraft, MealDraft, ListDraft, ListItemDraft, DocumentDraft,
  PendingItem,
} from '@/types'

// Cargar localStorage una vez en el cliente al importar el módulo
if (typeof window !== 'undefined') {
  store.loadFromStorage()
}

interface StoreValue {
  // Familia activa
  activeFamilyId: string
  families: Family[]
  switchFamily: (id: string) => void
  createFamily: (name: string) => void
  // Estado
  family: Family
  members: FamilyMember[]
  invites: FamilyInvite[]
  kids: Child[]
  allEvents: Event[]
  tasks: Task[]
  lists: List[]
  allListItems: ListItem[]
  meals: MealPlan[]
  documents: Document[]
  // Derivados
  todayMeals: MealPlan[]
  pendingItems: PendingItem[]
  // Familia
  updateFamilyName: (name: string) => void
  // Miembros
  inviteMember: (email: string) => void
  updateMember: (id: string, name: string) => void
  removeMember: (id: string) => void
  cancelInvite: (id: string) => void
  // Hijos
  createKid: (draft: ChildDraft) => void
  updateKid: (id: string, draft: ChildDraft) => void
  deleteKid: (id: string) => void
  // Eventos
  createEvent: (draft: EventDraft) => Event
  updateEvent: (id: string, draft: EventDraft) => void
  deleteEvent: (id: string) => void
  // Tareas
  createTask: (draft: TaskDraft) => void
  updateTask: (id: string, draft: TaskDraft) => void
  deleteTask: (id: string) => void
  toggleTask: (id: string) => void
  // Listas
  createList: (draft: ListDraft) => void
  updateList: (id: string, draft: ListDraft) => void
  deleteList: (id: string) => void
  createListItem: (listId: string, draft: ListItemDraft) => void
  updateListItem: (id: string, draft: ListItemDraft) => void
  deleteListItem: (id: string) => void
  toggleListItem: (id: string) => void
  // Comidas
  createMeal: (draft: MealDraft) => void
  updateMeal: (id: string, draft: MealDraft) => void
  deleteMeal: (id: string) => void
  // Documentos
  createDocument: (draft: DocumentDraft) => void
  updateDocument: (id: string, draft: DocumentDraft) => void
  deleteDocument: (id: string) => void
}

const StoreCtx = createContext<StoreValue>(null!)

interface StoreProviderProps {
  children: React.ReactNode
  familyId: string
  switchFamily: (id: string) => void
}

export function StoreProvider({ children, familyId, switchFamily }: StoreProviderProps) {
  // Validate familyId — fall back to DEFAULT if the stored ID no longer exists
  const effectiveFid = store.getFamily(familyId) ? familyId : DEFAULT_FAMILY_ID
  if (effectiveFid !== familyId && typeof window !== 'undefined') {
    writeActiveFamilyId(effectiveFid)
  }
  const fid = effectiveFid

  const [family,       setFamily]    = useState<Family>(() => store.getFamily(fid)!)
  const [families,     setFamilies]  = useState<Family[]>(() => store.getFamilies())
  const [members,      setMembers]   = useState<FamilyMember[]>(() => store.getMembers(fid))
  const [invites,      setInvites]   = useState<FamilyInvite[]>(() => store.getInvites(fid))
  const [kids,         setKids]      = useState<Child[]>(() => store.getKids(fid))
  const [allEvents,    setEvents]    = useState<Event[]>(() => store.getEvents(fid))
  const [tasks,        setTasks]     = useState<Task[]>(() => store.getTasks(fid))
  const [lists,        setLists]     = useState<List[]>(() => store.getLists(fid))
  const [allListItems, setListItems] = useState<ListItem[]>(() => store.getListItems(fid))
  const [meals,        setMeals]     = useState<MealPlan[]>(() => store.getMeals(fid))
  const [documents,    setDocuments] = useState<Document[]>(() => store.getDocuments(fid))

  // Derivados calculados en cada render
  const todayMeals   = selectTodayMeals(meals)
  const pendingItems = selectPendingItems(allListItems, lists)

  // ── Familias (gestión multi-familia) ──────────────────────────────────────
  const createFamily = (name: string) => {
    const f = store.createFamily(name)
    setFamilies(store.getFamilies())
    store.persistAll()
    switchFamily(f.id)
  }

  // ── Familia ────────────────────────────────────────────────────────────────
  const updateFamilyName = (name: string) => {
    setFamily(store.setFamilyName(fid, name))
    store.persistAll()
  }

  // ── Miembros ───────────────────────────────────────────────────────────────
  const inviteMember = (email: string) => {
    store.createInvite(fid, email)
    setInvites(store.getInvites(fid))
    store.persistAll()
  }
  const cancelInvite = (id: string) => {
    store.cancelInvite(id)
    setInvites(store.getInvites(fid))
    store.persistAll()
  }
  const updateMember = (id: string, name: string) => {
    store.updateMemberName(id, name)
    setMembers(store.getMembers(fid))
    store.persistAll()
  }
  const removeMember = (id: string) => {
    store.removeMember(id)
    setMembers(store.getMembers(fid))
    store.persistAll()
  }

  // ── Hijos ──────────────────────────────────────────────────────────────────
  const createKid = (draft: ChildDraft) => {
    store.createKid(fid, draft)
    setKids(store.getKids(fid))
    store.persistAll()
  }
  const updateKid = (id: string, draft: ChildDraft) => {
    store.updateKid(id, draft)
    setKids(store.getKids(fid))
    store.persistAll()
  }
  const deleteKid = (id: string) => {
    store.deleteKid(id)
    setKids(store.getKids(fid))
    // deleteKid nullifies child_id in events and documents (mirrors ON DELETE SET NULL)
    setEvents(store.getEvents(fid))
    setDocuments(store.getDocuments(fid))
    store.persistAll()
  }

  // ── Eventos ────────────────────────────────────────────────────────────────
  const createEvent = (draft: EventDraft): Event => {
    const e = store.createEvent(fid, draft)
    setEvents(store.getEvents(fid))
    store.persistAll()
    return e
  }
  const updateEvent = (id: string, draft: EventDraft) => {
    store.updateEvent(id, draft)
    setEvents(store.getEvents(fid))
    store.persistAll()
  }
  const deleteEvent = (id: string) => {
    store.deleteEvent(id)
    setEvents(store.getEvents(fid))
    store.persistAll()
  }

  // ── Tareas ─────────────────────────────────────────────────────────────────
  const createTask = (draft: TaskDraft) => {
    store.createTask(fid, draft)
    setTasks(store.getTasks(fid))
    store.persistAll()
  }
  const updateTask = (id: string, draft: TaskDraft) => {
    store.updateTask(id, draft)
    setTasks(store.getTasks(fid))
    store.persistAll()
  }
  const deleteTask = (id: string) => {
    store.deleteTask(id)
    setTasks(store.getTasks(fid))
    store.persistAll()
  }
  const toggleTask = (id: string) => {
    store.toggleTask(id)
    setTasks(store.getTasks(fid))
    store.persistAll()
  }

  // ── Listas ─────────────────────────────────────────────────────────────────
  const createList = (draft: ListDraft) => {
    store.createList(fid, draft)
    setLists(store.getLists(fid))
    store.persistAll()
  }
  const updateList = (id: string, draft: ListDraft) => {
    store.updateList(id, draft)
    setLists(store.getLists(fid))
    store.persistAll()
  }
  const deleteList = (id: string) => {
    store.deleteList(id)
    setLists(store.getLists(fid))
    setListItems(store.getListItems(fid))
    store.persistAll()
  }
  const createListItem = (listId: string, draft: ListItemDraft) => {
    store.createListItem(listId, fid, draft)
    setListItems(store.getListItems(fid))
    store.persistAll()
  }
  const updateListItem = (id: string, draft: ListItemDraft) => {
    store.updateListItem(id, draft)
    setListItems(store.getListItems(fid))
    store.persistAll()
  }
  const deleteListItem = (id: string) => {
    store.deleteListItem(id)
    setListItems(store.getListItems(fid))
    store.persistAll()
  }
  const toggleListItem = (id: string) => {
    store.toggleListItem(id)
    setListItems(store.getListItems(fid))
    store.persistAll()
  }

  // ── Comidas ────────────────────────────────────────────────────────────────
  const createMeal = (draft: MealDraft) => {
    store.createMeal(fid, draft)
    setMeals(store.getMeals(fid))
    store.persistAll()
  }
  const updateMeal = (id: string, draft: MealDraft) => {
    store.updateMeal(id, draft)
    setMeals(store.getMeals(fid))
    store.persistAll()
  }
  const deleteMeal = (id: string) => {
    store.deleteMeal(id)
    setMeals(store.getMeals(fid))
    store.persistAll()
  }

  // ── Documentos ─────────────────────────────────────────────────────────────
  const createDocument = (draft: DocumentDraft) => {
    store.createDocument(fid, draft)
    setDocuments(store.getDocuments(fid))
    store.persistAll()
  }
  const updateDocument = (id: string, draft: DocumentDraft) => {
    store.updateDocument(id, draft)
    setDocuments(store.getDocuments(fid))
    store.persistAll()
  }
  const deleteDocument = (id: string) => {
    store.deleteDocument(id)
    setDocuments(store.getDocuments(fid))
    store.persistAll()
  }

  return (
    <StoreCtx.Provider value={{
      activeFamilyId: fid, families, switchFamily, createFamily,
      family, members, invites, kids, allEvents, tasks,
      lists, allListItems, meals, documents,
      todayMeals, pendingItems,
      updateFamilyName,
      inviteMember, updateMember, removeMember, cancelInvite,
      createKid, updateKid, deleteKid,
      createEvent, updateEvent, deleteEvent,
      createTask, updateTask, deleteTask, toggleTask,
      createList, updateList, deleteList,
      createListItem, updateListItem, deleteListItem, toggleListItem,
      createMeal, updateMeal, deleteMeal,
      createDocument, updateDocument, deleteDocument,
    }}>
      {children}
    </StoreCtx.Provider>
  )
}

export function useStore(): StoreValue {
  return useContext(StoreCtx)
}
