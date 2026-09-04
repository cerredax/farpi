'use client'

import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/home':     'Inicio',
  '/calendar': 'Calendario',
  '/tasks':    'Tareas',
  '/lists':    'Listas',
  '/meals':    'Comidas',
  '/finanzas': 'Finanzas',
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
  // En Inicio la cabecera **dice "Inicio", como las demás dicen la suya**
  // (04-09-2026). Decía "Farpi", que era la única pantalla de la app donde la
  // barra de arriba hablaba de otra cosa que de dónde estás: el nombre de la app
  // ya lo dice la columna de escritorio, y en móvil no hace falta que lo diga
  // nada —quien abre la app sabe qué app ha abierto—. Lo que sí falta al llegar a
  // una pantalla es saber en cuál estás, y en Inicio era la única que no lo
  // decía. "Farpi" se queda como respaldo por si aparece una ruta sin nombre.
  //
  // Lo que se fue de aquí en su día, y no vuelve: el saludo con la fecha debajo.
  // Vive en la tarjeta del día, donde se lee grande y cerca de lo que hay que
  // hacer; tenerlo en los dos sitios era decir la misma hora dos veces en la
  // misma pantalla.

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
