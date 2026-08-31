import type {
  Child, Document, Event, Family, FamilyInvite, FamilyMember,
  List, ListItem, MealPlan, Note, Task,
} from '@/types'
import { getLocalDateString } from './date-utils'
import { safeFileName } from './text'

/**
 * La copia de seguridad de una familia.
 *
 * Existe porque los papeles ya la prometían y no había mecanismo: `/privacidad`
 * dice que puedes exportar tus datos y `/terminos` recomienda dos veces
 * "conservar copias de la información importante", sin dar manera de hacerlo. Y
 * porque todo esto vive en un único proyecto Supabase del plan gratuito.
 *
 * **No hace falta servidor.** El store ya tiene en memoria todo lo de la familia
 * activa, y ya filtrado por RLS, que es exactamente lo que significa "tus datos".
 * Así que esto es lógica pura sobre lo que la pantalla ya tenía, sin ruta API, sin
 * clave de servicio y sin tabla nueva. Funciona igual en modo demo, que además es
 * lo que permite probarlo.
 *
 * El archivo es un volcado fiel de filas **con sus ids**, no un informe bonito:
 * sirve para los dos desastres de verdad —borrar algo sin querer y querer mirar
 * cómo era, o perder el proyecto entero y tener que reconstruirlo—. El camino de
 * vuelta está escrito en `docs/project-status.md`.
 */

/** Sube si cambia la forma del archivo, para que un JSON viejo se reconozca. */
export const VERSION_EXPORT = 1

/** Lo que el store tiene y va a la copia. Los nombres son los de las tablas. */
export interface DatosParaExportar {
  family: Family
  members: FamilyMember[]
  invites: FamilyInvite[]
  kids: Child[]
  events: Event[]
  tasks: Task[]
  lists: List[]
  listItems: ListItem[]
  meals: MealPlan[]
  notes: Note[]
  documents: Document[]
}

export interface Exportacion {
  nido_export: number
  exportado_el: string
  familia: { id: string; nombre: string }
  aviso: string
  datos: {
    families: Family[]
    family_members: FamilyMember[]
    family_invites: FamilyInvite[]
    children: Child[]
    events: Event[]
    tasks: Task[]
    lists: List[]
    list_items: ListItem[]
    meal_plans: MealPlan[]
    notes: Note[]
    documents: Document[]
  }
}

/**
 * Dos cosas **no** entran, y no es un olvido:
 *
 * - `storage_connections`, que son los tokens de Google Drive. Un refresh token es
 *   una llave permanente al disco de una persona y no baja a un archivo de la
 *   carpeta de Descargas ni por accidente. El store ni los tiene, y así se queda.
 * - `push_subscriptions`: endpoints técnicos de cada navegador. No son datos de la
 *   familia y no sirven para reponer nada.
 *
 * Los **archivos** de los documentos tampoco: viven en el Google Drive de quien
 * los subió, que es un disco de verdad con su propia papelera. Lo que va es la
 * ficha, con `storage_path` y `storage_owner`, que es lo que permite volver a
 * encajarlos.
 */
export function construirExportacion(datos: DatosParaExportar, ahora: Date = new Date()): Exportacion {
  return {
    nido_export: VERSION_EXPORT,
    exportado_el: ahora.toISOString(),
    familia: { id: datos.family.id, nombre: datos.family.name },
    aviso: 'Los archivos de los documentos no están en este archivo: viven en el Google Drive de quien los subió. Aquí está su ficha, con la referencia para volver a encontrarlos.',
    datos: {
      families: [datos.family],
      family_members: datos.members,
      family_invites: datos.invites,
      children: datos.kids,
      events: datos.events,
      tasks: datos.tasks,
      lists: datos.lists,
      list_items: datos.listItems,
      meal_plans: datos.meals,
      notes: datos.notes,
      documents: datos.documents,
    },
  }
}

/**
 * `nido-garcia-farpon-2026-08-27.json`.
 *
 * La fecha sale de `getLocalDateString` y no de `toISOString`, que es la regla de
 * la casa para las fechas familiares: a las 00:30 de un martes, la de UTC sería
 * lunes y la copia parecería del día anterior.
 */
export function nombreDeArchivo(nombreFamilia: string, ahora: Date = new Date()): string {
  const nombre = safeFileName(nombreFamilia || 'familia')
  return `nido-${nombre}-${getLocalDateString(ahora)}.json`
}

/**
 * Qué lleva dentro, para decirlo en el botón. Lo que se ve antes de pulsar es lo
 * que hace que una copia de seguridad dé confianza: "descargar una copia" no
 * dice si están los documentos.
 */
export function resumenDeExportacion(datos: DatosParaExportar): string {
  const partes: string[] = []
  const cuenta = (n: number, singular: string, plural: string) => {
    if (n > 0) partes.push(`${n} ${n === 1 ? singular : plural}`)
  }
  cuenta(datos.members.length + datos.kids.length, 'persona', 'personas')
  cuenta(datos.events.length, 'evento', 'eventos')
  cuenta(datos.tasks.length, 'tarea', 'tareas')
  cuenta(datos.listItems.length, 'artículo', 'artículos')
  cuenta(datos.meals.length, 'comida', 'comidas')
  cuenta(datos.notes.length, 'nota', 'notas')
  cuenta(datos.documents.length, 'documento', 'documentos')
  return partes.join(' · ')
}
