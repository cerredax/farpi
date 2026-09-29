/**
 * Qué idiomas tiene Farpi y cuál está usando este dispositivo (28-09-2026).
 *
 * El idioma se guarda **por dispositivo**, en una cookie, y no en la cuenta: así
 * no hace falta tocar la base de producción, y el servidor la lee en cada
 * petición para pintar la página ya en el idioma bueno (y con el `lang` bueno en
 * `<html>`, que es lo que usa un lector de pantalla para elegir la voz). El
 * precio está escrito en `docs/architecture.md`, «La app en otro idioma»: lo que
 * se manda desde el servidor sin nadie delante (el aviso de las siete, los
 * correos de Supabase) no sabe qué idioma tiene cada móvil y sigue en castellano.
 *
 * Aquí no hay textos, solo la mecánica. Los textos, en `es.ts` y `en.ts`.
 */

export const IDIOMAS = ['es', 'en'] as const
export type Idioma = (typeof IDIOMAS)[number]

export const IDIOMA_POR_DEFECTO: Idioma = 'es'

/**
 * Los que se ofrecen en Ajustes. **No es lo mismo que `IDIOMAS`**: un idioma
 * está en `IDIOMAS` en cuanto tiene diccionario, y aquí solo cuando la app
 * entera está traducida. Ofrecer el inglés con media app en castellano sería
 * venderla en un idioma y servirla en otro. Cuando esté completo, se añade
 * `'en'` y el selector aparece solo.
 */
export const IDIOMAS_OFRECIDOS: readonly Idioma[] = ['es']

/** Cada idioma con su propio nombre, que es como se busca en una lista: nadie busca «Inglés» si no lee castellano. */
export const NOMBRE_DEL_IDIOMA: Record<Idioma, string> = {
  es: 'Castellano',
  en: 'English',
}

export const COOKIE_IDIOMA = 'farpi_idioma'

/** Un año. La cookie no guarda nada privado: solo dos letras. */
const UN_AÑO_EN_SEGUNDOS = 60 * 60 * 24 * 365

export function esIdioma(valor: unknown): valor is Idioma {
  return typeof valor === 'string' && (IDIOMAS as readonly string[]).includes(valor)
}

/** El idioma que dice la cookie, o el de siempre si no dice nada que conozcamos. */
export function idiomaDesdeCookie(valor: string | null | undefined): Idioma {
  return esIdioma(valor) ? valor : IDIOMA_POR_DEFECTO
}

/**
 * El valor de la cookie dentro de una cabecera `Cookie` o de `document.cookie`.
 * Se lee a mano porque en el navegador no hay otra forma síncrona, y es la que
 * usa lo que no es un componente (`idiomaDelNavegador`).
 */
export function leerCookieIdioma(cabecera: string): string | null {
  for (const trozo of cabecera.split(';')) {
    const [nombre, ...resto] = trozo.trim().split('=')
    if (nombre === COOKIE_IDIOMA) return decodeURIComponent(resto.join('='))
  }
  return null
}

/**
 * El idioma de este dispositivo, para el código que **no es un componente** y no
 * puede usar `useT()`: la traducción de los errores de Supabase, los
 * validadores. Lee la misma cookie que el servidor, así que los dos dicen lo
 * mismo. Fuera del navegador (el servidor, los tests unitarios) es el de siempre.
 */
export function idiomaDelNavegador(): Idioma {
  if (typeof document === 'undefined') return IDIOMA_POR_DEFECTO
  return idiomaDesdeCookie(leerCookieIdioma(document.cookie))
}

/**
 * La línea que se escribe en `document.cookie` para guardar el idioma.
 *
 * Sin `HttpOnly` a propósito: la tiene que poder leer el navegador
 * (`idiomaDelNavegador`). `SameSite=Lax` para que viaje al volver a la app desde
 * un enlace de un correo, que es cuando más importa entrar ya en el idioma bueno.
 */
export function cookieDeIdioma(idioma: Idioma): string {
  return `${COOKIE_IDIOMA}=${idioma}; Path=/; Max-Age=${UN_AÑO_EN_SEGUNDOS}; SameSite=Lax`
}

/** Guarda el idioma en este dispositivo. Solo en el navegador; lo que se vea en otro idioma, tras recargar. */
export function guardarIdioma(idioma: Idioma): void {
  document.cookie = cookieDeIdioma(idioma)
}

/**
 * Entre qué idiomas se puede elegir en Ajustes: los ofrecidos y, además, el que
 * ya se está usando.
 *
 * Lo segundo no sobra. Un idioma puede estar activo sin estar ofrecido (alguien
 * escribió la cookie a mano para probar la traducción, o un idioma se retiró), y
 * sin él en la lista no habría forma de volver: el selector solo sale cuando hay
 * más de una opción, así que quedaría escondido justo a quien lo necesita.
 */
export function idiomasParaElegir(actual: Idioma): Idioma[] {
  const lista: Idioma[] = [...IDIOMAS_OFRECIDOS]
  if (!lista.includes(actual)) lista.push(actual)
  return lista
}
