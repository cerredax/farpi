import { IS_DEMO_MODE } from '@/lib/supabase/client'

/**
 * Las secciones de Ajustes, en un sitio solo.
 *
 * Las usan dos pantallas: las pestañas de `SettingsView` y el menú de la cuenta
 * (`AccountMenu`), que entra directo a cada una. Si se añade una sección hay que
 * tocar esta lista y el panel correspondiente, no cuatro sitios.
 */
export type PestañaKey = 'familia' | 'casa' | 'cuenta' | 'sincronizacion' | 'legal'

export const PESTAÑAS: { key: PestañaKey; label: string }[] = [
  { key: 'familia', label: 'Familia' },
  { key: 'casa', label: 'Casa' },
  { key: 'cuenta', label: 'Cuenta' },
  { key: 'sincronizacion', label: 'Sincronización' },
  { key: 'legal', label: 'Legal' },
]

/**
 * Sincronización no tiene nada que enseñar en modo demo (no hay proveedor al que
 * conectarse): en vez de una pestaña vacía, no se ofrece. "Cuenta" sí se
 * mantiene, porque la copia de seguridad vive ahí y tiene que poder probarse en
 * la suite, que corre siempre en modo demo forzado.
 */
export const PESTAÑAS_VISIBLES = IS_DEMO_MODE
  ? PESTAÑAS.filter(p => p.key !== 'sincronizacion')
  : PESTAÑAS

/** La sección que pide la URL (`/settings?seccion=casa`), o Familia si no dice nada. */
export function pestañaDesdeUrl(seccion: string | null | undefined): PestañaKey {
  const encontrada = PESTAÑAS_VISIBLES.find(p => p.key === seccion)
  return encontrada?.key ?? 'familia'
}
