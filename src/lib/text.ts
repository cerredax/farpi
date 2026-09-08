import { EXTENSION_POR_MIME } from './constants'
import type { DocMimeType } from '@/types'

/** Pone en mayúscula la primera letra. Útil para las fechas que date-fns devuelve en minúscula. */
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * Deja un texto listo para comparar en una búsqueda: minúsculas y sin tildes,
 * para que "platano" encuentre "Plátano" (nadie escribe tildes al buscar).
 */
export function normalizaParaBuscar(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

/** Quita los guiones que sobran a los lados de un slug: `-ley-aplicable-` pasa a `ley-aplicable`. */
export function recortaGuiones(value: string): string {
  return value.replace(/^-+|-+$/g, '')
}

/**
 * Nombre de archivo apto para viajar: reutiliza `normalizaParaBuscar` para bajar
 * a minúsculas y quitar tildes, y solo añade lo suyo —deja pasar `._-`, cambia
 * el resto por guiones y cae en 'documento' si no queda nada—.
 *
 * Se usa en las dos puntas del viaje de un documento: al subirlo a Drive y al
 * servirlo desde Farpi, donde va en la cabecera `Content-Disposition`, que no
 * admite acentos ni comillas sin codificar.
 */
export function safeFileName(name: string): string {
  const slug = normalizaParaBuscar(name).replace(/[^a-z0-9._-]+/g, '-')
  return recortaGuiones(slug) || 'documento'
}

/**
 * El nombre con el que sale un documento de Farpi: el slug **y su extensión**.
 *
 * La extensión no se puede sacar del nombre porque ahí no está: en la base se
 * guarda el nombre del documento («DNI de Carlos»), no el del archivo, que se
 * queda en el Drive de quien lo subió. Sin ella, verlo en la pestaña funciona
 * —eso lo decide el `Content-Type`— pero «guardar como» deja un archivo pelado
 * que en el móvil no abre nada.
 *
 * Si el nombre ya la lleva —alguien que llamó al documento «DNI.pdf»— no se
 * repite. `.jpeg` cuenta como `.jpg`: son el mismo archivo con dos nombres.
 */
export function nombreDeDescarga(nombre: string, mime: string): string {
  const base = safeFileName(nombre)
  const extension = EXTENSION_POR_MIME[mime as DocMimeType]
  if (!extension) return base
  const yaLaLleva = base.endsWith(`.${extension}`) || (extension === 'jpg' && base.endsWith('.jpeg'))
  return yaLaLleva ? base : `${base}.${extension}`
}

/** Tamaño de archivo legible: "820 KB", "1.4 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
