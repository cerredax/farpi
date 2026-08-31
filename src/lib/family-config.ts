// Gestión de la familia activa en sesión.
// Future: derivar del JWT de Supabase (user.app_metadata.family_id).

const DEFAULT_FAMILY_ID = 'f1'

const ACTIVE_FAMILY_KEY = 'farpi_active_family'
const STORE_KEY         = 'farpi_store_v1'

// Las de cuando la app era Nido (31-08-2026). Solo para poder retirarlas: la de
// la familia activa se migra aquí y la del store, en `store/persist.ts`, que es
// quien la lee. Un `reset` tiene que llevárselas también, o quedan huérfanas en
// el navegador para siempre.
const ACTIVE_FAMILY_KEY_NIDO = 'nido_active_family'
const STORE_KEY_NIDO         = 'nido_store_v1'

export function readActiveFamilyId(): string {
  if (typeof window === 'undefined') return DEFAULT_FAMILY_ID
  const actual = localStorage.getItem(ACTIVE_FAMILY_KEY)
  if (actual) return actual
  // Quien venía de Nido tenía la familia elegida bajo la clave vieja; sin esto,
  // al desplegar el cambio de nombre saltaría a la familia por defecto.
  const viejo = localStorage.getItem(ACTIVE_FAMILY_KEY_NIDO)
  if (viejo) {
    localStorage.setItem(ACTIVE_FAMILY_KEY, viejo)
    localStorage.removeItem(ACTIVE_FAMILY_KEY_NIDO)
    return viejo
  }
  return DEFAULT_FAMILY_ID
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
  localStorage.removeItem(STORE_KEY_NIDO)
  localStorage.removeItem(ACTIVE_FAMILY_KEY_NIDO)
  window.location.reload()
}
