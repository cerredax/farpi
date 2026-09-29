import { enGB, es } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import type { Idioma } from './idiomas'

/**
 * El locale de `date-fns` de cada idioma: los nombres de los meses y los días,
 * y en qué día empieza la semana.
 *
 * Hoy las pantallas importan `es` de `date-fns/locale` directamente (el
 * calendario, Documentos, Finanzas). Al traer una de ellas al diccionario, ese
 * import se cambia por `localeDeFechas(useIdioma())`, y el **patrón** del
 * formato (`"d 'de' MMMM"`) se va al diccionario con el resto de sus textos:
 * el orden y las palabras de una fecha también son del idioma.
 *
 * Inglés británico y no americano porque la semana empieza en lunes, como en
 * casa, y el calendario de Farpi está pensado así.
 */
const LOCALES: Record<Idioma, Locale> = { es, en: enGB }

export function localeDeFechas(idioma: Idioma): Locale {
  return LOCALES[idioma]
}
