'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Si una media query se cumple ahora mismo. `false` en el servidor, donde no
 * hay pantalla que medir: quien lo use debe funcionar en móvil por defecto y
 * mejorar al hidratar, no al revés.
 *
 * Solo para lo que CSS no puede resolver —cambiar qué se renderiza, no cómo se
 * ve—. Para lo visual siguen estando los prefijos de Tailwind, que no dependen
 * de JavaScript ni parpadean al hidratar.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
