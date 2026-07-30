'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as store from './mock-store'
import { mockRepos } from './mock-repos'
import { supabaseRepos } from './supabase-repos'
import { IS_DEMO_MODE } from './supabase/client'
import { selectPendingItems, selectPendingTasks, selectTodayMeals } from './selectors'
import type { Repos } from './repos/types'
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

if (typeof window !== 'undefined' && IS_DEMO_MODE) {
  store.loadFromStorage()
}

interface StoreValue {
  isLoading: boolean
  error: string | null
  reload: () => Promise<void>
  activeFamilyId: string
  families: Family[]
  switchFamily: (id: string) => void
  createFamily: (name: string) => Promise<void>
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
  updateFamilyName: (name: string) => Promise<void>
  inviteMember: (email: string) => Promise<void>
  updateMember: (id: string, name: string) => Promise<void>
  updateMemberRole: (id: string, role: 'admin' | 'member') => Promise<void>
  removeMember: (id: string) => Promise<void>
  cancelInvite: (id: string) => Promise<void>
  createKid: (draft: ChildDraft) => Promise<void>
  updateKid: (id: string, draft: ChildDraft) => Promise<void>
  deleteKid: (id: string) => Promise<void>
  createEvent: (draft: EventDraft) => Promise<Event>
  createEventSeries: (draft: EventDraft, weekdays: number[], endDate: string) => Promise<Event[]>
  createYearlySeries: (draft: EventDraft, endYear: number) => Promise<Event[]>
  updateEvent: (id: string, draft: EventDraft) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  createTask: (draft: TaskDraft) => Promise<void>
  updateTask: (id: string, draft: TaskDraft) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  createList: (draft: ListDraft) => Promise<void>
  updateList: (id: string, draft: ListDraft) => Promise<void>
  deleteList: (id: string) => Promise<void>
  createListItem: (listId: string, draft: ListItemDraft) => Promise<void>
  updateListItem: (id: string, draft: ListItemDraft) => Promise<void>
  deleteListItem: (id: string) => Promise<void>
  toggleListItem: (id: string) => Promise<void>
  createMeal: (draft: MealDraft) => Promise<void>
  copyMealDay: (sourceDate: string, targetDate: string, repeatUntil?: string) => Promise<void>
  updateMeal: (id: string, draft: MealDraft) => Promise<void>
  deleteMeal: (id: string) => Promise<void>
  createDocument: (draft: DocumentDraft) => Promise<void>
  updateDocument: (id: string, draft: DocumentDraft) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  getDocumentUrl: (document: Document) => Promise<string>
}

const StoreCtx = createContext<StoreValue>(null!)

interface StoreProviderProps {
  children: React.ReactNode
  familyId: string
  switchFamily: (id: string) => void
}

const EMPTY_SLICES = {
  families: [] as Family[],
  members: [] as FamilyMember[],
  invites: [] as FamilyInvite[],
  kids: [] as Child[],
  allEvents: [] as Event[],
  tasks: [] as Task[],
  lists: [] as List[],
  allListItems: [] as ListItem[],
  meals: [] as MealPlan[],
  documents: [] as Document[],
}

export function StoreProvider({ children, familyId, switchFamily }: StoreProviderProps) {
  const repos: Repos = IS_DEMO_MODE ? mockRepos : supabaseRepos

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [families, setFamilies] = useState<Family[]>(EMPTY_SLICES.families)
  const [members, setMembers] = useState<FamilyMember[]>(EMPTY_SLICES.members)
  const [invites, setInvites] = useState<FamilyInvite[]>(EMPTY_SLICES.invites)
  const [kids, setKids] = useState<Child[]>(EMPTY_SLICES.kids)
  const [allEvents, setEvents] = useState<Event[]>(EMPTY_SLICES.allEvents)
  const [tasks, setTasks] = useState<Task[]>(EMPTY_SLICES.tasks)
  const [lists, setLists] = useState<List[]>(EMPTY_SLICES.lists)
  const [allListItems, setListItems] = useState<ListItem[]>(EMPTY_SLICES.allListItems)
  const [meals, setMeals] = useState<MealPlan[]>(EMPTY_SLICES.meals)
  const [documents, setDocuments] = useState<Document[]>(EMPTY_SLICES.documents)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [
        nextFamily,
        nextFamilies,
        nextMembers,
        nextInvites,
        nextKids,
        nextEvents,
        nextTasks,
        nextLists,
        nextListItems,
        nextMeals,
        nextDocuments,
      ] = await Promise.all([
        repos.family.getFamily(familyId),
        repos.family.getFamilies(),
        repos.members.getMembers(familyId),
        repos.invites.getInvites(familyId),
        repos.children.getKids(familyId),
        repos.events.getEvents(familyId),
        repos.tasks.getTasks(familyId),
        repos.lists.getLists(familyId),
        repos.listItems.getListItems(familyId),
        repos.meals.getMeals(familyId),
        repos.documents.getDocuments(familyId),
      ])

      if (!nextFamily) throw new Error('No se ha encontrado la familia activa')

      setFamily(nextFamily)
      setFamilies(nextFamilies)
      setMembers(nextMembers)
      setInvites(nextInvites)
      setKids(nextKids)
      setEvents(nextEvents)
      setTasks(nextTasks)
      setLists(nextLists)
      setListItems(nextListItems)
      setMeals(nextMeals)
      setDocuments(nextDocuments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando los datos')
    } finally {
      setIsLoading(false)
    }
  }, [familyId, repos])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  const todayMeals = useMemo(() => selectTodayMeals(meals), [meals])
  const pendingTasks = useMemo(() => selectPendingTasks(tasks), [tasks])
  const pendingItems = useMemo(() => selectPendingItems(allListItems, lists), [allListItems, lists])

  const runMutation = useCallback(async (action: () => Promise<unknown>): Promise<void> => {
    setError(null)
    try {
      await action()
      await reload()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el cambio'
      setError(message)
      throw err
    }
  }, [reload])

  const value = useMemo<StoreValue | null>(() => {
    if (!family) return null

    return {
      isLoading,
      error,
      reload,
      activeFamilyId: familyId,
      families,
      switchFamily,
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
      createFamily: async (name: string) => {
        setError(null)
        try {
          const created = await repos.family.createFamily(name)
          switchFamily(created.id)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'No se pudo crear la familia'
          setError(message)
          throw err
        }
      },
      updateFamilyName: (name: string) => runMutation(() => repos.family.setFamilyName(familyId, name)),
      inviteMember: (email: string) => runMutation(() => repos.invites.createInvite(familyId, email)),
      updateMember: (id: string, name: string) => runMutation(() => repos.members.updateMemberName(id, name)),
      updateMemberRole: (id: string, role: 'admin' | 'member') => runMutation(() => repos.members.updateMemberRole(id, role)),
      removeMember: (id: string) => runMutation(() => repos.members.removeMember(id)),
      cancelInvite: (id: string) => runMutation(() => repos.invites.cancelInvite(id)),
      createKid: (draft: ChildDraft) => runMutation(() => repos.children.createKid(familyId, draft)),
      updateKid: (id: string, draft: ChildDraft) => runMutation(() => repos.children.updateKid(id, draft)),
      deleteKid: (id: string) => runMutation(() => repos.children.deleteKid(id)),
      createEvent: async (draft: EventDraft) => {
        const event = await repos.events.createEvent(familyId, draft)
        await reload()
        return event
      },
      createEventSeries: async (draft: EventDraft, weekdays: number[], endDate: string) => {
        const events = await repos.events.createEventSeries(familyId, draft, weekdays, endDate)
        await reload()
        return events
      },
      createYearlySeries: async (draft: EventDraft, endYear: number) => {
        const events = await repos.events.createYearlySeries(familyId, draft, endYear)
        await reload()
        return events
      },
      updateEvent: (id: string, draft: EventDraft) => runMutation(() => repos.events.updateEvent(id, draft)),
      deleteEvent: (id: string) => runMutation(() => repos.events.deleteEvent(id)),
      createTask: (draft: TaskDraft) => runMutation(() => repos.tasks.createTask(familyId, draft)),
      updateTask: (id: string, draft: TaskDraft) => runMutation(() => repos.tasks.updateTask(id, draft)),
      deleteTask: (id: string) => runMutation(() => repos.tasks.deleteTask(id)),
      toggleTask: (id: string) => runMutation(() => repos.tasks.toggleTask(id)),
      createList: (draft: ListDraft) => runMutation(() => repos.lists.createList(familyId, draft)),
      updateList: (id: string, draft: ListDraft) => runMutation(() => repos.lists.updateList(id, draft)),
      deleteList: (id: string) => runMutation(() => repos.lists.deleteList(id)),
      createListItem: (listId: string, draft: ListItemDraft) =>
        runMutation(() => repos.listItems.createListItem(listId, familyId, draft)),
      updateListItem: (id: string, draft: ListItemDraft) => runMutation(() => repos.listItems.updateListItem(id, draft)),
      deleteListItem: (id: string) => runMutation(() => repos.listItems.deleteListItem(id)),
      toggleListItem: (id: string) => runMutation(() => repos.listItems.toggleListItem(id)),
      createMeal: (draft: MealDraft) => runMutation(() => repos.meals.createMeal(familyId, draft)),
      copyMealDay: (sourceDate: string, targetDate: string, repeatUntil?: string) =>
        runMutation(() => repos.meals.copyMealDay(familyId, sourceDate, targetDate, repeatUntil)),
      updateMeal: (id: string, draft: MealDraft) => runMutation(() => repos.meals.updateMeal(id, draft)),
      deleteMeal: (id: string) => runMutation(() => repos.meals.deleteMeal(id)),
      createDocument: (draft: DocumentDraft) => runMutation(() => repos.documents.createDocument(familyId, draft)),
      updateDocument: (id: string, draft: DocumentDraft) => runMutation(() => repos.documents.updateDocument(id, draft)),
      deleteDocument: (id: string) => runMutation(() => repos.documents.deleteDocument(id)),
      getDocumentUrl: (document: Document) => repos.documents.getDownloadUrl(document),
    }
  }, [
    isLoading,
    error,
    reload,
    familyId,
    families,
    switchFamily,
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
    repos,
    runMutation,
  ])

  if (isLoading && !value) {
    return <ShellState title="Cargando Nido" description="Preparando los datos de la familia..." />
  }

  if (!value) {
    return (
      <ShellState
        title="No se pudo cargar la familia"
        description={error ?? 'Revisa la sesión o la configuración de Supabase.'}
      />
    )
  }

  return (
    <StoreCtx.Provider value={value}>
      {children}
    </StoreCtx.Provider>
  )
}

function ShellState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <p className="text-lg font-extrabold text-ink">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  )
}

export function useStore(): StoreValue {
  return useContext(StoreCtx)
}
