'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import * as store from './mock-store'
import { DEFAULT_FAMILY_ID, writeActiveFamilyId } from './family-config'
import { selectPendingItems, selectPendingTasks, selectTodayMeals } from './selectors'
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
  PendingItem,
  Task,
  TaskDraft,
} from '@/types'

if (typeof window !== 'undefined') {
  store.loadFromStorage()
}

interface StoreValue {
  activeFamilyId: string
  families: Family[]
  switchFamily: (id: string) => void
  createFamily: (name: string) => void
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
  todayMeals: MealPlan[]
  pendingTasks: Task[]
  pendingItems: PendingItem[]
  updateFamilyName: (name: string) => void
  inviteMember: (email: string) => void
  updateMember: (id: string, name: string) => void
  removeMember: (id: string) => void
  cancelInvite: (id: string) => void
  createKid: (draft: ChildDraft) => void
  updateKid: (id: string, draft: ChildDraft) => void
  deleteKid: (id: string) => void
  createEvent: (draft: EventDraft) => Event
  createEventSeries: (draft: EventDraft, weekdays: number[], endDate: string) => Event[]
  updateEvent: (id: string, draft: EventDraft) => void
  deleteEvent: (id: string) => void
  createTask: (draft: TaskDraft) => void
  updateTask: (id: string, draft: TaskDraft) => void
  deleteTask: (id: string) => void
  toggleTask: (id: string) => void
  createList: (draft: ListDraft) => void
  updateList: (id: string, draft: ListDraft) => void
  deleteList: (id: string) => void
  createListItem: (listId: string, draft: ListItemDraft) => void
  updateListItem: (id: string, draft: ListItemDraft) => void
  deleteListItem: (id: string) => void
  toggleListItem: (id: string) => void
  createMeal: (draft: MealDraft) => void
  updateMeal: (id: string, draft: MealDraft) => void
  deleteMeal: (id: string) => void
  createDocument: (draft: DocumentDraft) => void
  updateDocument: (id: string, draft: DocumentDraft) => void
  deleteDocument: (id: string) => void
}

type StoreActions = Pick<
  StoreValue,
  | 'switchFamily'
  | 'createFamily'
  | 'updateFamilyName'
  | 'inviteMember'
  | 'updateMember'
  | 'removeMember'
  | 'cancelInvite'
  | 'createKid'
  | 'updateKid'
  | 'deleteKid'
  | 'createEvent'
  | 'createEventSeries'
  | 'updateEvent'
  | 'deleteEvent'
  | 'createTask'
  | 'updateTask'
  | 'deleteTask'
  | 'toggleTask'
  | 'createList'
  | 'updateList'
  | 'deleteList'
  | 'createListItem'
  | 'updateListItem'
  | 'deleteListItem'
  | 'toggleListItem'
  | 'createMeal'
  | 'updateMeal'
  | 'deleteMeal'
  | 'createDocument'
  | 'updateDocument'
  | 'deleteDocument'
>

const StoreCtx = createContext<StoreValue>(null!)

interface StoreProviderProps {
  children: React.ReactNode
  familyId: string
  switchFamily: (id: string) => void
}

export function StoreProvider({ children, familyId, switchFamily }: StoreProviderProps) {
  const effectiveFid = store.getFamily(familyId) ? familyId : DEFAULT_FAMILY_ID
  if (effectiveFid !== familyId && typeof window !== 'undefined') {
    writeActiveFamilyId(effectiveFid)
  }
  const fid = effectiveFid

  const [family, setFamily] = useState<Family>(() => store.getFamily(fid)!)
  const [families, setFamilies] = useState<Family[]>(() => store.getFamilies())
  const [members, setMembers] = useState<FamilyMember[]>(() => store.getMembers(fid))
  const [invites, setInvites] = useState<FamilyInvite[]>(() => store.getInvites(fid))
  const [kids, setKids] = useState<Child[]>(() => store.getKids(fid))
  const [allEvents, setEvents] = useState<Event[]>(() => store.getEvents(fid))
  const [tasks, setTasks] = useState<Task[]>(() => store.getTasks(fid))
  const [lists, setLists] = useState<List[]>(() => store.getLists(fid))
  const [allListItems, setListItems] = useState<ListItem[]>(() => store.getListItems(fid))
  const [meals, setMeals] = useState<MealPlan[]>(() => store.getMeals(fid))
  const [documents, setDocuments] = useState<Document[]>(() => store.getDocuments(fid))

  const todayMeals = useMemo(() => selectTodayMeals(meals), [meals])
  const pendingTasks = useMemo(() => selectPendingTasks(tasks), [tasks])
  const pendingItems = useMemo(() => selectPendingItems(allListItems, lists), [allListItems, lists])

  const actions = useMemo<StoreActions>(() => {
    function mutate<T>(action: () => T, ...refresh: Array<() => void>): T {
      const result = action()
      for (const refreshSlice of refresh) refreshSlice()
      store.persistAll()
      return result
    }

    const refreshFamily = () => setFamily(store.getFamily(fid)!)
    const refreshFamilies = () => setFamilies(store.getFamilies())
    const refreshMembers = () => setMembers(store.getMembers(fid))
    const refreshInvites = () => setInvites(store.getInvites(fid))
    const refreshKids = () => setKids(store.getKids(fid))
    const refreshEvents = () => setEvents(store.getEvents(fid))
    const refreshTasks = () => setTasks(store.getTasks(fid))
    const refreshLists = () => setLists(store.getLists(fid))
    const refreshListItems = () => setListItems(store.getListItems(fid))
    const refreshMeals = () => setMeals(store.getMeals(fid))
    const refreshDocuments = () => setDocuments(store.getDocuments(fid))

    return {
      switchFamily,
      createFamily: (name: string) => {
        const created = mutate(() => store.createFamily(name), refreshFamilies)
        switchFamily(created.id)
      },
      updateFamilyName: (name: string) => mutate(() => store.setFamilyName(fid, name), refreshFamily),
      inviteMember: (email: string) => mutate(() => store.createInvite(fid, email), refreshInvites),
      updateMember: (id: string, name: string) => mutate(() => store.updateMemberName(id, name), refreshMembers),
      removeMember: (id: string) => mutate(() => store.removeMember(id), refreshMembers),
      cancelInvite: (id: string) => mutate(() => store.cancelInvite(id), refreshInvites),
      createKid: (draft: ChildDraft) => mutate(() => store.createKid(fid, draft), refreshKids),
      updateKid: (id: string, draft: ChildDraft) => mutate(() => store.updateKid(id, draft), refreshKids),
      deleteKid: (id: string) => mutate(() => store.deleteKid(id), refreshKids, refreshEvents, refreshDocuments),
      createEvent: (draft: EventDraft) => mutate(() => store.createEvent(fid, draft), refreshEvents),
      createEventSeries: (draft: EventDraft, days: number[], end: string) =>
        mutate(() => store.createEventSeries(fid, draft, days, end), refreshEvents),
      updateEvent: (id: string, draft: EventDraft) => mutate(() => store.updateEvent(id, draft), refreshEvents),
      deleteEvent: (id: string) => mutate(() => store.deleteEvent(id), refreshEvents),
      createTask: (draft: TaskDraft) => mutate(() => store.createTask(fid, draft), refreshTasks),
      updateTask: (id: string, draft: TaskDraft) => mutate(() => store.updateTask(id, draft), refreshTasks),
      deleteTask: (id: string) => mutate(() => store.deleteTask(id), refreshTasks),
      toggleTask: (id: string) => mutate(() => store.toggleTask(id), refreshTasks),
      createList: (draft: ListDraft) => mutate(() => store.createList(fid, draft), refreshLists),
      updateList: (id: string, draft: ListDraft) => mutate(() => store.updateList(id, draft), refreshLists),
      deleteList: (id: string) => mutate(() => store.deleteList(id), refreshLists, refreshListItems),
      createListItem: (listId: string, draft: ListItemDraft) =>
        mutate(() => store.createListItem(listId, fid, draft), refreshListItems),
      updateListItem: (id: string, draft: ListItemDraft) =>
        mutate(() => store.updateListItem(id, draft), refreshListItems),
      deleteListItem: (id: string) => mutate(() => store.deleteListItem(id), refreshListItems),
      toggleListItem: (id: string) => mutate(() => store.toggleListItem(id), refreshListItems),
      createMeal: (draft: MealDraft) => mutate(() => store.createMeal(fid, draft), refreshMeals),
      updateMeal: (id: string, draft: MealDraft) => mutate(() => store.updateMeal(id, draft), refreshMeals),
      deleteMeal: (id: string) => mutate(() => store.deleteMeal(id), refreshMeals),
      createDocument: (draft: DocumentDraft) => mutate(() => store.createDocument(fid, draft), refreshDocuments),
      updateDocument: (id: string, draft: DocumentDraft) =>
        mutate(() => store.updateDocument(id, draft), refreshDocuments),
      deleteDocument: (id: string) => mutate(() => store.deleteDocument(id), refreshDocuments),
    }
  }, [fid, switchFamily])

  const value = useMemo<StoreValue>(() => ({
    activeFamilyId: fid,
    families,
    family,
    members,
    invites,
    kids,
    allEvents,
    tasks,
    lists,
    allListItems,
    meals,
    documents,
    todayMeals,
    pendingTasks,
    pendingItems,
    ...actions,
  }), [
    fid,
    families,
    family,
    members,
    invites,
    kids,
    allEvents,
    tasks,
    lists,
    allListItems,
    meals,
    documents,
    todayMeals,
    pendingTasks,
    pendingItems,
    actions,
  ])

  return (
    <StoreCtx.Provider value={value}>
      {children}
    </StoreCtx.Provider>
  )
}

export function useStore(): StoreValue {
  return useContext(StoreCtx)
}
