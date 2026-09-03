import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import type { createClient } from '@/lib/supabase/server'
import type { Document } from '@/types'
import { mensajeDeCausa } from './oauth'
import { ErrorAlmacen, type CausaAlmacen } from './types'

type ClienteUsuario = Awaited<ReturnType<typeof createClient>>

/**
 * Lo que comparten las rutas de documentos: cómo se cuenta un fallo del disco.
 *
 * Existe para que ninguna ruta tenga que saber qué significa un 403 de Google.
 * El proveedor traduce a `CausaAlmacen`, esto traduce a HTTP y a un mensaje en
 * castellano, y la ruta solo encadena.
 */

function estadoDeCausa(causa: CausaAlmacen): number {
  switch (causa) {
    // No es un error del servidor ni del cliente: es un estado que se arregla
    // volviendo a conectar, y la interfaz lo trata como tal.
    case 'sin_conexion':
    case 'conexion_revocada':
      return 409
    case 'archivo_no_esta':
      return 404
    case 'archivo_rechazado':
      return 400
    case 'cuota':
      return 507
    default:
      return 502
  }
}

/**
 * La respuesta de un fallo, con el mensaje que va a leer una persona.
 *
 * `nombreDueno` es de quién es el Drive, y no es un adorno: "no se pudo abrir el
 * documento" no se puede resolver, y "lo subió Marta y su almacenamiento ya no
 * está conectado" sí — dice a quién hay que avisar.
 */
export function respuestaDeError(err: unknown, ruta: string, nombreDueno: string | null = null): NextResponse {
  if (err instanceof ErrorAlmacen) {
    // El detalle técnico va al log del servidor, como en `/api/push`: a quien usa
    // la app no le dice nada y a quien sondea sí.
    console.error(`[${ruta}] ${err.causa}: ${err.message}`)
    return NextResponse.json(
      { error: mensajeDeCausa(err.causa, nombreDueno), causa: err.causa },
      { status: estadoDeCausa(err.causa) },
    )
  }
  console.error(`[${ruta}]`, err instanceof Error ? err.message : err)
  return NextResponse.json({ error: 'No se pudo completar la operación' }, { status: 500 })
}

/**
 * Desde dónde va a subir el navegador.
 *
 * Google solo devuelve una sesión de subida utilizable desde el navegador si la
 * petición que la abre lleva este origen, así que hay que decírselo.
 *
 * **No sale de la cabecera `Host` si se puede evitar** (03-09-2026). Salía de
 * `req.nextUrl.origin`, que es el `Host` que manda quien llama: hoy a Vercel solo
 * llegan los dominios configurados, así que no era explotable, pero el día que se
 * añada un comodín de subdominio esa sesión de subida quedaría utilizable desde
 * cualquiera de ellos. Es el mismo cambio que ya se hizo en `/api/invite` con el
 * dominio del magic link, y por la misma razón: un origen que se adivina de una
 * cabecera no es un origen.
 *
 * El respaldo por `Host` se queda **solo para localhost**, que es donde hace falta
 * para poder probar sin configurar nada.
 */
export function origenDe(req: NextRequest): string {
  const configurado = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL)?.replace(/\/$/, '')
  if (configurado) return configurado

  const propio = req.nextUrl.origin
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(propio)) return propio

  throw new ErrorAlmacen(
    'desconocido',
    'Falta configurar SITE_URL: no se puede abrir una subida sin saber el dominio de la app.',
  )
}

/**
 * El documento, **si quien pregunta puede verlo**.
 *
 * Es la comprobación más importante de todo el módulo y por eso está en una
 * función con nombre en vez de copiada en cada ruta. Va con el cliente del
 * usuario, así que la RLS hace el trabajo: si no es de una familia suya, no
 * encuentra nada. Todo lo que viene después usa el cliente de servicio para leer
 * el token del dueño, y ese **no tiene RLS que le pare** — invertir el orden
 * convertiría estas rutas en una puerta a los documentos de todas las familias.
 */
export async function documentoVisible(supabase: ClienteUsuario, id: string): Promise<Document | null> {
  const { data } = await supabase.from('documents').select('*').eq('id', id).maybeSingle<Document>()
  return data ?? null
}

/**
 * Cómo se llama la persona en cuyo Drive vive el archivo.
 *
 * Solo para el mensaje de error: "no se pudo abrir el documento" no se puede
 * resolver, "lo subió Marta y su almacenamiento ya no está conectado" sí. Va con
 * el cliente del usuario y por tanto solo encuentra a gente de su familia, que es
 * exactamente lo que se quiere decir.
 */
export async function nombreDelDueno(
  supabase: ClienteUsuario,
  familyId: string,
  ownerId: string | null,
): Promise<string | null> {
  if (!ownerId) return null
  const { data } = await supabase
    .from('family_members')
    .select('display_name')
    .eq('family_id', familyId)
    .eq('user_id', ownerId)
    .maybeSingle<{ display_name: string }>()
  return data?.display_name ?? null
}
