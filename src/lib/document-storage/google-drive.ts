import type {
  ArchivoGuardado,
  ArchivoPorSubir,
  ContenidoArchivo,
  ContextoAlmacen,
  DocumentStorageProvider,
  SubidaIniciada,
} from './types'
import { ErrorAlmacen } from './types'
import { causaDeErrorGoogle } from './oauth'

/**
 * Google Drive como disco de los documentos de la familia.
 *
 * Lo hace todo con `fetch` contra la API REST y sin el paquete `googleapis`: son
 * seis llamadas contadas y esa librería trae un cliente de autenticación entero
 * que aquí no pinta nada (los tokens los lleva `tokens.ts`).
 *
 * Con el scope `drive.file` este código **solo ve los archivos que ha creado él
 * mismo**. Eso tiene una consecuencia que conviene tener presente al leer los
 * `q=` de abajo: buscar "la carpeta Nido" no puede devolver la carpeta Nido de
 * otra cosa, porque el resto del Drive de esa persona no existe para nosotros.
 */

const API = 'https://www.googleapis.com/drive/v3'
const API_SUBIDA = 'https://www.googleapis.com/upload/drive/v3'
const MIME_CARPETA = 'application/vnd.google-apps.folder'
const NOMBRE_CARPETA = 'Nido'
/** La etiqueta con la que se reconocen nuestros archivos dentro de un Drive. */
const CLAVE_FAMILIA = 'nido_family'

async function pedir(ctx: ContextoAlmacen, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const cuerpo = await res.text().catch(() => '')
    throw new ErrorAlmacen(causaDeErrorGoogle(res.status, cuerpo), `Google Drive respondió ${res.status}`)
  }
  return res
}

/**
 * La carpeta "Nido" dentro del Drive de esa persona, creándola si hace falta.
 *
 * Sin carpeta los archivos caen sueltos en la raíz del Drive, mezclados con lo
 * suyo, y a nadie le gusta que una app le llene el disco de papeles. Si la borra
 * a mano, la siguiente subida la vuelve a crear: no es un dato que Nido necesite
 * conservar, es una comodidad para el dueño.
 */
async function asegurarCarpeta(ctx: ContextoAlmacen): Promise<string> {
  if (ctx.carpetaRef) return ctx.carpetaRef

  const q = `name = '${NOMBRE_CARPETA}' and mimeType = '${MIME_CARPETA}' and trashed = false`
  const busqueda = await pedir(ctx, `${API}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1&spaces=drive`)
  const encontrada = (await busqueda.json())?.files?.[0]?.id
  if (encontrada) return encontrada

  const creada = await pedir(ctx, `${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: NOMBRE_CARPETA, mimeType: MIME_CARPETA }),
  })
  const id = (await creada.json())?.id
  if (!id) throw new ErrorAlmacen('desconocido', 'No se pudo crear la carpeta Nido en Google Drive')
  return id
}

/** Lo que Drive devuelve al describir un archivo, traducido al contrato. */
function aArchivoGuardado(datos: {
  id?: string
  name?: string
  size?: string
  mimeType?: string
  trashed?: boolean
}): ArchivoGuardado {
  if (!datos.id) throw new ErrorAlmacen('archivo_no_esta', 'Google Drive no devolvió el archivo')
  // Un archivo en la papelera se ve exactamente igual que uno borrado desde el
  // punto de vista de quien intenta abrirlo, así que se cuenta como ausente.
  if (datos.trashed) throw new ErrorAlmacen('archivo_no_esta', 'El archivo está en la papelera de Google Drive')
  return {
    ref: datos.id,
    nombre: datos.name ?? '',
    mimeType: datos.mimeType ?? 'application/octet-stream',
    tamano: Number(datos.size ?? 0),
  }
}

export const googleDrive: DocumentStorageProvider = {
  id: 'google_drive',

  async iniciarSubida(ctx: ContextoAlmacen, archivo: ArchivoPorSubir): Promise<SubidaIniciada> {
    const carpetaRef = await asegurarCarpeta(ctx)

    const res = await pedir(ctx, `${API_SUBIDA}/files?uploadType=resumable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': archivo.mimeType,
        'X-Upload-Content-Length': String(archivo.tamano),
        // Sin esta cabecera Google devuelve una sesión que el navegador no puede
        // usar: la subida directa falla por CORS y funciona con curl, que es la
        // clase de fallo que cuesta media tarde encontrar.
        Origin: ctx.origen,
      },
      body: JSON.stringify({
        name: archivo.nombre,
        parents: [carpetaRef],
        // Para reconocer nuestros archivos dentro de un Drive ajeno más adelante
        // sin depender de en qué carpeta los haya movido el dueño.
        appProperties: { [CLAVE_FAMILIA]: ctx.familyId },
      }),
    })

    const urlDeSubida = res.headers.get('location')
    if (!urlDeSubida) {
      throw new ErrorAlmacen('desconocido', 'Google Drive no devolvió la dirección de subida')
    }
    return { urlDeSubida, carpetaRef }
  },

  async describir(ctx: ContextoAlmacen, ref: string): Promise<ArchivoGuardado> {
    const res = await pedir(ctx, `${API}/files/${encodeURIComponent(ref)}?fields=id,name,size,mimeType,trashed`)
    return aArchivoGuardado(await res.json())
  },

  async obtener(ctx: ContextoAlmacen, ref: string): Promise<ContenidoArchivo> {
    const res = await pedir(ctx, `${API}/files/${encodeURIComponent(ref)}?alt=media`)
    if (!res.body) throw new ErrorAlmacen('desconocido', 'Google Drive devolvió el archivo vacío')
    return {
      cuerpo: res.body,
      mimeType: res.headers.get('content-type') ?? 'application/octet-stream',
    }
  },

  async borrar(ctx: ContextoAlmacen, ref: string): Promise<void> {
    await pedir(ctx, `${API}/files/${encodeURIComponent(ref)}`, { method: 'DELETE' })
  },

  async listar(ctx: ContextoAlmacen): Promise<ArchivoGuardado[]> {
    const q = `appProperties has { key='${CLAVE_FAMILIA}' and value='${ctx.familyId}' } and trashed = false`
    const res = await pedir(
      ctx,
      `${API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,size,mimeType)&pageSize=1000&spaces=drive`,
    )
    const archivos = (await res.json())?.files ?? []
    return archivos.map(aArchivoGuardado)
  },

  async cuenta(ctx: ContextoAlmacen): Promise<{ email: string | null }> {
    // `about` entra con `drive.file`, así que se sabe el correo sin pedir ningún
    // scope de perfil: pedir `email` solo para escribirlo en Ajustes sería pagar
    // una pantalla de consentimiento más larga por una línea de texto.
    try {
      const res = await pedir(ctx, `${API}/about?fields=user(emailAddress)`)
      return { email: (await res.json())?.user?.emailAddress ?? null }
    } catch {
      // Que no se sepa el correo no es motivo para no conectar.
      return { email: null }
    }
  },
}
