import { NextResponse, type NextRequest } from 'next/server'
import { requiereSesion } from '@/lib/supabase/guard'
import { getProvider } from '@/lib/document-storage'
import { documentoVisible, origenDe } from '@/lib/document-storage/api'
import { contextoDeAlmacen, FALTA_CONFIG_DRIVE, respuestaSinConfigDrive } from '@/lib/document-storage/tokens'

/**
 * Borrar un documento: la ficha y, si se puede, el archivo.
 *
 * Cualquier miembro de la familia puede borrar, igual que antes — lo dice la RLS
 * y no cambia porque el archivo esté en el Drive de otro. Eso obliga a que el
 * borrado del archivo vaya con el token del **dueño**, no con el de quien pulsa.
 *
 * La ficha se borra primero y el archivo después, y si el archivo no se puede
 * borrar —el dueño desconectó su Drive, o ya lo había borrado a mano— el borrado
 * se da por bueno igual. Es deliberado: lo que la familia ha pedido es que ese
 * papel deje de estar en Farpi, y eso ya está hecho. Dejar la ficha porque no se
 * pudo tocar un disco ajeno sería castigar a quien borra por algo que no
 * controla; lo que queda es un archivo suelto en el Drive de su dueño, que es
 * suyo y puede borrar cuando quiera.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guardia = await requiereSesion()
  if (guardia.fallo) return guardia.fallo
  const { supabase, user } = guardia
  if (FALTA_CONFIG_DRIVE) return respuestaSinConfigDrive('documents/[id]')

  const { id } = await params
  const doc = await documentoVisible(supabase, id)
  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) {
    console.error('[documents/[id]] borrado de la ficha:', error.message)
    return NextResponse.json({ error: 'No se pudo borrar el documento' }, { status: 500 })
  }

  try {
    const ctx = await contextoDeAlmacen({
      ownerId: doc.storage_owner ?? user.id,
      familyId: doc.family_id,
      origen: origenDe(req),
    })
    await getProvider(doc.storage_provider).borrar(ctx, doc.storage_path)
  } catch (err) {
    // Se registra y se sigue: la ficha ya no está, que es lo que se pidió. No se
    // devuelve el error —de ahí que no se use `respuestaDeError`— porque quien
    // borra no puede hacer nada con él: el archivo está en el disco de otro.
    console.error(
      '[documents/[id]] el archivo se queda en el proveedor:',
      err instanceof Error ? err.message : err,
    )
  }

  return NextResponse.json({ ok: true })
}
