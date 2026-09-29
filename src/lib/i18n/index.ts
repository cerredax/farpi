import { es, type Diccionario } from './es'
import { en } from './en'
import { idiomaDelNavegador, type Idioma } from './idiomas'

export type { Diccionario } from './es'
export * from './idiomas'

const DICCIONARIOS: Record<Idioma, Diccionario> = { es, en }

/** Los textos de un idioma. */
export function diccionario(idioma: Idioma): Diccionario {
  return DICCIONARIOS[idioma]
}

/**
 * Los textos del idioma de este dispositivo, para lo que no es un componente
 * (en un componente, `useT()`). Se pide **en el momento de usarlos** y no al
 * cargar el módulo: fuera del navegador no hay cookie, y un módulo se evalúa una
 * sola vez.
 */
export function textosDelNavegador(): Diccionario {
  return diccionario(idiomaDelNavegador())
}
