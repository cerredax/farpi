'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { pushSupported, pushConfigured, currentPermission, enablePush, disablePush, iosSinInstalar } from '@/lib/push'

export function NotificationsCard() {
  const [supported] = useState(() => pushSupported())
  const [configured] = useState(() => pushConfigured())
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Como `supported`: se resuelve una vez al montar, no en cada render.
  const [pendienteInstalar] = useState(() => iosSinInstalar())

  useEffect(() => {
    if (!supported || !configured) return
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setSubscribed(!!sub))
      .catch(() => {})
  }, [supported, configured])

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      if (subscribed) {
        await disablePush()
        setSubscribed(false)
      } else {
        await enablePush()
        setSubscribed(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la configuración.')
    } finally {
      setBusy(false)
    }
  }

  const denied = supported && currentPermission() === 'denied'

  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-canvas text-primary">
          {subscribed ? <Bell size={18} strokeWidth={2.3} /> : <BellOff size={18} strokeWidth={2.3} />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-ink">Recordatorios</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Avisos de eventos y tareas de la familia en este dispositivo.
          </p>
        </div>
      </div>

      {!supported ? (
        pendienteInstalar ? (
          <p className="text-xs text-muted">
            Para recibir avisos en el iPhone, añade Nido a la pantalla de inicio:
            toca <span className="font-semibold text-ink">Compartir</span> y luego{' '}
            <span className="font-semibold text-ink">Añadir a pantalla de inicio</span>.
            Abre la app desde ahí y vuelve a estos ajustes.
          </p>
        ) : (
          <p className="text-xs text-muted">Tu navegador no admite notificaciones.</p>
        )
      ) : !configured ? (
        <p className="text-xs text-muted">Estarán disponibles próximamente.</p>
      ) : denied ? (
        <p className="text-xs text-danger">
          Has bloqueado las notificaciones. Actívalas desde los ajustes del navegador para este sitio.
        </p>
      ) : (
        <>
          <button
            onClick={toggle}
            disabled={busy}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
              subscribed
                ? 'border border-line text-muted hover:bg-surface'
                : 'bg-primary text-white hover:bg-primary-hover'
            }`}
          >
            {busy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin" /> Guardando…
              </span>
            ) : subscribed ? (
              'Desactivar notificaciones'
            ) : (
              'Activar notificaciones'
            )}
          </button>
          {error && <p className="text-xs text-danger font-medium">{error}</p>}
        </>
      )}
    </Card>
  )
}
