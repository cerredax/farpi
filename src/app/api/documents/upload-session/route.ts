import { NextResponse, type NextRequest } from 'next/server'
import { requiereSesion } from '@/lib/supabase/guard'
import { getProvider } from '@/lib/document-storage'
import { origenDe, respuestaDeError } from '@/lib/document-storage/api'
import {
  contextoDeAlmacen,
  FALTA_CONFIG_DRIVE,
  recordarCarpeta,
  respuestaSinConfigDrive,
} from '@/lib/document-storage/tokens'
import { MAX_DOC_SIZE, VALID_MIME_TYPES } from '@/lib/constants'
import type { DocMimeType } from '@/types'

/**
 * Abrir una subida: Farpi pide hueco en el Drive de quien sube y le devuelve la
 * dirección a la que mandar los bytes.
 *
 * **El archivo no pasa por aquí, y es a propósito.** Una función de Vercel corta
 * el cuerpo de la petición muy por debajo de los 20 MB que admite un documento,
 * así que proxiar la subida significaría bajar el tope del producto. El proxy se
 * queda donde de verdad hace falta —al **leer**, porque quien lee no es el dueño
 * del Drive—; para subir, el dueño habla con su propio disco y el token nunca
 * baja al navegador: lo que baja es una dirección de un solo uso que Google
 * acaba de crear.
 *
 * Las comprobaciones de tipo y tamaño se repiten aquí aunque el sheet ya las
 * haga: el navegador no es un sitio donde se validen cosas, es un sitio donde se
 * proponen.
 */
export async function POST(req: NextRequest) {
  const guardia = await requiereSesion(req)
  if (guardia.fallo) return guardia.fallo
  const { supabase, user } = guardia
  if (FALTA_CONFIG_DRIVE) return respuestaSinConfigDrive('documents/upload-session')

  const { familyId, nombre, mimeType, tamano } = (await req.json().catch(() => ({}))) as {
    familyId?: string
    nombre?: string
    mimeType?: DocMimeType
    tamano?: number
  }

  if (!familyId || !nombre || !mimeType || typeof tamano !== 'number') {
    return NextResponse.json({ error: 'Faltan datos del archivo' }, { status: 400 })
  }
  if (!VALID_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: 'Solo se admiten PDF, JPG o PNG.' }, { status: 400 })
  }
  if (tamano <= 0 || tamano > MAX_DOC_SIZE) {
    return NextResponse.json({ error: 'El archivo supera el límite de 20 MB.' }, { status: 400 })
  }

  // Que sea de la familia lo dice la RLS: esta consulta va con el cliente del
  // usuario, así que si no es miembro no encuentra nada. Se comprueba antes de
  // tocar el token porque a partir de aquí se opera con el cliente de servicio,
  // que no tiene RLS que le pare.
  const { data: miembro } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_id', familyId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!miembro) return NextResponse.json({ error: 'No perteneces a esta familia' }, { status: 403 })

  try {
    const ctx = await contextoDeAlmacen({ ownerId: user.id, familyId, origen: origenDe(req) })
    const proveedor = getProvider('google_drive')
    const { urlDeSubida, carpetaRef } = await proveedor.iniciarSubida(ctx, {
      // Drive muestra este nombre al dueño en su propio disco, así que se
      // conserva tal cual y solo se le quitan los caracteres que romperían la
      // petición. El nombre "seguro" se deja para servir el archivo de vuelta.
      nombre: nombre.replace(/[\\/\r\n\t]/g, ' ').trim().slice(0, 120) || 'documento',
      mimeType,
      tamano,
    })

    if (carpetaRef !== ctx.carpetaRef) await recordarCarpeta(user.id, carpetaRef)

    return NextResponse.json({ urlDeSubida })
  } catch (err) {
    return respuestaDeError(err, 'documents/upload-session')
  }
}
