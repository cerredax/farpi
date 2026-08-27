import { Children, isValidElement } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { normalizaParaBuscar, recortaGuiones } from '@/lib/text'

/**
 * El ancla de una sección, sacada de su propio título: "Ley aplicable" pasa a
 * ser `ley-aplicable`. Se apoya en `normalizaParaBuscar`, que ya quita tildes y
 * baja a minúsculas, para no tener dos formas distintas de normalizar texto en
 * el repositorio.
 */
export function legalSectionId(heading: string): string {
  return recortaGuiones(normalizaParaBuscar(heading).replace(/[^a-z0-9]+/g, '-'))
}

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  // El índice se saca de los hijos en vez de pedirlo por props: así las dos
  // páginas legales no tienen que repetir su propia lista de secciones, que es
  // justo la clase de dato que se queda desactualizado al añadir una.
  const secciones = Children.toArray(children)
    .filter((hijo): hijo is React.ReactElement<{ heading: string }> =>
      isValidElement(hijo) && hijo.type === LegalSection)
    .map(hijo => hijo.props.heading)

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto max-w-2xl px-5 py-8">
        {/* Estas dos páginas se ven sin sesión (van en `PUBLIC_ROUTES`), así que
            quien llegue desde la ficha de Play Store acabará en el login, no en
            la home. El enlace dice "Volver a Nido" y no "Volver al inicio"
            porque es verdad en los dos casos. */}
        <Link href="/home" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
          <ArrowLeft size={16} strokeWidth={2.3} /> Volver a Nido
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold text-ink">{title}</h1>
        <p className="mt-1 text-xs text-muted">Última actualización: {updated}</p>

        {secciones.length > 0 && (
          <nav aria-label="Secciones de esta página" className="mt-5 rounded-2xl border border-line bg-white px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">En esta página</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {secciones.map(heading => (
                <li key={heading}>
                  <a
                    href={`#${legalSectionId(heading)}`}
                    className="text-sm font-semibold text-primary-strong transition-colors hover:text-primary-deep hover:underline"
                  >
                    {heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted">{children}</div>
      </div>
    </div>
  )
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  // La línea separa una sección de la anterior, así que la primera no la lleva.
  // `first-of-type` se refiere a la primera `<section>` entre sus hermanos: el
  // párrafo de entrada es un `<p>`, así que no cuenta y la cuenta sale bien.
  return (
    <section
      id={legalSectionId(heading)}
      className="space-y-2 scroll-mt-6 border-t border-line pt-5 first-of-type:border-t-0 first-of-type:pt-0"
    >
      <h2 className="text-base font-bold text-ink">{heading}</h2>
      {children}
    </section>
  )
}
