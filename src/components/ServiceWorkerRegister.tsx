'use client'

import { useEffect } from 'react'

/**
 * Registra el service worker (solo en producción) para habilitar la PWA
 * offline. En desarrollo no se registra para no interferir con el HMR.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* si falla, la app sigue funcionando online */
      })
    }

    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
