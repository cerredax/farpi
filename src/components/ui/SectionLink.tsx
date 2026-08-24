import Link from 'next/link'

/**
 * El enlace del pie de una sección de Inicio: "Ver calendario", "Ver todas las
 * tareas". Los márgenes negativos con relleno son para que el objetivo táctil
 * llegue al mínimo sin que el texto se despegue del borde de la tarjeta.
 *
 * Vive aquí porque estaba escrito cinco veces con las mismas clases y una de
 * las cinco se había quedado atrás en el color (`text-primary-strong` en vez de
 * `text-primary`). Cinco copias son justo las que hacen falta para que una se
 * desvíe sin que nadie lo note.
 */
export function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-block -mx-1 rounded-lg px-1 py-1.5 text-xs font-semibold text-primary hover:underline"
    >
      {children}
    </Link>
  )
}
