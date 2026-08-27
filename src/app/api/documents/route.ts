import { NextResponse, type NextRequest } from 'next/server'
import { requiereSesion } from '@/lib/supabase/guard'
import { getProvider } from '@/lib/document-storage'
import { origenDe, respuestaDeError } from '@/lib/document-storage/api'
import { contextoDeAlmacen, FALTA_CONFIG_DRIVE, respuestaSinConfigDrive } from '@/lib/document-storage/tokens'
import { MAX_DOC_SIZE, VALID_MIME_TYPES } from '@/lib/constants'
import type { DocumentDraft } from '@/types'

/**
 * Guardar la ficha de un documento que **ya está subido** al Drive de quien lo
 * sube.
 *
 * Es el segundo de los dos pasos de una subida, y va en este orden a propósito:
 * primero los bytes, después la ficha. Al revés —crear la ficha y luego subir—
 * un fallo a mitad deja una tarjeta que la familia ve y no puede abrir; así, lo
 * que deja es un archivo suelto en el Drive de su dueño, que no molesta a nadie
 * más y que él puede borrar. De las dos basuras posibles, esta es la buena.
 *
 * El tamaño no se cree lo que diga el navegador: se pregunta al proveedor. Es lo
 * que hace que una subida cortada a la mitad se note aquí, y no el día que
 * alguien intente abrir el documento.
 */
export async function POST(req: NextRequest) {
  const guardia = await requiereSesion()
  if (guardia.fallo) return guardia.fallo
  const { supabase, user } = guardia
  if (FALTA_CONFIG_DRIVE) return respuestaSinConfigDrive('documents')

  const { familyId, ref, draft } = (await req.json().catch(() => ({}))) as {
    familyId?: string
    ref?: string
    draft?: DocumentDraft
  }
  if (!familyId || !ref || !draft?.name?.trim()) {
    return NextResponse.json({ error: 'Faltan datos del documento' }, { status: 400 })
  }

  try {
    const ctx = await contextoDeAlmacen({ ownerId: user.id, familyId, origen: origenDe(req) })
    const proveedor = getProvider('google_drive')
    const archivo = await proveedor.describir(ctx, ref)

    if (!VALID_MIME_TYPES.includes(archivo.mimeType as (typeof VALID_MIME_TYPES)[number])) {
      await proveedor.borrar(ctx, ref).catch(() => {})
      return NextResponse.json({ error: 'Solo se admiten PDF, JPG o PNG.' }, { status: 400 })
    }
    if (archivo.tamano > MAX_DOC_SIZE) {
      await proveedor.borrar(ctx, ref).catch(() => {})
      return NextResponse.json({ error: 'El archivo supera el límite de 20 MB.' }, { status: 400 })
    }

    // El insert va con el cliente del usuario: la RLS es la que decide si puede
    // escribir en esta familia, igual que antes de que existiera Drive.
    const { data, error } = await supabase
      .from('documents')
      .insert({
        family_id: familyId,
        child_id: draft.child_id,
        member_id: draft.member_id,
        name: draft.name.trim(),
        description: draft.description?.trim() || null,
        category: draft.category || null,
        storage_path: archivo.ref,
        storage_provider: proveedor.id,
        storage_owner: user.id,
        mime_type: archivo.mimeType,
        size_bytes: archivo.tamano,
        expires_on: draft.expires_on || null,
        created_by: user.id,
      })
      .select('*')
      .single()

    if (error) {
      // Si la ficha no entra, el archivo ya subido se retira: sin esto, el Drive
      // de quien sube se llena de papeles que no aparecen en ninguna pantalla.
      // Es la misma compensación que hacía la versión de Supabase Storage.
      await proveedor.borrar(ctx, ref).catch(() => {})
      console.error('[documents] alta de la ficha:', error.message)
      return NextResponse.json({ error: 'No se pudo guardar el documento' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return respuestaDeError(err, 'documents')
  }
}
