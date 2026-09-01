import { documentsRepo } from './documents'
import { eventsRepo } from './events'
import { familyRepo, invitesRepo, membersRepo } from './family'
import { childrenRepo } from './kids'
import { listItemsRepo, listsRepo } from './lists'
import { mealsRepo } from './meals'
import { budgetsRepo, expensesRepo, quotesRepo } from './finanzas'
import { notesRepo } from './notes'
import { storageProvidersRepo } from './storage-providers'
import { tasksRepo } from './tasks'
import type { Repos } from '../repos/types'

/**
 * La implementación real del contrato de repos, partida por dominio igual que
 * el mock en `src/lib/store/`. Los dos lados de la frontera tienen la misma
 * forma, así que añadir una operación es abrir el mismo archivo en cada lado.
 */
export const supabaseRepos: Repos = {
  family: familyRepo,
  members: membersRepo,
  invites: invitesRepo,
  children: childrenRepo,
  events: eventsRepo,
  tasks: tasksRepo,
  lists: listsRepo,
  listItems: listItemsRepo,
  meals: mealsRepo,
  notes: notesRepo,
  budgets: budgetsRepo,
  expenses: expensesRepo,
  quotes: quotesRepo,
  documents: documentsRepo,
  storageProviders: storageProvidersRepo,
}
