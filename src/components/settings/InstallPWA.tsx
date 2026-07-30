'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Botón para instalar la PWA. Solo aparece cuando el navegador dispara
 * `beforeinstallprompt` (Android/desktop, en HTTPS). En iOS no existe ese
 * evento: allí se instala con "Añadir a pantalla de inicio" desde Safari.
 */
export function InstallPWA() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    const installed = () => setDeferred(null)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  if (!deferred) return null

  async function install() {
    await deferred!.prompt()
    setDeferred(null)
  }

  return (
    <button
      onClick={install}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-hover"
    >
      <Download size={16} strokeWidth={2.4} />
      Instalar Nido en el dispositivo
    </button>
  )
}
