import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * El enlace del pie de una sección de Inicio: "Ver calendario", "Ver todas las
 * tareas". Los márgenes negativos con relleno son para que el objetivo táctil
 * llegue al mínimo sin que el texto se despegue del borde de la tarjeta.
 *
 * Vive aquí porque estaba escrito cinco veces con las mismas clases y una de
 * las cinco se había quedado atrás en el color (`text-primary-strong` en vez de
 * `text-primary`). Cinco copias son justo las que hacen falta para que una se
 * desvíe sin que nadie lo note.
 *
 * Y la que se había desviado era la que tenía razón: desde el 08-09-2026 todas
 * van en `primary-strong`. El verde de marca sobre blanco da 2,6:1, muy por
 * debajo del 4,5:1 que pide WCAG AA para texto normal —y esto es texto de 12 px,
 * el más pequeño de la pantalla—, así que el único sitio de la tarjeta donde se
 * puede pulsar era el que menos se veía. `primary-strong` sube a 4,8:1.
 *
 * El chevron no es decoración: en una tarjeta sin bordes ni fondo propio, un
 * texto suelto al pie no se distingue de un rótulo. La flecha dice que lleva a
 * algún sitio sin gastar una palabra más, y va fuera del subrayado del hover
 * para que la línea sea del texto y no del icono.
 */
export function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-0.5 -mx-1 rounded-lg px-1 py-1.5 text-xs font-semibold text-primary-strong"
    >
      <span className="group-hover:underline">{children}</span>
      <ChevronRight size={14} strokeWidth={2.6} aria-hidden />
    </Link>
  )
}
