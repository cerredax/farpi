// Detección única de "modo demo" (sin Supabase real) compartida por cliente,
// servidor, proxy y rutas API. Evita que cada capa la implemente por su cuenta
// y diverja (p. ej. el proxy tratando como real una URL placeholder).
// nota: este módulo hornea NEXT_PUBLIC_SUPABASE_URL al compilar (build v2).

const PLACEHOLDER_URLS = ['your-supabase-project-url', 'placeholder', 'https://placeholder.supabase.co']

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export function isDemoConfig(url: string, key: string): boolean {
  return (
    !url ||
    PLACEHOLDER_URLS.some(p => url.includes(p)) ||
    !key ||
    key === 'your-anon-key'
  )
}

export const IS_DEMO_MODE = isDemoConfig(SUPABASE_URL, SUPABASE_ANON_KEY)
