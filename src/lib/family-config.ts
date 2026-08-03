// Gestión de la familia activa en sesión.
// Future: derivar del JWT de Supabase (user.app_metadata.family_id).

export const DEFAULT_FAMILY_ID = 'f1'

const ACTIVE_FAMILY_KEY = 'nido_active_family'
const STORE_KEY         = 'nido_store_v1'

export function readActiveFamilyId(): string {
  if (typeof window === 'undefined') return DEFAULT_FAMILY_ID
  return localStorage.getItem(ACTIVE_FAMILY_KEY) ?? DEFAULT_FAMILY_ID
}

export function writeActiveFamilyId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACTIVE_FAMILY_KEY, id)
}

// Limpia todo el estado demo y recarga la página.
// Útil para pruebas o cuando el esquema localStorage cambia de versión.
export function resetDemoData(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORE_KEY)
  localStorage.removeItem(ACTIVE_FAMILY_KEY)
  window.location.reload()
}
