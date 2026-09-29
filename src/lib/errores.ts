/**
 * Traducir un fallo de Supabase a algo que se pueda leer en casa.
 *
 * Hasta ahora `assertNoError` hacía `fail(error.message)` y ese mensaje llegaba
 * intacto hasta `SaveStatus`, que lo pinta debajo de "No se ha guardado el
 * cambio". El mensaje de Postgres está **en inglés y habla de la base de
 * datos**: quien se encontraba con que no podía invitar a nadie leía
 * `new row violates row-level security policy for table "family_invites"`. Eso
 * no es un aviso, es un volcado.
 *
 * Vive en la frontera y no en el `catch` del store a propósito: aquí es por
 * donde entra el mensaje crudo, y aquí es donde hay un solo sitio que tocar. El
 * store sigue haciendo `err.message`, que a partir de ahora ya viene en
 * castellano.
 *
 * **Lo que no se traduce.** Las RPC del esquema lanzan sus excepciones ya en
 * castellano y pensadas para leerse ("No se puede eliminar al único
 * administrador de la familia", "La invitación ha caducado"). Esas pasan tal
 * cual: reescribirlas aquí sería decir lo mismo desde dos archivos, que es
 * justo lo que este repositorio evita. El precio, desde que hay otros idiomas
 * (28-09-2026): con la app en inglés, esas siguen llegando en castellano. Para
 * traducirlas, la RPC tendría que lanzar un código y no una frase.
 */

import { es } from './i18n/es'
import { textosDelNavegador, type Diccionario } from './i18n'

type TextosDeError = Diccionario['errores']

/**
 * Lo que se dice cuando no sabemos qué ha pasado, o cuando lo que ha pasado no es asunto de quien mira.
 *
 * En castellano: es el valor con el que comparan los tests. La app no lo usa
 * directamente, usa `t.generico` del idioma de cada uno.
 */
export const ERROR_GENERICO = es.errores.generico

/**
 * Los fallos que sí sabemos nombrar, por orden: gana el primero que case.
 *
 * Los códigos van junto al texto porque PostgREST manda las dos cosas y no
 * siempre las mismas: el `code` es estable y el `message` cambia con la versión.
 */
const TRADUCCIONES: { patron: RegExp; mensaje: keyof TextosDeError }[] = [
  {
    // 42501 y la policy de RLS. Es, con diferencia, el que más se va a ver: es
    // lo que contesta la base cuando alguien que no es administrador intenta
    // invitar, renombrar la familia o cambiar un rol.
    patron: /row-level security|permission denied|insufficient privilege|\b42501\b/i,
    mensaje: 'permiso',
  },
  {
    patron: /jwt|token|not authenticated|no autenticado|unauthorized|\b401\b/i,
    mensaje: 'sesion',
  },
  {
    patron: /failed to fetch|networkerror|network request|load failed|fetch failed|timeout|timed out/i,
    mensaje: 'conexion',
  },
  {
    patron: /duplicate key|already exists|\b23505\b/i,
    mensaje: 'duplicado',
  },
  {
    patron: /foreign key|\b23503\b/i,
    mensaje: 'enlazado',
  },
  {
    patron: /not-null|\b23502\b/i,
    mensaje: 'obligatorio',
  },
  {
    patron: /check constraint|\b23514\b/i,
    mensaje: 'noVale',
  },
  {
    patron: /value too long|\b22001\b/i,
    mensaje: 'demasiadoLargo',
  },
]

/**
 * Una guarda interna del esquema: `list_items: list_id no pertenece…`,
 * `close_month_copy: el mes tiene que ser…`. Están en castellano, sí, pero
 * hablan de columnas y de funciones: si salta una es un fallo nuestro, no algo
 * que quien está en la cocina pueda arreglar.
 */
const GUARDA_INTERNA = /^[a-z][a-z0-9_]*: /

/**
 * "Esto lo ha escrito Postgres, no nosotros."
 *
 * Sin acentos ni eñe y con alguna palabra funcional inglesa. Es una
 * aproximación y lo es a propósito: el coste de equivocarse por un lado es
 * enseñar `ERROR_GENERICO` en vez de un texto nuestro, y por el otro, enseñar
 * inglés técnico. La red se echa hacia el primero.
 */
const PARECE_INGLES = /\b(the|for|not|is|to|of|does|cannot|could|failed|invalid|violates|relation|column|constraint|request|server|unexpected)\b/i

/**
 * `codigo` va aparte y no pegado al mensaje: se mira para elegir la traducción,
 * pero no puede acabar en pantalla. Un mensaje que pasa tal cual —los de las
 * RPC— saldría con un `(P0001)` colgando al final.
 *
 * `t` son los textos del idioma de este dispositivo, que se leen en el momento
 * (28-09-2026). Quien llama aquí no es un componente —es la frontera de los
 * repositorios y el `catch` del store—, así que no hay `useT()` que valga; el
 * parámetro está para poder probar los otros idiomas.
 */
export function mensajeDeError(bruto: string, codigo?: string | null, t: TextosDeError = textosDelNavegador().errores): string {
  const texto = bruto.trim()
  if (!texto) return t.generico

  // Un mensaje que ya es nuestro pasa tal cual. El mismo fallo cruza esta
  // función dos veces —en la frontera de los repositorios y otra en el `catch`
  // del store—, y en inglés la segunda vuelta confundía nuestra propia frase con
  // una de Postgres (`PARECE_INGLES`) y la cambiaba por la genérica.
  if ((Object.values(t) as string[]).includes(texto)) return texto

  const paraBuscar = codigo ? `${texto} ${codigo}` : texto
  for (const { patron, mensaje } of TRADUCCIONES) {
    if (patron.test(paraBuscar)) return t[mensaje]
  }

  if (GUARDA_INTERNA.test(texto)) return t.generico

  // `Acceso denegado: …` lo lanzan las RPC y es correcto, pero dice "el usuario"
  // y "esta familia" hablando de ti y de tu casa. Se cuenta como lo cuenta la
  // app y no como lo cuenta la función.
  if (/^acceso denegado/i.test(texto)) return t.accesoDenegado

  const conAcentos = /[áéíóúüñ¿¡]/i.test(texto)
  if (!conAcentos && PARECE_INGLES.test(texto)) return t.generico

  return texto
}
