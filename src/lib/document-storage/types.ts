import type { StorageProviderId } from '@/types'

/**
 * El contrato del disco.
 *
 * Es la segunda frontera del proyecto, y **no es la misma** que la de
 * `src/lib/repos/types.ts`. Aquella es la de la interfaz (corre en el navegador,
 * elige entre Supabase y el mock); esta es la del servidor y no debe importarse
 * nunca desde un componente: maneja tokens prestados.
 *
 * La regla que la mantiene pequeña: **el proveedor es solo el disco**. No sabe
 * qué es una familia, no decide quién puede leer y no toca la base. Quien manda
 * es la RLS, igual que antes; el proveedor recibe un token ya resuelto y mueve
 * bytes. Por eso `ContextoAlmacen` lleva un `familyId` que solo se usa para
 * etiquetar el archivo, no para comprobar nada.
 *
 * Añadir Dropbox ("App folder") u OneDrive (Microsoft Graph, carpeta dedicada)
 * es implementar esta interfaz y registrarla en `index.ts`. Las dos tienen el
 * mismo reparto que Drive —sesión de subida que termina el cliente, descarga por
 * API, borrado por id—, que es justo lo que esta forma supone.
 */
export interface DocumentStorageProvider {
  readonly id: StorageProviderId

  /**
   * Abre una subida y devuelve la URL de un solo uso que la termina.
   *
   * Va en dos pasos —abrir aquí, subir los bytes desde el navegador, confirmar
   * después— y no en uno porque el servidor no puede ser el que transporte el
   * archivo: las funciones de Vercel cortan el cuerpo de la petición muy por
   * debajo de los 20 MB que admite un documento. El proxy se mantiene para
   * **leer**, que es donde importa (quien lee no es el dueño del Drive); para
   * subir, el dueño habla con su propio disco.
   */
  iniciarSubida(ctx: ContextoAlmacen, archivo: ArchivoPorSubir): Promise<SubidaIniciada>

  /**
   * Qué hay en esa referencia, sin traerse los bytes.
   *
   * Sirve para las dos puntas del mismo problema: al terminar de subir confirma
   * que el archivo está de verdad ahí y con qué tamaño real —si no, `size_bytes`
   * sería lo que quisiera contar el cliente—, y antes de abrirlo comprueba que
   * siga estando, que es lo que permite dar un mensaje decente en vez de una
   * pestaña en blanco.
   */
  describir(ctx: ContextoAlmacen, ref: string): Promise<ArchivoGuardado>

  /** El contenido, para servirlo desde Farpi. */
  obtener(ctx: ContextoAlmacen, ref: string): Promise<ContenidoArchivo>

  borrar(ctx: ContextoAlmacen, ref: string): Promise<void>

  /**
   * Lo que este proveedor guarda de Farpi.
   *
   * Todavía no la llama nadie. Está en el contrato porque es la operación con la
   * que se reconcilian huérfanos —archivos que subieron pero cuya ficha no llegó
   * a guardarse— y porque no tenerla obligaría a rediseñar para añadirla.
   */
  listar(ctx: ContextoAlmacen): Promise<ArchivoGuardado[]>

  /** La cuenta a la que pertenece el token, para poder decir "conectado como…". */
  cuenta(ctx: ContextoAlmacen): Promise<{ email: string | null }>
}

/**
 * Lo que el proveedor necesita saber para una operación. El token viene ya
 * refrescado: refrescarlo es cosa de `tokens.ts`, no de cada implementación.
 */
export interface ContextoAlmacen {
  accessToken: string
  /** Solo para etiquetar el archivo en el proveedor. No comprueba permisos. */
  familyId: string
  /** La carpeta de Farpi en ese disco, si ya se conoce. */
  carpetaRef: string | null
  /**
   * El origen desde el que subirá el navegador. Google solo devuelve una sesión
   * con CORS si la petición que la abre lleva `Origin`, así que sin esto la
   * subida directa falla en el navegador y funciona con curl.
   */
  origen: string
}

export interface ArchivoPorSubir {
  nombre: string
  mimeType: string
  tamano: number
}

export interface SubidaIniciada {
  urlDeSubida: string
  /** La carpeta usada; si se acaba de crear, el llamante la guarda para la próxima. */
  carpetaRef: string
}

export interface ArchivoGuardado {
  ref: string
  nombre: string
  mimeType: string
  tamano: number
  /**
   * De qué familia dijo ser este archivo **cuando se subió**, según la etiqueta que
   * le puso el propio proveedor. `null` si no la lleva.
   *
   * Es la única forma de comprobar que un `ref` que llega desde el navegador salió
   * de una subida nuestra y no lo ha elegido quien llama: sin esto,
   * `POST /api/documents` daba de alta la ficha de cualquier archivo que el token
   * de esa persona alcanzara. Con `drive.file` eso son solo los que subió la propia
   * app, así que el daño era registrar dos veces un papel suyo — pero acotado no es
   * lo mismo que cerrado, y esta es la puerta por la que un id entra desde fuera.
   */
  familia: string | null
}

/**
 * Los bytes, para servirlos desde Farpi.
 *
 * **No lleva tamaño, y no es un olvido.** El que devuelve el proveedor puede ser el
 * del cuerpo comprimido, y reenviarlo como `Content-Length` de una respuesta ya
 * descomprimida da un archivo corrupto. El tamaño de verdad está en la ficha
 * (`documents.size_bytes`), tomado del proveedor al subir.
 */
export interface ContenidoArchivo {
  cuerpo: ReadableStream<Uint8Array>
  mimeType: string
}

/**
 * Por qué falló, en el vocabulario de Farpi y no en el de Google.
 *
 * Existe para que las rutas API puedan traducir un fallo a un mensaje que se
 * pueda leer y a un estado HTTP, sin que ninguna de ellas tenga que saber qué
 * significa un 403 de Drive. Los dos que de verdad importan son
 * `conexion_revocada` (el dueño quitó el permiso: se puede arreglar volviendo a
 * conectar) y `archivo_no_esta` (lo borró de su Drive: no se puede arreglar).
 */
export type CausaAlmacen =
  | 'sin_conexion'
  | 'conexion_revocada'
  | 'archivo_no_esta'
  | 'archivo_rechazado'
  | 'cuota'
  | 'desconocido'

export class ErrorAlmacen extends Error {
  constructor(readonly causa: CausaAlmacen, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorAlmacen'
  }
}
