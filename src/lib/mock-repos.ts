// La implementación en memoria del contrato de `repos/types.ts`, que es la
// frontera estable. La otra es `supabase-repos/`, y las dos tienen que
// comportarse igual: filtrar por `family_id`, dejar `child_id` a null al borrar
// un hijo, una comida por familia/fecha/franja.
//
// Este archivo nació con un aviso que decía "sustituir cada método por una
// consulta a Supabase". Ya no aplica: Supabase tiene su propia implementación al
// lado y el mock se queda, porque es el fallback sin credenciales y el entorno
// donde corre la suite e2e.
import * as store from './store/index'
import { db } from './store/db'
import type { Repos } from './repos/types'

export const mockRepos: Repos = {
  family: {
    getFamily:     (familyId) => Promise.resolve(store.getFamily(familyId)),
    getFamilies:   ()         => Promise.resolve(store.getFamilies()),
    setFamilyName: (familyId, name) => Promise.resolve(store.setFamilyName(familyId, name)),
    setFamilyMealSlots: (familyId, slots) => Promise.resolve(store.setFamilyMealSlots(familyId, slots)),
    createFamily:  (name)     => Promise.resolve(store.createFamily(name)),
    deleteFamily:  (familyId) => Promise.resolve(store.deleteFamily(familyId)),
  },

  members: {
    getMembers:       (familyId) => Promise.resolve(store.getMembers(familyId)),
    // En demo no hay sesión: quien mira es siempre el admin de la familia
    // sembrada, el mismo `user_id` con el que nacen las familias del mock.
    getCurrentUserId: () => Promise.resolve('u1'),
    updateMemberProfile: (id, name, color) => Promise.resolve(store.updateMemberProfile(id, name, color)),
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
    createEvent:        (familyId, draft) => Promise.resolve(store.createEvent(familyId, draft)),
    createEventSeries:  (familyId, draft, weekdays, endDate) =>
      Promise.resolve(store.createEventSeries(familyId, draft, weekdays, endDate)),
    createYearlySeries: (familyId, draft, endYear) =>
      Promise.resolve(store.createYearlySeries(familyId, draft, endYear)),
    updateEvent: (id, draft) => Promise.resolve(store.updateEvent(id, draft)),
    deleteEvent: (id) => Promise.resolve(store.deleteEvent(id)),
    deleteEventSeries: (groupId) => Promise.resolve(store.deleteEventSeries(groupId)),
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
    createListItem:  (listId, familyId, draft) =>
      Promise.resolve(store.createListItem(listId, familyId, draft)),
    updateListItem:  (id, draft) => Promise.resolve(store.updateListItem(id, draft)),
    deleteListItem:  (id) => Promise.resolve(store.deleteListItem(id)),
    toggleListItem:  (id) => Promise.resolve(store.toggleListItem(id)),
    setListItemQuantity: (id, quantity) => Promise.resolve(store.setListItemQuantity(id, quantity)),
  },

  meals: {
    getMeals:    (familyId) => Promise.resolve(store.getMeals(familyId)),
    createMeal:  (familyId, draft) => Promise.resolve(store.createMeal(familyId, draft)),
    updateMeal:  (id, draft) => Promise.resolve(store.updateMeal(id, draft)),
    deleteMeal:  (id) => Promise.resolve(store.deleteMeal(id)),
    copyMealDay: (familyId, sourceDate, targetDate, repeatUntil?) =>
      Promise.resolve(void store.copyMealDay(familyId, sourceDate, targetDate, repeatUntil)),
  },

  notes: {
    getNotes:   (familyId) => Promise.resolve(store.getNotes(familyId)),
    createNote: (familyId, draft) => Promise.resolve(store.createNote(familyId, draft)),
    updateNote: (id, draft) => Promise.resolve(store.updateNote(id, draft)),
    deleteNote: (id) => Promise.resolve(store.deleteNote(id)),
  },

  budgets: {
    getBudgets:   (familyId) => Promise.resolve(store.getBudgets(familyId)),
    createBudget: (familyId, draft) => Promise.resolve(store.createBudget(familyId, draft)),
    updateBudget: (id, draft) => Promise.resolve(store.updateBudget(id, draft)),
    deleteBudget: (id) => Promise.resolve(store.deleteBudget(id)),
  },

  expenses: {
    getExpenses:   (familyId) => Promise.resolve(store.getExpenses(familyId)),
    createExpense: (familyId, draft) => Promise.resolve(store.createExpense(familyId, draft)),
    updateExpense: (id, draft) => Promise.resolve(store.updateExpense(id, draft)),
    deleteExpense: (id) => Promise.resolve(store.deleteExpense(id)),
  },

  quotes: {
    getQuotes:      (familyId) => Promise.resolve(store.getQuotes(familyId)),
    createQuote:    (familyId, draft) => Promise.resolve(store.createQuote(familyId, draft)),
    updateQuote:    (id, draft) => Promise.resolve(store.updateQuote(id, draft)),
    deleteQuote:    (id) => Promise.resolve(store.deleteQuote(id)),
    setQuoteStatus: (id, status) => Promise.resolve(store.setQuoteStatus(id, status)),
  },

  documents: {
    getDocuments:    (familyId) => Promise.resolve(store.getDocuments(familyId)),
    createDocument:  (familyId, draft) => Promise.resolve(store.createDocument(familyId, draft)),
    updateDocument:  (id, draft) => Promise.resolve(store.updateDocument(id, draft)),
    deleteDocument:  (id) => Promise.resolve(store.deleteDocument(id)),
    getDownloadUrl:  () => Promise.reject(new Error('En modo demo no se guardan archivos reales, así que no hay nada que abrir.')),
  },

  // En modo demo no hay proveedor al que conectarse: los archivos nunca salen de
  // este navegador. `connectUrl` devuelve `null` y con eso la interfaz sabe que
  // no debe ofrecer el botón, en vez de enseñar uno que no lleva a ninguna parte.
  // Es la misma idea que la guarda de modo demo de las rutas API: el camino se
  // corta al principio y no a mitad, con un error.
  storageProviders: {
    getConnection: () => Promise.resolve({
      provider: 'google_drive' as const,
      conectada: false,
      revocada: false,
      email: null,
      demo: true,
    }),
    connectUrl: () => null,
    disconnect: () => Promise.resolve(),
  },
}
