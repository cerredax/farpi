import { Home, Calendar, ClipboardList, CheckSquare, UtensilsCrossed, FolderOpen, StickyNote, Wallet } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

interface Seccion {
  href: string
  label: string
  icon: typeof Home
  /**
   * En móvil no cabe en la barra de abajo y vive dentro de "Más".
   *
   * Era un filtro escrito a mano (`s.href !== ROUTES.docs`) hasta que Notas se
   * puso al lado de Documentos, el 31-08-2026: con dos secciones ahí, la lista
   * de "Más" y el filtro de la barra decían lo mismo desde dos archivos y se
   * podían contradecir. Ahora lo dice la sección, y las dos barras lo leen. Con
   * Finanzas, el mismo día, ya son tres y el filtro a mano habría sido insostenible.
   */
  enMas?: boolean
}

/**
 * Las secciones de la app, en el orden en el que se navegan.
 *
 * Esta lista es la de **escritorio** (`SideNav`), que las enseña todas. En móvil
 * la barra de abajo enseña `SECCIONES_MOVIL` —las que no están marcadas
 * `enMas`— y el resto salen en el menú de "Más".
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
  { href: ROUTES.finanzas, label: 'Finanzas',   icon: Wallet, enMas: true },
  { href: ROUTES.notes,    label: 'Notas',      icon: StickyNote, enMas: true },
  { href: ROUTES.docs,     label: 'Documentos', icon: FolderOpen, enMas: true },
]

/**
 * Lo que enseña la barra de abajo: las cinco de siempre, porque el sexto sitio
 * es de "Más" (28-08-2026).
 *
 * Documentos fue la primera en bajar ahí: es la sección a la que menos se entra
 * —el DNI y el libro de familia se miran dos veces al año— y era además la única
 * cuya etiqueta no cabía a 390 px, así que se escribía "Docs" abajo y
 * "Documentos" al lado. Notas y Finanzas se le unen el 31-08-2026 por lo mismo: la
 * clave del wifi se consulta cuando viene alguien y el gasto del mes se mira una
 * vez por semana, no todos los días, y no hay un sexto hueco que darles sin
 * quitárselo a algo que sí se usa a diario.
 */
export const SECCIONES_MOVIL: Seccion[] = SECCIONES.filter(s => !s.enMas)

/** Las que viven dentro de "Más", en el mismo orden que arriba. */
export const SECCIONES_EN_MAS: Seccion[] = SECCIONES.filter(s => s.enMas)
