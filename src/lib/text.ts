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

/** Tamaño de archivo legible: "820 KB", "1.4 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
