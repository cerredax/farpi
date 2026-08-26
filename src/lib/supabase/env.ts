// Detección única de "modo demo" (sin Supabase real) compartida por cliente,
// servidor, proxy y rutas API. Evita que cada capa la implemente por su cuenta
// y diverja (p. ej. el proxy tratando como real una URL placeholder).
// nota: este módulo hornea NEXT_PUBLIC_SUPABASE_URL al compilar (build v2).

const PLACEHOLDER_URLS = ['your-supabase-project-url', 'placeholder', 'https://placeholder.supabase.co']
// Las dos formas del mismo relleno. `.env.example` reparte
// `your-supabase-anon-key` y aquí solo se reconocía `your-anon-key`: copiar la
// plantilla y cambiar únicamente la URL arrancaba contra Supabase con una clave
// de mentira, y eso se ve como un error de autenticación opaco, no como el modo
// demo que tocaba.
const PLACEHOLDER_KEYS = ['your-anon-key', 'your-supabase-anon-key']

// Se recortan los espacios: al pegar los valores en un panel de entorno es fácil
// que se cuele uno delante o detrás, y eso rompe el host sin dar ninguna pista.
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()

export function isDemoConfig(url: string, key: string): boolean {
  const cleanUrl = url.trim()
  const cleanKey = key.trim()
  return (
    !cleanUrl ||
    PLACEHOLDER_URLS.some(p => cleanUrl.includes(p)) ||
    !cleanKey ||
    PLACEHOLDER_KEYS.includes(cleanKey) ||
    // Una clave con forma de URL significa que los dos valores están cruzados:
    // mejor arrancar en modo demo que apuntar a un servidor imposible.
    cleanKey.startsWith('http')
  )
}

export const IS_DEMO_MODE = isDemoConfig(SUPABASE_URL, SUPABASE_ANON_KEY)
