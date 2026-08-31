import { pedirApi } from './api-farpi'
import type { StorageProvidersRepo } from '../repos/types'
import type { StorageConnection } from '@/types'

/**
 * La conexión con Google Drive de quien está usando la app.
 *
 * Todo pasa por rutas API y ninguna consulta toca la tabla: `storage_connections`
 * tiene RLS activada **sin ninguna policy**, así que desde el navegador no se ve
 * ni la fila propia. Es a propósito — lo que hay dentro son tokens, y la CSP de
 * Farpi lleva `'unsafe-inline'` en los scripts, así que no para un XSS en línea.
 * Lo que sale de aquí es si hay conexión y con qué correo.
 */
export const storageProvidersRepo: StorageProvidersRepo = {
  getConnection(): Promise<StorageConnection> {
    return pedirApi<StorageConnection>('/api/documents/providers', undefined, 'GET')
  },

  connectUrl(): string {
    return '/api/documents/providers/google/start'
  },

  async disconnect(): Promise<void> {
    await pedirApi<{ ok: true }>('/api/documents/providers', undefined, 'DELETE')
  },
}
