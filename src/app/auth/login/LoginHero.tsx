import Image from 'next/image'
import { Heart, ShieldCheck } from 'lucide-react'

/**
 * Columna de presentación del login: marca y bienvenida.
 *
 * Tenía cuatro tarjetas de ventajas (Agenda, Pendientes, Comidas, Documentos) y
 * tres insignias de "Gratis / Privado / Sin anuncios". Se fueron: quien abre
 * Nido es de una familia que ya la usa, no alguien a quien haya que convencer.
 * Lo que se queda es lo que informa —el aviso de que solo la familia ve sus
 * datos— y no lo que vende.
 *
 * El reparto también cambió. Con `justify-between` y este contenido quedaba un
 * hueco raro en el medio, así que ahora el logo va arriba discreto, el bloque de
 * bienvenida se centra en el sitio que sobra (`flex-1` + `justify-center`) y el
 * pie se queda abajo.
 */
export function LoginHero() {
  return (
  <section className="flex min-h-[52dvh] flex-col px-6 py-7 sm:px-10 lg:min-h-dvh lg:px-14 lg:py-12 xl:px-20">
    <header className="flex items-center gap-3">
      <Image
        src="/app-icon.svg"
        width={40}
        height={40}
        alt=""
        aria-hidden
        priority
        className="h-10 w-10 rounded-2xl shadow-sm"
      />
      <div>
        <p className="text-lg font-black leading-none tracking-tight">Nido</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Familia en calma</p>
      </div>
    </header>

    <div className="flex flex-1 flex-col justify-center py-12 lg:py-0">
      <div className="max-w-2xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-line bg-primary-tint px-3 py-1.5 text-xs font-bold text-primary-deep">
          <Heart size={14} fill="currentColor" strokeWidth={2.2} />
          Un espacio privado para tu casa
        </div>
        <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl">
          Todo lo importante de tu familia, en un solo lugar.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Nido reúne comidas, tareas, citas y documentos para que la semana sea más clara y la casa se sienta un poco más ligera.
        </p>
      </div>
    </div>

    <footer className="hidden items-center gap-2 text-xs font-semibold text-muted lg:flex">
      <ShieldCheck size={15} strokeWidth={2.3} />
      Solo tu familia puede ver sus datos.
    </footer>
  </section>
  )
}

