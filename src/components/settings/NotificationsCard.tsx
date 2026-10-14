'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useT } from '@/lib/i18n/contexto'
import {
  pushSupported, pushConfigured, currentPermission, enablePush, disablePush, iosSinInstalar,
  estadoDeAvisos, guardarPreferenciasDeAvisos,
} from '@/lib/push'
import { PREFERENCIAS_POR_DEFECTO, type PreferenciasDeAvisos } from '@/lib/reminders'

export function NotificationsCard() {
  const t = useT()
  const r = t.ajustes.recordatorios
  const [supported] = useState(() => pushSupported())
  const [configured] = useState(() => pushConfigured())
  const [subscribed, setSubscribed] = useState(false)
  const [preferencias, setPreferencias] = useState<PreferenciasDeAvisos>(PREFERENCIAS_POR_DEFECTO)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Como `supported`: se resuelve una vez al montar, no en cada render.
  const [pendienteInstalar] = useState(() => iosSinInstalar())

  // Se le pregunta **al servidor**, no solo al navegador. Tener suscripción aquí
  // no significa estar suscrito: el cron borra las que el servidor de push da por
  // muertas, y un alta puede no haberse llegado a guardar. Mientras esto miró solo
  // a `getSubscription()`, un móvil sin fila en la base enseñaba «Desactivar
  // notificaciones» y no recibía un aviso en su vida.
  //
  // Y no se espera a `serviceWorker.ready` a pelo: esa promesa no rechaza nunca si
  // no hay worker activo. `estadoDeAvisos` pasa por `registroListo`, que lleva reloj.
  useEffect(() => {
    if (!supported || !configured) return
    let vigente = true
    estadoDeAvisos()
      .then(estado => {
        if (!vigente) return
        setSubscribed(estado.activo)
        setPreferencias(estado.preferencias)
      })
      .catch(() => {})
    return () => { vigente = false }
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
        // Una suscripción que ya existía conserva lo que se eligió: se vuelve a leer.
        const estado = await estadoDeAvisos()
        setPreferencias(estado.preferencias)
        setSubscribed(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : r.noSeCambio)
    } finally {
      setBusy(false)
    }
  }

  // Se guarda al toque, sin botón de guardar. El interruptor cambia en el acto y
  // vuelve atrás si el servidor no lo acepta: dejarlo cambiado sería mentir sobre
  // lo que va a llegar.
  async function cambiar(clave: keyof PreferenciasDeAvisos) {
    const antes = preferencias
    setPreferencias({ ...antes, [clave]: !antes[clave] })
    setError(null)
    try {
      await guardarPreferenciasDeAvisos({ [clave]: !antes[clave] })
    } catch {
      setPreferencias(antes)
      setError(r.noSeGuardo)
    }
  }

  const denied = supported && currentPermission() === 'denied'

  const opciones: { clave: keyof PreferenciasDeAvisos; titulo: string; detalle: string }[] = [
    { clave: 'resumen', titulo: r.resumen, detalle: r.resumenDetalle },
    { clave: 'eventos', titulo: r.eventos, detalle: r.eventosDetalle },
    { clave: 'cumples', titulo: r.cumples, detalle: r.cumplesDetalle },
  ]

  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-canvas text-primary-strong">
          {subscribed ? <Bell size={18} strokeWidth={2.3} /> : <BellOff size={18} strokeWidth={2.3} />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-ink">{r.titulo}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{r.explicacion}</p>
        </div>
      </div>

      {!supported ? (
        pendienteInstalar ? (
          <p className="text-xs text-muted">
            {r.iosAntes}
            <span className="font-semibold text-ink">{r.iosCompartir}</span>
            {r.iosEntre}
            <span className="font-semibold text-ink">{r.iosAnadirAInicio}</span>
            {r.iosDespues}
          </p>
        ) : (
          <p className="text-xs text-muted">{r.noAdmite}</p>
        )
      ) : !configured ? (
        <p className="text-xs text-muted">{r.proximamente}</p>
      ) : denied ? (
        <p className="text-xs text-danger-strong">{r.bloqueadas}</p>
      ) : (
        <>
          <p className="text-xs font-semibold text-ink" role="status">
            {subscribed ? r.estadoActivo : r.estadoInactivo}
          </p>

          {subscribed && (
            <div className="-mx-4 border-t border-hairline">
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted">{r.queAvisar}</p>
              <ul className="divide-y divide-hairline">
                {opciones.map(({ clave, titulo, detalle }) => {
                  const activa = preferencias[clave]
                  return (
                    <li key={clave}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={activa}
                        onClick={() => cambiar(clave)}
                        className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas"
                      >
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-semibold ${activa ? 'text-ink' : 'text-muted'}`}>{titulo}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-muted">{detalle}</span>
                        </span>
                        {/* El interruptor es decorativo: quien manda es el `aria-checked`
                            del botón, y el lector de pantalla lo lee de ahí. */}
                        <span
                          aria-hidden="true"
                          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${activa ? 'bg-primary-strong' : 'bg-line-strong'}`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${activa ? 'left-[1.375rem]' : 'left-0.5'}`}
                          />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="px-4 pt-2 text-[11px] leading-snug text-muted">{r.cadaDispositivo}</p>
            </div>
          )}

          <Button
            onClick={toggle}
            disabled={busy}
            variant={subscribed ? 'secondary' : 'primary'}
            fullWidth
            className="min-h-11"
          >
            {busy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin" /> {r.guardando}
              </span>
            ) : subscribed ? (
              r.desactivar
            ) : (
              r.activar
            )}
          </Button>
          {error && <p className="text-xs text-danger-strong font-medium">{error}</p>}
        </>
      )}
    </Card>
  )
}
