import { IS_DEMO_MODE, SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

/**
 * Pregunta a GoTrue qué proveedores externos están habilitados en el proyecto.
 *
 * Así la UI solo ofrece un proveedor cuando está realmente configurado en
 * Supabase: no hay que mantener un flag en el entorno ni redesplegar al
 * activarlo desde el dashboard. Ante cualquier fallo devuelve false, para no
 * enseñar un botón que llevaría a un error.
 */
export async function isAuthProviderEnabled(provider: string): Promise<boolean> {
  if (IS_DEMO_MODE) return false

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    })
    if (!res.ok) return false
    const settings = await res.json() as { external?: Record<string, boolean> }
    return settings.external?.[provider] === true
  } catch {
    return false
  }
}
