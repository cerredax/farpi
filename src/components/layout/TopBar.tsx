'use client'

import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/calendar': 'Calendario',
  '/tasks':    'Tareas',
  '/lists':    'Listas',
  '/meals':    'Comidas',
  '/money':    'Dinero',
  '/notes':    'Notas',
  '/docs':     'Documentos',
  '/settings': 'Ajustes',
}

export function TopBar() {
  const pathname = usePathname()
  const base = '/' + pathname.split('/')[1]
  const title = titles[base]

  // El nombre de la pantalla va en verde de marca, no en tinta: la cabecera es
  // lo primero que se ve y es donde la app dice quién es. Se usa
  // `primary-strong` (#5C7A59) y no `primary` (#8BA888) por contraste: a 18 px
  // el título no llega a "texto grande", así que le toca el 4,5:1 de WCAG, y el
  // salvia claro se queda en 2,44 sobre el crema. El oscuro da 4,48 y sigue
  // siendo el mismo verde.
  //
  // En Inicio la cabecera dice "Farpi" y ya no el saludo con la fecha debajo:
  // eso vive ahora en la tarjeta del día, donde se lee grande y cerca de lo que
  // hay que hacer. Tenerlo en los dos sitios era repetir la misma hora dos
  // veces en la misma pantalla.

  return (
    // `lg:pl-56` deja libre el ancho de `SideNav`, que se pinta encima de esta
    // esquina. La columna estrecha de móvil (`max-w-lg`) se suelta en escritorio.
    <header className="fixed top-0 left-0 right-0 z-50 bg-canvas border-b border-line lg:pl-56">
      <div className="flex items-center h-14 max-w-lg mx-auto px-4 lg:max-w-none lg:px-8">
        <h1 className="font-extrabold tracking-tight text-primary-strong text-lg">{title ?? 'Farpi'}</h1>
      </div>
    </header>
  )
}
