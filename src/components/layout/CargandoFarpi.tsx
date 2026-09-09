/**
 * Lo que se ve mientras Farpi arranca.
 *
 * Era un texto centrado en una pantalla vacía —"Cargando Farpi / Preparando los
 * datos de la familia…"— y detrás de él se estaban resolviendo **diecinueve
 * consultas** (los `cargadores` de `store-context`). En modo demo eso no se ve;
 * con Supabase y un móvil en la calle son varios segundos de pantalla en blanco
 * con una frase, que es la forma que tiene una app de parecer que se ha colgado.
 *
 * Ahora sale la app apagada: la barra de arriba donde va a estar, la tarjeta del
 * día donde va a estar y la barra de abajo donde va a estar. No promete ningún
 * dato —son cajas grises, no números inventados— pero sí promete **la forma**,
 * que es lo que hace que la espera se lea como una carga y no como un error.
 *
 * No toca el store ni la sesión a propósito: es la pantalla que se pinta
 * **antes** de que exista cualquiera de las dos, así que no puede depender de
 * ellas. De ahí que repita las medidas del armazón (`h-14` arriba, `h-16`
 * abajo) en vez de reutilizar `TopBar` y `BottomNav`.
 */
function Caja({ className }: { className: string }) {
  return <div className={`rounded-2xl bg-surface ${className}`} aria-hidden />
}

export function CargandoFarpi() {
  return (
    // `aria-busy` y un texto para quien no ve las cajas: un esqueleto no dice
    // nada por sí solo, y sin esto un lector de pantalla anunciaría una página
    // vacía.
    <div className="flex min-h-dvh flex-col bg-canvas" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando Farpi</span>

      {/* La barra de arriba, con el hueco del nombre de la pantalla. */}
      <div className="flex h-14 flex-shrink-0 items-center border-b border-line px-4 lg:px-8">
        <div className="h-4 w-24 rounded-full bg-primary-line" aria-hidden />
      </div>

      {/* `animate-pulse` en el contenido y no en las barras: lo que late es lo
          que está por llegar. Y apagado con `motion-reduce`, que es una pantalla
          que puede quedarse un rato. */}
      <div className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 py-6 motion-safe:animate-pulse lg:max-w-5xl lg:px-6">
        <Caja className="h-44 rounded-[2rem] lg:h-52" />
        <div className="space-y-3">
          <Caja className="h-3 w-32 rounded-full" />
          <Caja className="h-24" />
        </div>
        <div className="space-y-3">
          <Caja className="h-3 w-40 rounded-full" />
          <Caja className="h-24" />
        </div>
      </div>

      {/* La de abajo, con sus seis pastillas. */}
      <div className="flex h-16 flex-shrink-0 items-center justify-around border-t border-line px-2 lg:hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5" aria-hidden>
            <div className="h-5 w-5 rounded-lg bg-surface" />
            <div className="h-1.5 w-8 rounded-full bg-surface" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Cuando la carga no sale bien. Sigue siendo un texto y no un esqueleto: un
 * error tiene que leerse como un error, no como algo que todavía está llegando.
 */
export function ErrorDeArranque({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-sm" role="alert">
        <p className="text-lg font-extrabold text-ink">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  )
}
