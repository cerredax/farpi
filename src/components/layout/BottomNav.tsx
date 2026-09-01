'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { SECCIONES_MOVIL } from './secciones'
import { MoreMenu } from './MoreMenu'

/**
 * Cada pastilla de la barra, la misma para los cinco enlaces y para "Más".
 * Vive fuera del componente para que el botón de `MoreMenu` no tenga que
 * repetir las clases: la sexta pastilla no puede parecerse a las otras cinco,
 * tiene que ser igual.
 */
function claseItem(activa: boolean) {
  return `flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-xl transition-colors min-w-0 ${
    activa ? 'text-primary' : 'text-muted hover:text-ink'
  }`
}

/*
 * Sin `truncate` en la etiqueta: recortaba el texto por abajo y no se leía. La
 * caja de línea era más corta que las letras que dibuja la fuente, y lo que
 * sobresalía se cortaba. Son seis palabras cortas, así que basta con que no
 * partan en dos.
 */
const CLASE_ETIQUETA = 'text-[10px] font-semibold leading-tight whitespace-nowrap'

export function BottomNav() {
  const pathname = usePathname()

  // `lg:hidden`: desde ahí manda `SideNav`, la columna de la izquierda. Por
  // debajo de `lg` esto es exactamente lo que era.
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-line safe-area-pb lg:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {SECCIONES_MOVIL.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className={claseItem(active)}>
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? 'drop-shadow-sm' : ''}
              />
              <span className={`${CLASE_ETIQUETA} ${active ? 'text-primary' : ''}`}>{label}</span>
            </Link>
          )
        })}

        {/* La sexta: Dinero, Notas, Documentos, Ajustes y cerrar sesión. No se
            marca activa en ninguna de esas rutas —no es una pantalla, es por
            dónde se llega— y marcarla haría creer que la barra tiene una sección
            llamada "Más". */}
        <MoreMenu className={claseItem(false)}>
          <MoreHorizontal size={22} strokeWidth={1.8} />
          <span className={CLASE_ETIQUETA}>Más</span>
        </MoreMenu>
      </div>
    </nav>
  )
}
