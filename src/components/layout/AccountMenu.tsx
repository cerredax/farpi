'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useStore } from '@/lib/store-context'
import { memberColor, textColorOn } from '@/lib/assignees'
import { IS_DEMO_MODE, signOut } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/constants'
import { PESTAÑAS_VISIBLES } from '@/components/settings/pestanas'

/**
 * La cuenta de quien mira, y por donde se entra a Ajustes en **escritorio**: una
 * fila al pie de `SideNav` con la inicial y el nombre.
 *
 * Antes era un enlace "Ajustes" con su rueda, y tenía dos problemas: la app no
 * decía en ninguna pantalla con qué cuenta estabas, y cerrar sesión vivía a
 * cuatro toques, dentro de la pestaña Cuenta de la pantalla a la que menos se
 * entra.
 *
 * En móvil esto mismo estuvo el 28-08-2026 como un círculo con la inicial arriba
 * a la derecha de `TopBar`, y duró un día: eran dos bordes de la pantalla para
 * navegar —la barra de abajo y esa esquina— y el de arriba no decía a dónde
 * llevaba. Lo que llevaba dentro vive ahora en "Más", la sexta pastilla de
 * `BottomNav` (`MoreMenu`). Aquí se queda la fila, que en una columna de 224 px
 * cabe entera y dice de quién es la sesión.
 *
 * El menú **no** lleva los ajustes dentro: lleva sus cinco secciones, y cada una
 * entra directa a su pestaña (`/settings?seccion=…`). Es la diferencia entre un
 * índice y un armario, y es lo que evita el golpe que este repositorio ya se dio
 * dos veces escondiendo contenido (el catálogo de las listas, las tareas del
 * día). Lo único que se mudó de verdad es cerrar sesión, que no es un ajuste de
 * la casa sino salir de la app.
 *
 * Aquí no se nombra la familia. Estuvo un rato bajo el nombre de la persona y
 * confundía las dos cosas —quién eres y en qué casa estás—; el nombre de la casa
 * se dice en Ajustes → Familia, que es donde se cambia.
 */
export function AccountMenu() {
  const { currentMember, members, kids } = useStore()
  const [open, setOpen] = useState(false)

  const nombre = currentMember?.display_name ?? 'Mi cuenta'
  const color = currentMember ? memberColor(members, currentMember.id, kids) : null
  const inicial = nombre.trim().charAt(0).toUpperCase() || '?'

  async function cerrarSesion() {
    await signOut()
    // Sin `router.replace`: el proxy decide a dónde se puede ir sin sesión, y
    // recargar de verdad tira además el estado que quedara en memoria.
    window.location.href = '/auth/login'
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // Con nombre propio y no el del texto que lleva dentro: el nombre de la
        // persona ya está escrito en la fila, y repetirlo dejaba un botón que se
        // leía "Omar Omar".
        aria-label={`Cuenta de ${nombre}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-canvas"
      >
        {/* El círculo con la inicial. */}
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
            color ? '' : 'bg-surface text-muted'
          }`}
          style={color ? { backgroundColor: color, color: textColorOn(color) } : undefined}
        >
          {inicial}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{nombre}</span>
      </button>

      <BottomSheet open={open} title={nombre} onClose={() => setOpen(false)}>
        <div className="space-y-4 px-5 pt-1 pb-8">
          <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm">
            {/* Enlaces de verdad y no botones: llevan a otra pantalla, así que se
                pueden abrir en otra pestaña y el navegador dice a dónde van. */}
            {PESTAÑAS_VISIBLES.map((p, i) => (
              <Link
                key={p.key}
                href={`${ROUTES.settings}?seccion=${p.key}`}
                onClick={() => setOpen(false)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-canvas ${
                  i > 0 ? 'border-t border-hairline' : ''
                }`}
              >
                {p.label}
                <span aria-hidden className="text-faint">›</span>
              </Link>
            ))}
          </div>

          {/* En demo no hay sesión que cerrar: la app entera funciona sin cuenta,
              así que ofrecerlo llevaría al login desde ningún sitio. Es la misma
              guarda que tenía `AccountActions`, de donde viene. */}
          {!IS_DEMO_MODE && (
            <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm">
              <button
                type="button"
                onClick={cerrarSesion}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-canvas"
              >
                <LogOut size={16} strokeWidth={2} className="flex-shrink-0 text-muted" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  )
}
