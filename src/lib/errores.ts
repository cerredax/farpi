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
 * justo lo que este repositorio evita.
 */

/** Lo que se dice cuando no sabemos qué ha pasado, o cuando lo que ha pasado no es asunto de quien mira. */
export const ERROR_GENERICO = 'No se ha podido guardar. Inténtalo otra vez en un momento.'

/**
 * Los fallos que sí sabemos nombrar, por orden: gana el primero que case.
 *
 * Los códigos van junto al texto porque PostgREST manda las dos cosas y no
 * siempre las mismas: el `code` es estable y el `message` cambia con la versión.
 */
const TRADUCCIONES: { patron: RegExp; mensaje: string }[] = [
  {
    // 42501 y la policy de RLS. Es, con diferencia, el que más se va a ver: es
    // lo que contesta la base cuando alguien que no es administrador intenta
    // invitar, renombrar la familia o cambiar un rol.
    patron: /row-level security|permission denied|insufficient privilege|\b42501\b/i,
    mensaje: 'No tienes permiso para hacer ese cambio. En la familia, invitar y cambiar los ajustes es cosa de un administrador.',
  },
  {
    patron: /jwt|token|not authenticated|no autenticado|unauthorized|\b401\b/i,
    mensaje: 'La sesión ha caducado. Vuelve a entrar en Farpi e inténtalo otra vez.',
  },
  {
    patron: /failed to fetch|networkerror|network request|load failed|fetch failed|timeout|timed out/i,
    mensaje: 'No hay conexión con Farpi. Comprueba internet e inténtalo otra vez.',
  },
  {
    patron: /duplicate key|already exists|\b23505\b/i,
    mensaje: 'Eso ya estaba guardado.',
  },
  {
    patron: /foreign key|\b23503\b/i,
    mensaje: 'No se ha podido guardar: algo con lo que va enlazado ya no está.',
  },
  {
    patron: /not-null|\b23502\b/i,
    mensaje: 'Falta algún dato obligatorio.',
  },
  {
    patron: /check constraint|\b23514\b/i,
    mensaje: 'Alguno de los datos no vale. Revísalo e inténtalo otra vez.',
  },
  {
    patron: /value too long|\b22001\b/i,
    mensaje: 'Alguno de los textos es demasiado largo.',
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
 */
export function mensajeDeError(bruto: string, codigo?: string | null): string {
  const texto = bruto.trim()
  if (!texto) return ERROR_GENERICO

  const paraBuscar = codigo ? `${texto} ${codigo}` : texto
  for (const { patron, mensaje } of TRADUCCIONES) {
    if (patron.test(paraBuscar)) return mensaje
  }

  if (GUARDA_INTERNA.test(texto)) return ERROR_GENERICO

  // `Acceso denegado: …` lo lanzan las RPC y es correcto, pero dice "el usuario"
  // y "esta familia" hablando de ti y de tu casa. Se cuenta como lo cuenta la
  // app y no como lo cuenta la función.
  if (/^acceso denegado/i.test(texto)) {
    return 'No tienes permiso para hacer eso. En la familia, invitar y cambiar los ajustes es cosa de un administrador.'
  }

  const conAcentos = /[áéíóúüñ¿¡]/i.test(texto)
  if (!conAcentos && PARECE_INGLES.test(texto)) return ERROR_GENERICO

  return texto
}
