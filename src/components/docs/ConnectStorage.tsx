'use client'

import { HardDriveUpload } from 'lucide-react'
import type { StorageConnection } from '@/types'

interface ConnectStorageProps {
  conexion: StorageConnection
  /** Nunca es `null` aquí: quien decide pintar esto ya lo ha comprobado. */
  connectUrl: string
}

/**
 * El único sitio donde se nombra a Google Drive.
 *
 * Casi nadie de la familia va a ver esto nunca: hace falta para **subir** un
 * documento, no para verlos. Quien solo mira los papeles de casa no tiene que
 * conectar nada, ni enterarse de que hay un Drive detrás — de eso trata todo el
 * diseño, y por eso este bloque vive dentro del sheet de subir y no en Ajustes ni
 * en una pantalla de bienvenida.
 *
 * Aparece justo donde iría el selector de archivo, porque es exactamente el
 * momento en el que hace falta y el único en que la explicación se entiende.
 *
 * En modo demo no se pinta nunca: allí no hay proveedor al que conectarse y el
 * selector de archivo de siempre funciona, guardando en el navegador. Quien decide
 * es `faltaConectar` en `DocSheet`.
 */
export function ConnectStorage({ conexion, connectUrl }: ConnectStorageProps) {
  return (
    <div className="space-y-2 rounded-xl border border-line bg-canvas px-4 py-3">
      <p className="text-sm font-bold text-ink">
        {conexion.revocada ? 'Vuelve a conectar tu Google Drive' : 'Conecta tu Google Drive'}
      </p>
      <p className="text-xs leading-relaxed text-muted">
        {conexion.revocada
          // Que se haya caído la conexión no es culpa de nadie —pasa al revisar
          // los permisos de la cuenta de Google— pero sí tiene una consecuencia
          // que hay que decir, porque afecta a los demás y no se ve.
          ? 'Los documentos que subiste siguen en tu Drive, pero la familia no puede abrirlos hasta que vuelvas a dar permiso.'
          : 'Los documentos que subas se guardarán en tu Drive. El resto de la familia los verá en Farpi como siempre, sin conectar nada.'}
      </p>
      <a
        href={connectUrl}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        <HardDriveUpload size={16} strokeWidth={2.3} />
        {conexion.revocada ? 'Volver a conectar' : 'Conectar Google Drive'}
      </a>
    </div>
  )
}
