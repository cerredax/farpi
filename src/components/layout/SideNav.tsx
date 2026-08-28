'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SECCIONES } from './secciones'
import { AccountMenu } from './AccountMenu'

/**
 * La navegación en escritorio: una columna a la izquierda en lugar de la barra
 * de abajo.
 *
 * Existe solo desde `lg`. Por debajo no se pinta —`hidden`, sin `fixed` ni nada
 * que la coloque— y manda `BottomNav`, que a su vez desaparece en `lg:hidden`.
 * Las dos son la misma lista de secciones; lo único que cambia es dónde se pone.
 *
 * Al pie, la cuenta (`AccountMenu`), que es por donde se entra a Ajustes desde
 * el 28-08-2026: en móvil la misma fila está al final de Inicio. Y el nombre de
 * la casa arriba, a la altura de `TopBar` (`h-14`), para que las dos cabeceras
 * estén en la misma línea.
 */
export function SideNav() {
  const pathname = usePathname()
  const esActiva = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <nav
      aria-label="Secciones"
      className="hidden lg:z-50 lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 lg:flex-col lg:border-r lg:border-line lg:bg-white"
    >
      <div className="flex h-14 flex-shrink-0 items-center px-5">
        <span className="text-lg font-extrabold tracking-tight text-primary">Nido</span>
      </div>

      <ul className="flex-1 space-y-1 px-3 py-2">
        {SECCIONES.map(({ href, label, icon: Icon }) => {
          const activa = esActiva(href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={activa ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  activa ? 'bg-primary-tint text-primary' : 'text-muted hover:bg-canvas hover:text-ink'
                }`}
              >
                <Icon size={19} strokeWidth={activa ? 2.4 : 1.8} className="flex-shrink-0" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* El pie es la cuenta, no "Ajustes" (28-08-2026). El enlace suelto no
          decía con quién estabas dentro y dejaba cerrar sesión a cuatro toques,
          enterrado en una pestaña de Ajustes. Ajustes sigue estando: es la
          primera fila del menú que abre esta fila. */}
      <div className="border-t border-hairline px-3 py-3">
        <AccountMenu />
      </div>
    </nav>
  )
}
