'use client'

import { useEffect, useState } from 'react'
import { HardDrive, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useStore } from '@/lib/store-context'
import { useConfirmAction } from '@/hooks/useConfirmAction'

/**
 * Google Drive en Ajustes.
 *
 * **Solo aparece si hay algo que enseñar**: quien nunca ha subido un documento no
 * tiene aquí ninguna tarjeta, ni un botón de conectar. Conectar se ofrece donde
 * hace falta —al ir a subir— y no en una lista de ajustes que se recorre con otro
 * objetivo. Esto es para lo de después: ver con qué cuenta quedó y poder soltarla.
 */
export function StorageCard() {
  const { storageConnection, reloadStorageConnection, connectStorageUrl, disconnectStorage } = useStore()
  const { confirming, requestConfirm, resetConfirm } = useConfirmAction()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void reloadStorageConnection()
  }, [reloadStorageConnection])

  // Ni mientras se pregunta ni cuando no hay nada conectado: en los dos casos, no
  // hay nada que contar y una tarjeta vacía es ruido en una pantalla que ya es larga.
  if (!storageConnection || storageConnection.demo) return null
  if (!storageConnection.conectada && !storageConnection.revocada) return null

  async function desconectar() {
    setOcupado(true)
    setError(null)
    try {
      await disconnectStorage()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desconectar.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-canvas text-primary">
          <HardDrive size={18} strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-ink">Google Drive</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {storageConnection.revocada
              ? 'La conexión ya no vale. Los documentos que subiste siguen en tu Drive, pero la familia no puede abrirlos hasta que vuelvas a dar permiso.'
              : storageConnection.email
                ? `Los documentos que subes se guardan en ${storageConnection.email}.`
                : 'Los documentos que subes se guardan en tu Google Drive.'}
          </p>
        </div>
      </div>

      {storageConnection.revocada && connectStorageUrl ? (
        <a
          href={connectStorageUrl}
          className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Volver a conectar
        </a>
      ) : (
        <>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => requestConfirm(() => { void desconectar() })}
            onBlur={resetConfirm}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${confirming ? 'bg-danger text-white' : 'border border-line text-muted hover:bg-surface'}`}
          >
            {ocupado && <Loader2 size={14} className="animate-spin" />}
            {confirming ? 'Confirmar: los demás dejarán de ver tus documentos' : 'Desconectar Google Drive'}
          </button>
          {/* Desconectar no borra nada de nadie, y hay que decirlo: lo que se
              pierde no es el archivo, es que Nido pueda enseñárselo a la familia. */}
          <p className="text-[10px] leading-relaxed text-faint">
            No se borra ningún archivo de tu Drive. Los documentos que subiste dejarán de poder abrirse en Nido
            hasta que vuelvas a conectarlo.
          </p>
        </>
      )}

      {error && <p className="text-[11px] font-medium text-danger">{error}</p>}
    </Card>
  )
}
