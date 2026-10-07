'use client'

import { useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useIsClient } from '@/hooks/useIsClient'
import { useT } from '@/lib/i18n/contexto'
import {
  currentPermission,
  descartarOfertaDeAvisos,
  enablePush,
  ofertaDeAvisosDescartada,
  ofrecerAvisos,
  pushConfigured,
  pushSupported,
} from '@/lib/push'

/**
 * La invitación a activar los avisos, en Inicio y a un toque.
 *
 * Existe porque los avisos solo se podían activar en Ajustes, enterrados en una
 * pestaña: en la práctica nadie los encendía y la casa no recibía nada. Aparece
 * **solo mientras el navegador no ha preguntado nunca** —ver `ofrecerAvisos`— y
 * desaparece sola al activarlos o al decir «Ahora no».
 *
 * Como `ExpiringDocs`, no es una sección de Inicio: aparece y se atiende. Pedir el
 * permiso tiene que salir de un toque de la persona, por eso es un botón y no
 * algo que se lance al abrir la app.
 */
export function ActivarAvisos() {
  const t = useT()
  const cliente = useIsClient()
  const [hecho, setHecho] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  // Solo en el navegador: el permiso y `localStorage` no existen al prerenderizar.
  if (!cliente || hecho) return null
  if (!ofrecerAvisos({
    soportado: pushSupported(),
    configurado: pushConfigured(),
    permiso: currentPermission(),
    descartado: ofertaDeAvisosDescartada(),
  }) && !error) return null

  async function activar() {
    setBusy(true)
    setError(false)
    try {
      await enablePush()
      setHecho(true)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  function ahoraNo() {
    descartarOfertaDeAvisos()
    setHecho(true)
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-warm px-4 py-3 shadow-sm lg:col-span-2">
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-canvas text-primary-strong"
          aria-hidden
        >
          <Bell size={18} strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-ink">{t.inicio.avisos.titulo}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t.inicio.avisos.explicacion}</p>
        </div>
      </div>
      {error && <p className="text-xs font-medium text-danger-strong">{t.inicio.avisos.noSePudo}</p>}
      <div className="flex gap-2">
        <Button onClick={activar} disabled={busy} className="flex-1 min-h-11">
          {busy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 size={15} className="animate-spin" /> {t.inicio.avisos.activando}
            </span>
          ) : (
            t.inicio.avisos.activar
          )}
        </Button>
        <Button variant="ghost" onClick={ahoraNo} disabled={busy} className="min-h-11">
          {t.inicio.avisos.ahoraNo}
        </Button>
      </div>
    </div>
  )
}
