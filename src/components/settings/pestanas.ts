import { Users, SlidersHorizontal, CircleUser, RefreshCw, Scale } from 'lucide-react'
import { IS_DEMO_MODE } from '@/lib/supabase/client'

/**
 * Las secciones de Ajustes, en un sitio solo.
 *
 * Las usan las pestañas de `SettingsView` y `pestañaDesdeUrl`, que traduce el
 * `?seccion=` de la URL. La navegación ya no entra a cada una por separado: en
 * escritorio (`AccountFooter`) y en móvil (`MoreMenu`), Ajustes es una fila que
 * lleva a `/settings`. Si se añade una sección hay que tocar esta lista y el
 * panel correspondiente, no cuatro sitios.
 */
export type PestañaKey = 'familia' | 'casa' | 'cuenta' | 'sincronizacion' | 'legal'

/**
 * El icono es de la columna de escritorio y solo de ella: en móvil las
 * secciones son una fila de etiquetas y cinco iconos ahí no ordenan nada,
 * ocupan. Se guarda aquí y no en `SettingsView` por lo mismo que la etiqueta:
 * una sección nueva se describe entera en un sitio. Casa no lleva casita a
 * propósito —esa es la de Inicio en `SECCIONES`— sino los mandos de las
 * preferencias, que es lo que hay dentro.
 */
export const PESTAÑAS: { key: PestañaKey; label: string; icon: typeof Users }[] = [
  { key: 'familia', label: 'Familia', icon: Users },
  { key: 'casa', label: 'Casa', icon: SlidersHorizontal },
  { key: 'cuenta', label: 'Cuenta', icon: CircleUser },
  { key: 'sincronizacion', label: 'Sincronización', icon: RefreshCw },
  { key: 'legal', label: 'Legal', icon: Scale },
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
