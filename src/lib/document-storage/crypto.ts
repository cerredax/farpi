import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Cifrado de los tokens antes de guardarlos.
 *
 * Un refresh token de Drive es una llave permanente al disco de una persona, y
 * la base donde vive es la misma de producción. La RLS ya deja la tabla cerrada
 * a cal y canto (ninguna policy, solo service role), pero eso protege del
 * *acceso*, no de una copia de seguridad, un volcado o una clave de servicio que
 * se escape. Con esto, lo que se llevan no vale sin `DOCS_TOKEN_KEY`, que vive
 * en Vercel y no en la base.
 *
 * **La clave se pasa como argumento a propósito.** Así este archivo no lee el
 * entorno, no tiene secretos y se puede probar de verdad; quien la resuelve es
 * `tokens.ts`, que sí es código de servidor.
 */

const ALGORITMO = 'aes-256-gcm'
const BYTES_IV = 12
const BYTES_TAG = 16
/** Delante de todo, para poder cambiar de formato sin adivinar qué es cada fila. */
const VERSION = 'v1'

/**
 * Lee la clave de su forma de texto. Admite 64 caracteres hex o base64 de 32
 * bytes, que son las dos formas en las que sale de `openssl rand`.
 */
export function leerClave(valor: string): Buffer {
  const limpio = valor.trim()
  if (!limpio) throw new Error('DOCS_TOKEN_KEY está vacía')

  const clave = /^[0-9a-fA-F]{64}$/.test(limpio)
    ? Buffer.from(limpio, 'hex')
    : Buffer.from(limpio, 'base64')

  if (clave.length !== 32) {
    throw new Error('DOCS_TOKEN_KEY debe ser de 32 bytes (64 caracteres hex o base64)')
  }
  return clave
}

export function cifrar(clave: Buffer, texto: string): string {
  const iv = randomBytes(BYTES_IV)
  const cipher = createCipheriv(ALGORITMO, clave, iv)
  const cuerpo = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${VERSION}.${Buffer.concat([iv, tag, cuerpo]).toString('base64')}`
}

export function descifrar(clave: Buffer, guardado: string): string {
  const [version, cuerpoBase64] = guardado.split('.')
  if (version !== VERSION || !cuerpoBase64) {
    throw new Error('Token guardado con un formato que no se reconoce')
  }

  const bruto = Buffer.from(cuerpoBase64, 'base64')
  if (bruto.length <= BYTES_IV + BYTES_TAG) {
    throw new Error('Token guardado incompleto')
  }

  const iv = bruto.subarray(0, BYTES_IV)
  const tag = bruto.subarray(BYTES_IV, BYTES_IV + BYTES_TAG)
  const cuerpo = bruto.subarray(BYTES_IV + BYTES_TAG)

  const decipher = createDecipheriv(ALGORITMO, clave, iv)
  decipher.setAuthTag(tag)
  // Si la clave no es la que cifró, `final()` lanza aquí: GCM autentica además
  // de cifrar, así que un token manipulado no se descifra a medias, no se
  // descifra.
  return Buffer.concat([decipher.update(cuerpo), decipher.final()]).toString('utf8')
}
