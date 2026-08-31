import 'server-only'
import type { StorageProviderId } from '@/types'
import { googleDrive } from './google-drive'
import { ErrorAlmacen, type DocumentStorageProvider } from './types'

/**
 * Quién guarda qué.
 *
 * El equivalente de `mockRepos` / `supabaseRepos` para la capa de disco, con la
 * misma idea detrás: la fila dice qué proveedor la guarda y aquí se traduce a la
 * implementación. Hoy hay una sola, y aun así el reparto existe — es lo que hace
 * que el contrato sea de verdad y no un adorno: el día que entre Dropbox se añade
 * una línea aquí, un valor al `check` de la columna y una clase nueva, y no hay
 * que ir a buscar dónde estaba `googleDrive` escrito a mano.
 */
const PROVEEDORES: Record<StorageProviderId, DocumentStorageProvider> = {
  google_drive: googleDrive,
}

export function getProvider(id: string): DocumentStorageProvider {
  const proveedor = PROVEEDORES[id as StorageProviderId]
  if (!proveedor) {
    throw new ErrorAlmacen('desconocido', `Este documento está guardado en "${id}", que esta versión de Farpi no sabe leer`)
  }
  return proveedor
}

export type { DocumentStorageProvider } from './types'
