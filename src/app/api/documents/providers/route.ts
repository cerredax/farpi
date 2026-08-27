import { NextResponse } from 'next/server'
import { requiereSesion } from '@/lib/supabase/guard'
import { respuestaDeError } from '@/lib/document-storage/api'
import {
  borrarConexion,
  FALTA_CONFIG_DRIVE,
  leerConexion,
  respuestaSinConfigDrive,
  revocarEnGoogle,
} from '@/lib/document-storage/tokens'
import type { StorageConnection } from '@/types'

/**
 * Si quien pregunta tiene almacenamiento conectado, y con qué cuenta.
 *
 * Esta ruta existe porque `storage_connections` está cerrada a cal y canto (RLS
 * sin ninguna policy) y la interfaz necesita saber si enseñar el botón de
 * conectar. Devuelve tres booleanos y un correo; **ningún token sale de aquí**,
 * que es justo el motivo de que la tabla no se consulte desde el navegador.
 */
export async function GET() {
  const guardia = await requiereSesion()
  if (guardia.fallo) return guardia.fallo
  const { user } = guardia
  if (FALTA_CONFIG_DRIVE) return respuestaSinConfigDrive('documents/providers')

  try {
    const conexion = await leerConexion(user.id)
    const estado: StorageConnection = {
      provider: 'google_drive',
      conectada: !!conexion && !conexion.revocada,
      revocada: !!conexion?.revocada,
      email: conexion?.email ?? null,
      demo: false,
    }
    return NextResponse.json(estado)
  } catch (err) {
    return respuestaDeError(err, 'documents/providers')
  }
}

/**
 * Desconectar.
 *
 * **No borra ningún archivo del Drive de nadie**: son suyos y están en su disco.
 * Lo que se pierde es la posibilidad de que Nido los sirva al resto de la
 * familia, y esos documentos pasan a mostrar el aviso de "hay que volver a
 * conectar" hasta que se conecte otra vez. Las fichas se quedan donde están.
 */
export async function DELETE() {
  const guardia = await requiereSesion()
  if (guardia.fallo) return guardia.fallo
  const { user } = guardia
  if (FALTA_CONFIG_DRIVE) return respuestaSinConfigDrive('documents/providers')

  try {
    const conexion = await leerConexion(user.id)
    // También del lado de Google: desconectar en Nido y que el permiso siga vivo
    // en la cuenta de Google sería mentir a medias.
    if (conexion) await revocarEnGoogle(conexion.refreshToken)
    await borrarConexion(user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return respuestaDeError(err, 'documents/providers')
  }
}
