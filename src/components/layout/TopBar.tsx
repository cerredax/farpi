'use client'

import { usePathname } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
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

  // El nombre de la pantalla va en verde de marca, no en tinta: la cabecera es
  // lo primero que se ve y es donde la app dice quién es. Se usa
  // `primary-strong` (#5C7A59) y no `primary` (#8BA888) por contraste: a 18 px
  // el título no llega a "texto grande", así que le toca el 4,5:1 de WCAG, y el
  // salvia claro se queda en 2,44 sobre el crema. El oscuro da 4,48 y sigue
  // siendo el mismo verde. Antes el saludo de Inicio iba en el claro y era el
  // título más flojo de la app; ahora las siete pantallas usan el mismo.

  // La fecha solo se pinta en el navegador: /home se prerenderiza, así que el
  // HTML servido llevaría el día del build. Hasta entonces se enseña la
  // cabecera de siempre, que no depende de la hora.
  const ahora = useIsClient() ? new Date() : null

  return (
    // `lg:pl-56` deja libre el ancho de `SideNav`, que se pinta encima de esta
    // esquina. La columna estrecha de móvil (`max-w-lg`) se suelta en escritorio.
    <header className="fixed top-0 left-0 right-0 z-50 bg-canvas border-b border-line lg:pl-56">
      <div className="flex items-center justify-between h-14 max-w-lg mx-auto px-4 lg:max-w-none lg:px-8">
        {isHome ? (
          <div className="flex flex-col min-w-0">
            <h1 className="text-primary-strong font-extrabold tracking-tight text-lg leading-tight truncate">
              {ahora ? getGreeting(ahora) : 'Nido'}
            </h1>
            <span className="text-[10px] font-semibold text-muted leading-none truncate">
              {ahora ? capitalize(format(ahora, "EEEE, d 'de' MMMM", { locale: es })) : family.name}
            </span>
          </div>
        ) : (
          <h1 className="font-extrabold tracking-tight text-primary-strong text-lg">{title ?? 'Nido'}</h1>
        )}
        {/* La rueda de Ajustes ya no vive aquí (26-08-2026). Arriba a la derecha
            es el sitio de lo que se usa a diario, y Ajustes se toca dos veces al
            año: ocupaba la esquina más alcanzable del pulgar para nada. Ahora es
            una fila al final de Inicio, donde acaba el recorrido de la pantalla.
            En escritorio nunca hizo falta, que `SideNav` la lleva desde siempre. */}
      </div>
    </header>
  )
}
