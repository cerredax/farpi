'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useStore } from '@/lib/store-context'
import { useIsClient } from '@/hooks/useIsClient'
import { memberColor, textColorOn } from '@/lib/assignees'
import { IS_DEMO_MODE, signOut } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/constants'
import { PESTAÑAS_VISIBLES } from '@/components/settings/pestanas'

/**
 * La cuenta de quien mira, y por donde se entra a Ajustes desde el 28-08-2026.
 *
 * Se pinta en dos sitios y de dos maneras: en escritorio, una fila al pie de
 * `SideNav` con la inicial y el nombre; en móvil, solo el círculo con la inicial
 * arriba a la derecha de `TopBar`, que es donde se busca la cuenta en cualquier
 * app. Antes era un enlace "Ajustes" con su rueda —el pie de la barra lateral y
 * la última fila de Inicio—, y tenía dos problemas: la app no decía en ninguna
 * pantalla con qué cuenta estabas, y cerrar sesión vivía a cuatro toques, dentro
 * de la pestaña Cuenta de la pantalla a la que menos se entra.
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
export function AccountMenu({ variant = 'fila' }: { variant?: 'fila' | 'icono' }) {
  const { currentMember, members, kids } = useStore()
  const [open, setOpen] = useState(false)
  const enElNavegador = useIsClient()

  const nombre = currentMember?.display_name ?? 'Mi cuenta'
  const color = currentMember ? memberColor(members, currentMember.id, kids) : null
  const inicial = nombre.trim().charAt(0).toUpperCase() || '?'

  /**
   * El sheet de la cabecera se pinta en el `body`, no donde está el botón.
   *
   * `TopBar` es `fixed z-50` y por tanto **crea contexto de apilamiento**:
   * dentro de él, el `z-[60]` del sheet no compite con el `z-50` de la barra de
   * abajo, que se pintaba encima y tapaba la última sección del menú. En el
   * `body` vuelve a estar a la misma altura que los sheets del resto de la app,
   * que cuelgan de `main`.
   *
   * El de la barra lateral se queda donde está: ahí no hay barra de abajo con la
   * que pelearse, y sacarlo lo dejaría fuera del `hidden` de `SideNav`, que es
   * lo único que lo apaga en móvil.
   *
   * El `lg:hidden` del envoltorio es por lo mismo pero del revés: en escritorio
   * el botón de la cabecera no se pinta, pero su sheet ya no cuelga de él, así
   * que sin esto seguiría existiendo —cerrado, pero en el árbol— y habría dos
   * menús de cuenta a la vez.
   */
  const enPortal = (sheet: React.ReactNode) =>
    variant === 'icono'
      ? (enElNavegador ? createPortal(<div className="lg:hidden">{sheet}</div>, document.body) : null)
      : sheet

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
        // Con nombre propio y no el del texto que lleva dentro: así se llama
        // igual en los dos tamaños, aunque uno solo enseñe la inicial.
        aria-label={`Cuenta de ${nombre}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={
          variant === 'icono'
            ? 'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface'
            : 'flex w-full min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-canvas'
        }
      >
        {/* El círculo con la inicial, el mismo en los dos sitios. En la
            cabecera de móvil lleva además un anillo blanco: sin él, el color
            de la persona flota solo contra el verde del título y descuadra;
            el anillo lo ancla como una ficha más del encabezado, igual que
            las tarjetas de la app enmarcan sus colores en blanco. */}
        <span
          className={`flex flex-shrink-0 items-center justify-center rounded-full font-extrabold ${
            variant === 'icono' ? 'h-8 w-8 text-xs ring-2 ring-white shadow-sm' : 'h-8 w-8 text-xs'
          } ${color ? '' : 'bg-surface text-muted'}`}
          style={color ? { backgroundColor: color, color: textColorOn(color) } : undefined}
        >
          {inicial}
        </span>
        {variant === 'fila' && (
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{nombre}</span>
        )}
      </button>

      {enPortal(
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
      </BottomSheet>)}
    </>
  )
}
