import { Home, Calendar, ClipboardList, CheckSquare, UtensilsCrossed, FolderOpen } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

interface Seccion {
  href: string
  label: string
  icon: typeof Home
}

/**
 * Las seis secciones de la app, en el orden en el que se navegan.
 *
 * Esta lista es la de **escritorio** (`SideNav`), que las enseña las seis. En
 * móvil se navega con `SECCIONES_MOVIL`, que son cinco y dejan el sexto hueco
 * para "Más".
 *
 * Fue una sola lista compartida por las dos barras hasta el 28-08-2026, y antes
 * de eso dos copias que ya habían divergido —"Docs" abajo, "Documentos" al
 * lado—. Sigue siendo una: la de móvil se **deriva** de esta, no se escribe
 * aparte, para que añadir una sección no obligue a acordarse de dos sitios.
 *
 * "Ajustes" no está en la lista. En escritorio va aparte, al pie de la columna;
 * en móvil, dentro de "Más".
 */
export const SECCIONES: Seccion[] = [
  { href: ROUTES.home,     label: 'Inicio',     icon: Home },
  { href: ROUTES.calendar, label: 'Calendario', icon: Calendar },
  { href: ROUTES.lists,    label: 'Listas',     icon: CheckSquare },
  { href: ROUTES.tasks,    label: 'Tareas',     icon: ClipboardList },
  { href: ROUTES.meals,    label: 'Comidas',    icon: UtensilsCrossed },
  { href: ROUTES.docs,     label: 'Documentos', icon: FolderOpen },
]

/**
 * Lo que enseña la barra de abajo: las mismas menos Documentos, porque el sexto
 * sitio es de "Más" (28-08-2026).
 *
 * Documentos es la sección a la que menos se entra —el DNI y el libro de familia
 * se miran dos veces al año— y era además la única cuya etiqueta no cabía a
 * 390 px: se escribía "Docs" abajo y "Documentos" al lado. Ahora está dentro de
 * "Más", con su nombre entero y en las dos pantallas igual.
 */
export const SECCIONES_MOVIL: Seccion[] = SECCIONES.filter(s => s.href !== ROUTES.docs)
