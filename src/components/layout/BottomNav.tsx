'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, ClipboardList, CheckSquare, UtensilsCrossed, FolderOpen } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

const navItems = [
  { href: ROUTES.home,     label: 'Inicio',     icon: Home },
  { href: ROUTES.calendar, label: 'Calendario', icon: Calendar },
  { href: ROUTES.lists,    label: 'Listas',     icon: CheckSquare },
  { href: ROUTES.tasks,    label: 'Tareas',     icon: ClipboardList },
  { href: ROUTES.meals,    label: 'Comidas',    icon: UtensilsCrossed },
  { href: ROUTES.docs,     label: 'Docs',       icon: FolderOpen },
]

export function BottomNav() {
  const pathname = usePathname()

  // `lg:hidden`: desde ahí manda `SideNav`, la columna de la izquierda. Por
  // debajo de `lg` esto es exactamente lo que era.
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-line safe-area-pb lg:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-xl transition-colors min-w-0 ${
                active
                  ? 'text-primary'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? 'drop-shadow-sm' : ''}
              />
              {/* Sin `truncate`: recortaba la etiqueta por abajo y el texto no
                  se leía. La caja de línea era más corta que las letras que
                  dibuja la fuente, y lo que sobresalía se cortaba. Son seis
                  palabras cortas, así que basta con que no partan en dos. */}
              <span className={`text-[10px] font-semibold leading-tight whitespace-nowrap ${active ? 'text-primary' : ''}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
