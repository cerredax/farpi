import Image from 'next/image'
import { Garantias } from '@/components/ui/Garantias'
import { DayIllustration } from '@/components/home/DayIllustration'
import { getDayPeriodEnMadrid } from '@/lib/date-utils'

/**
 * Columna de presentación del login: marca y bienvenida.
 *
 * Tenía cuatro tarjetas de ventajas (Agenda, Pendientes, Comidas, Documentos) y
 * tres insignias de "Gratis / Privado / Sin anuncios". Se fueron: quien abre
 * Farpi es de una familia que ya la usa, no alguien a quien haya que convencer.
 *
 * Desde el 02-09-2026 dice **lo mismo que la portada**, y no una versión propia.
 * Tenía su titular ("Todo lo importante de tu familia, en un solo lugar"), su
 * insignia de corazón y su línea de escudo al pie, mientras la portada llevaba
 * la casa, "Qué tenemos que saber hoy en casa." y `Garantias`. Eran dos caras
 * para la misma app a un clic de distancia, y el formulario que hay al lado ya
 * es el mismo (`AuthCard`) desde el 01-09-2026. Aquí se llega desde una
 * invitación por correo o un enlace de recuperación: reconocer lo que se vio en
 * el anuncio importa más que decir algo nuevo.
 *
 * El titular y el párrafo se repiten en `LandingPage`. No se han sacado a una
 * constante a propósito: son dos, se leen enteros donde se pintan, y cada
 * pantalla los maqueta a su tamaño. Si cambian, cambian en los dos sitios.
 */
export function LoginHero() {
  const tramo = getDayPeriodEnMadrid()

  return (
  <section className="flex min-h-[52dvh] flex-col px-6 py-7 sm:px-10 lg:min-h-dvh lg:px-14 lg:py-12 xl:px-20">
    {/* Esta pantalla no tiene la cabecera de la portada, así que el logo es la
        única marca que hay: se queda arriba y discreto. */}
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
        <p className="text-lg font-black leading-none tracking-tight">Farpi</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Familia en calma</p>
      </div>
    </header>

    {/* El bloque de bienvenida se centra en el hueco que sobra: con
        `justify-between` quedaba un vacío raro en medio. */}
    <div className="flex flex-1 flex-col justify-center py-12 lg:py-0">
      {/* La misma composición que la portada: la casa al lado del titular y no
          encima, porque suelta en su propia línea se queda en mitad de la nada.
          En móvil acompaña al titular y el párrafo pasa por debajo de ella
          (`col-span-2`); en escritorio baja las dos filas y se pone al lado del
          bloque entero, que es donde hay sitio para que sea grande. */}
      <div className="grid max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 lg:gap-x-6">
        <h1 className="text-[1.9rem] font-black leading-[1.08] tracking-tight sm:text-4xl xl:text-5xl">
          Qué tenemos que saber hoy en casa.
        </h1>

        <DayIllustration
          period={tramo}
          className="col-start-2 row-start-1 h-20 w-20 flex-shrink-0 self-center sm:h-28 sm:w-28 lg:row-span-2 lg:h-40 lg:w-40"
        />

        <div className="col-span-2 lg:col-span-1 lg:col-start-1 lg:row-start-2">
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            <span className="font-bold text-ink">Farpi</span> es el espacio privado de tu familia:
            todos veis lo mismo sin tener que preguntar, y lo que hay que recordar deja de estar en
            la cabeza de uno solo.
          </p>

          <Garantias className="mt-5" />
        </div>
      </div>
    </div>
  </section>
  )
}
