'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Settings } from 'lucide-react'
import { useStore } from '@/lib/store-context'
import { useIsClient } from '@/hooks/useIsClient'
import { getGreeting } from '@/lib/date-utils'
import { capitalize } from '@/lib/text'

const titles: Record<string, string> = {
  '/calendar': 'Calendario',
  '/tasks':    'Tareas',
  '/lists':    'Listas',
  '/meals':    'Comidas',
  '/docs':     'Documentos',
  '/settings': 'Ajustes',
}

export function TopBar() {
  const pathname = usePathname()
  const base = '/' + pathname.split('/')[1]
  const title = titles[base]
  const isHome = base === '/home'
  const { family } = useStore()

  // La fecha solo se pinta en el navegador: /home se prerenderiza, así que el
  // HTML servido llevaría el día del build. Hasta entonces se enseña la
  // cabecera de siempre, que no depende de la hora.
  const ahora = useIsClient() ? new Date() : null

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-canvas border-b border-line">
      <div className="flex items-center justify-between h-14 max-w-lg mx-auto px-4">
        {isHome ? (
          <div className="flex flex-col min-w-0">
            <span className="text-primary font-extrabold tracking-tight text-lg leading-tight truncate">
              {ahora ? getGreeting(ahora) : 'Nido'}
            </span>
            <span className="text-[10px] font-semibold text-muted leading-none truncate">
              {ahora ? capitalize(format(ahora, "EEEE, d 'de' MMMM", { locale: es })) : family.name}
            </span>
          </div>
        ) : (
          <span className="font-extrabold tracking-tight text-ink text-lg">{title ?? 'Nido'}</span>
        )}
        <Link
          href="/settings"
          className="p-2 rounded-full text-muted hover:text-ink hover:bg-line transition-colors"
          aria-label="Ajustes"
        >
          <Settings size={20} strokeWidth={1.8} />
        </Link>
      </div>
    </header>
  )
}
