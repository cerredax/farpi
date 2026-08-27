import { NextResponse, type NextRequest } from 'next/server'
import { requiereSesion } from '@/lib/supabase/guard'
import { getProvider } from '@/lib/document-storage'
import { documentoVisible, nombreDelDueno, origenDe, respuestaDeError } from '@/lib/document-storage/api'
import { contextoDeAlmacen, FALTA_CONFIG_DRIVE, respuestaSinConfigDrive } from '@/lib/document-storage/tokens'
import { safeFileName } from '@/lib/text'

/**
 * El documento, servido por Nido.
 *
 * Este es el modelo de acceso entero en una ruta: el archivo vive en el Drive de
 * quien lo subió, pero **nadie habla con Drive salvo el servidor**. Cuando otro
 * miembro de la familia quiere verlo, Nido usa el token guardado del dueño, se
 * trae el archivo y lo sirve él, aplicando el control de acceso que ya existía
 * —`family_id` y RLS—. El proveedor es el disco; quién puede leer no lo decide él.
 *
 * El orden de las dos primeras comprobaciones no es negociable: primero se mira
 * con el cliente del usuario si puede ver la ficha (la RLS contesta), y **solo
 * después** se usa el cliente de servicio para el token del dueño. Al revés, esto
 * sería una puerta abierta a los documentos de cualquier familia.
 *
 * Con `?verificar=1` no descarga nada: solo comprueba que el archivo siga estando
 * y contesta en JSON. El sheet lo llama antes de abrir la pestaña, porque un
 * error dentro de una pestaña nueva es una pestaña en blanco y aquí hay dos
 * fallos que hay que saber explicar: el dueño desconectó su Drive, o borró el
 * archivo.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guardia = await requiereSesion()
  if (guardia.fallo) return guardia.fallo
  const { supabase, user } = guardia
  if (FALTA_CONFIG_DRIVE) return respuestaSinConfigDrive('documents/file')

  const { id } = await params
  const doc = await documentoVisible(supabase, id)
  if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  const dueno = await nombreDelDueno(supabase, doc.family_id, doc.storage_owner)
  // Cuando el archivo es de quien está mirando, hablarle en tercera persona
  // ("lo subió Omar y su almacenamiento…") es raro y no ayuda.
  const nombreDueno = doc.storage_owner === user.id ? 'tu cuenta' : dueno

  try {
    const ctx = await contextoDeAlmacen({
      ownerId: doc.storage_owner ?? user.id,
      familyId: doc.family_id,
      origen: origenDe(req),
    })
    const proveedor = getProvider(doc.storage_provider)

    if (req.nextUrl.searchParams.get('verificar') === '1') {
      await proveedor.describir(ctx, doc.storage_path)
      return NextResponse.json({ ok: true })
    }

    const contenido = await proveedor.obtener(ctx, doc.storage_path)
    const nombreArchivo = safeFileName(doc.name)
    return new NextResponse(contenido.cuerpo, {
      headers: {
        'Content-Type': doc.mime_type,
        // `inline` para que el PDF o la foto se vean en la pestaña en vez de
        // descargarse: casi siempre se abre un documento para mirarlo un momento.
        'Content-Disposition': `inline; filename="${nombreArchivo}"`,
        // Un informe médico no se queda en ninguna caché intermedia. El service
        // worker tampoco toca `/api`, pero eso no se le pide a él por escrito.
        'Cache-Control': 'private, no-store',
        // **Sin `Content-Length` a propósito.** Es tentador reenviar el que da
        // Drive para que el navegador pinte una barra de progreso, y es una
        // trampa: si la respuesta viene comprimida, ese número es el del cuerpo
        // comprimido mientras que lo que sale de aquí ya está descomprimido, y
        // un Content-Length que no cuadra con los bytes es un archivo corrupto.
        // Se sirve troceado: se pierde la barra, no el documento.
      },
    })
  } catch (err) {
    return respuestaDeError(err, 'documents/file', nombreDueno)
  }
}
