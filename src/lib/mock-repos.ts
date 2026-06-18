// SUPABASE SWAP: replace each method body with a Supabase query.
// The interface contracts in repos/types.ts are the stable boundary.
import * as store from './store/index'
import { db } from './store/db'
import type { Repos } from './repos/types'

export const mockRepos: Repos = {
  family: {
    getFamily:     (familyId) => Promise.resolve(store.getFamily(familyId)),
    getFamilies:   ()         => Promise.resolve(store.getFamilies()),
    setFamilyName: (familyId, name) => Promise.resolve(store.setFamilyName(familyId, name)),
    createFamily:  (name)     => Promise.resolve(store.createFamily(name)),
  },

  members: {
    getMembers:       (familyId) => Promise.resolve(store.getMembers(familyId)),
    updateMemberName: (id, name) => Promise.resolve(store.updateMemberName(id, name)),
    updateMemberRole: (id, role) => {
      // TODO: route through RPC update_family_member_role when on Supabase
      db.members = db.members.map(m => m.id !== id ? m : { ...m, role })
      return Promise.resolve()
    },
    removeMember: (id) => Promise.resolve(store.removeMember(id)),
  },

  invites: {
    getInvites:   (familyId) => Promise.resolve(store.getInvites(familyId)),
    createInvite: (familyId, email) => Promise.resolve(store.createInvite(familyId, email)),
    cancelInvite: (id) => Promise.resolve(store.cancelInvite(id)),
  },

  children: {
    getKids:    (familyId) => Promise.resolve(store.getKids(familyId)),
    createKid:  (familyId, draft) => Promise.resolve(store.createKid(familyId, draft)),
    updateKid:  (id, draft) => Promise.resolve(store.updateKid(id, draft)),
    deleteKid:  (id) => Promise.resolve(store.deleteKid(id)),
  },

  events: {
    getEvents:          (familyId) => Promise.resolve(store.getEvents(familyId)),
    getTodayEvents:     (familyId) => Promise.resolve(store.getTodayEvents(familyId)),
    getUpcomingEvents:  (familyId, limit?) => Promise.resolve(store.getUpcomingEvents(familyId, limit)),
    createEvent:        (familyId, draft) => Promise.resolve(store.createEvent(familyId, draft)),
    createEventSeries:  (familyId, draft, weekdays, endDate) =>
      Promise.resolve(store.createEventSeries(familyId, draft, weekdays, endDate)),
    createYearlySeries: (familyId, draft, endYear) =>
      Promise.resolve(store.createYearlySeries(familyId, draft, endYear)),
    updateEvent: (id, draft) => Promise.resolve(store.updateEvent(id, draft)),
    deleteEvent: (id) => Promise.resolve(store.deleteEvent(id)),
  },

  tasks: {
    getTasks:    (familyId) => Promise.resolve(store.getTasks(familyId)),
    createTask:  (familyId, draft) => Promise.resolve(store.createTask(familyId, draft)),
    updateTask:  (id, draft) => Promise.resolve(store.updateTask(id, draft)),
    deleteTask:  (id) => Promise.resolve(store.deleteTask(id)),
    toggleTask:  (id) => Promise.resolve(store.toggleTask(id)),
  },

  lists: {
    getLists:    (familyId) => Promise.resolve(store.getLists(familyId)),
    createList:  (familyId, draft) => Promise.resolve(store.createList(familyId, draft)),
    updateList:  (id, draft) => Promise.resolve(store.updateList(id, draft)),
    deleteList:  (id) => Promise.resolve(store.deleteList(id)),
  },

  listItems: {
    getListItems:    (familyId) => Promise.resolve(store.getListItems(familyId)),
    getPendingItems: (familyId) => Promise.resolve(store.getPendingItems(familyId)),
    createListItem:  (listId, familyId, draft) =>
      Promise.resolve(store.createListItem(listId, familyId, draft)),
    updateListItem:  (id, draft) => Promise.resolve(store.updateListItem(id, draft)),
    deleteListItem:  (id) => Promise.resolve(store.deleteListItem(id)),
    toggleListItem:  (id) => Promise.resolve(store.toggleListItem(id)),
  },

  meals: {
    getMeals:    (familyId) => Promise.resolve(store.getMeals(familyId)),
    createMeal:  (familyId, draft) => Promise.resolve(store.createMeal(familyId, draft)),
    updateMeal:  (id, draft) => Promise.resolve(store.updateMeal(id, draft)),
    deleteMeal:  (id) => Promise.resolve(store.deleteMeal(id)),
    copyMealDay: (familyId, sourceDate, targetDate, repeatUntil?) =>
      Promise.resolve(void store.copyMealDay(familyId, sourceDate, targetDate, repeatUntil)),
  },

  documents: {
    getDocuments:    (familyId) => Promise.resolve(store.getDocuments(familyId)),
    createDocument:  (familyId, draft) => Promise.resolve(store.createDocument(familyId, draft)),
    updateDocument:  (id, draft) => Promise.resolve(store.updateDocument(id, draft)),
    deleteDocument:  (id) => Promise.resolve(store.deleteDocument(id)),
  },
}
