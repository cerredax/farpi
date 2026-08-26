import { Home, Calendar, ClipboardList, CheckSquare, UtensilsCrossed, FolderOpen } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

interface Seccion {
  href: string
  label: string
  icon: typeof Home
  /**
   * Etiqueta corta para la barra de abajo, cuando la larga no cabe. Donde hay
   * sitio manda `label`.
   */
  abreviado?: string
}

/**
 * Las seis secciones de la app, en el orden en el que se navegan.
 *
 * Las comparten `BottomNav` (móvil) y `SideNav` (escritorio), que hasta ahora
 * tenían cada una su copia de la lista. Copiada ya había divergido: la misma
 * sección se llamaba "Docs" abajo y "Documentos" al lado, y nada decía si eso
 * estaba decidido o era un descuido.
 *
 * Estaba decidido —a 390 px la barra reparte seis etiquetas y "Documentos" no
 * entra— así que la diferencia se queda, pero dicha en voz alta con `abreviado`
 * en vez de escondida en una segunda copia.
 *
 * "Ajustes" no está en esta lista. En escritorio va aparte, al pie de la
 * columna; en móvil no está en la barra, sino al final de Inicio.
 */
export const SECCIONES: Seccion[] = [
  { href: ROUTES.home,     label: 'Inicio',     icon: Home },
  { href: ROUTES.calendar, label: 'Calendario', icon: Calendar },
  { href: ROUTES.lists,    label: 'Listas',     icon: CheckSquare },
  { href: ROUTES.tasks,    label: 'Tareas',     icon: ClipboardList },
  { href: ROUTES.meals,    label: 'Comidas',    icon: UtensilsCrossed },
  { href: ROUTES.docs,     label: 'Documentos', icon: FolderOpen, abreviado: 'Docs' },
]
