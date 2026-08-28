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

    // Esperar a `load` es para no competir con la carga inicial, pero si el
    // evento **ya pasó** el listener no se dispara nunca y el service worker se
    // queda sin registrar esa visita entera. Es una carrera contra la
    // hidratación, así que unas veces sale y otras no. Y sin worker activo,
    // `serviceWorker.ready` (el que usa `enablePush`) no resuelve ni rechaza
    // jamás: dejaba el botón de recordatorios en "Guardando…" para siempre.
    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
