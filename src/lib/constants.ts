import type { DocCategory, DocMimeType, MealSlot, TaskPriority, TaskRecurrence } from '@/types'

// ─── Documentos ───────────────────────────────────────────────────────────────

export const DOC_CATEGORIES: { key: DocCategory; label: string; emoji: string }[] = [
  { key: 'salud',    label: 'Salud',    emoji: '🏥' },
  { key: 'colegio',  label: 'Colegio',  emoji: '🎒' },
  { key: 'personal', label: 'Personal', emoji: '👤' },
  { key: 'otros',    label: 'Otros',    emoji: '📄' },
]

export const VALID_MIME_TYPES: DocMimeType[] = ['application/pdf', 'image/jpeg', 'image/png']

export const MAX_DOC_SIZE = 20 * 1024 * 1024 // 20 MB

/**
 * Color que representa "toda la familia" (eventos y documentos sin hijo
 * asignado). Es un valor de datos, como los colores de los hijos: viaja en
 * atributos `style`, no en clases. Coincide a propósito con el token `sand`, y
 * hay que moverlo a mano cuando ese token cambie: si se queda con el amarillo
 * viejo dejan de ser el mismo color y nada avisa.
 */
export const FAMILY_COLOR = '#E9C46A'

/**
 * Colores de las personas de la familia, agrupados por a quién representan:
 * cinco para hombres adultos, tres para mujeres adultas, tres para niñas y tres
 * para niños. Catorce en total. El nombre no es decorativo: es la etiqueta
 * accesible de cada botón del selector, que antes leía el hexadecimal.
 *
 * **La separación entre grupos es la claridad, no el tono.** Los adultos caen en
 * L* 30-46 y los niños en L* 71-88, y la franja L* 52-62 se esquiva a propósito:
 * ahí ni el blanco ni la tinta llegan a 4,5:1 encima del color, así que no cabe
 * un grupo entero. Con esta paleta los ocho adultos llevan blanco encima (el
 * peor, 5,25:1) y los seis de niño llevan tinta (el peor, 6,92:1), que es lo que
 * elige `textColorOn` en `assignees.ts`.
 *
 * **Azul y Verde bosque rompen el resto a propósito.** Los doce restantes son
 * cálidos —tierras, rosas y ocres, que es como se ve una casa— pero con solo
 * tonos cálidos faltaba una expectativa de color que la gente da por hecha: quien
 * quiere "el azul" no lo encontraba. Los dos entran en el grupo de hombres, que
 * era el que menos variedad reconocible tenía, y respetan la banda de claridad de
 * los adultos, así que no cuestan contraste.
 *
 * A cambio, la separación perceptual entre los cálidos es la que es: la pareja
 * más cercana son Calabaza clara y Canela clara, a ΔE00 5,71 (ΔE76 15,8), las dos
 * de niño. Es menos margen que en versiones anteriores de esta paleta, y es un
 * compromiso aceptado: los valores vienen calculados desde fuera del código.
 *
 * Ninguno es el `FAMILY_COLOR` ni el verde de la app, que antes sí estaban en la
 * lista: se podía elegir a mano el color que significa "de toda la familia". Lo
 * que sí conviene saber es que Champán dorado queda a ΔE00 9,4 del amarillo de
 * familia y Coral claro a 8,3 de la terracota de marca. No compiten —un punto de
 * persona no se pone al lado de un botón— pero si algún día se ven juntos, ahí
 * está el roce.
 *
 * El orden es el de los grupos, que es como se eligen. Tiene una consecuencia:
 * `defaultMemberColor` reparte por posición cuando nadie ha elegido, así que a
 * los primeros adultos les tocan colores de hombre. Es un valor por defecto que
 * se cambia de un toque, y la app no sabe de géneros: no hay campo para eso.
 */
export const PERSON_COLORS: { value: string; label: string }[] = [
  // Hombres adultos
  { value: '#A8503A', label: 'Ladrillo' },
  { value: '#7E5522', label: 'Cuero' },
  { value: '#7A2E2E', label: 'Vino' },
  { value: '#4A6C8C', label: 'Azul' },
  { value: '#3D5C42', label: 'Verde bosque' },
  // Mujeres adultas
  { value: '#A8496A', label: 'Rosa fuerte' },
  { value: '#8A3D4A', label: 'Granate' },
  { value: '#8A661F', label: 'Mostaza oscura' },
  // Niñas
  { value: '#F7B8CE', label: 'Rosa chicle' },
  { value: '#FFAFA0', label: 'Coral claro' },
  { value: '#F5D9A8', label: 'Champán dorado' },
  // Niños
  { value: '#F9BE94', label: 'Melocotón' },
  { value: '#F2A65A', label: 'Calabaza clara' },
  { value: '#D9A46C', label: 'Canela clara' },
]

// ─── Comidas ──────────────────────────────────────────────────────────────────

export const MEAL_SLOTS: { key: MealSlot; label: string; emoji: string; order: number }[] = [
  { key: 'breakfast', label: 'Desayuno', emoji: '☀️',  order: 0 },
  { key: 'lunch',     label: 'Comida',   emoji: '🍽️', order: 1 },
  { key: 'snack',     label: 'Merienda', emoji: '🍎',  order: 2 },
  { key: 'dinner',    label: 'Cena',     emoji: '🌙',  order: 3 },
]

/** Acceso por clave a la franja horaria, para no recorrer `MEAL_SLOTS` en cada render. */
export const MEAL_SLOT_META = Object.fromEntries(
  MEAL_SLOTS.map(s => [s.key, { label: s.label, emoji: s.emoji, order: s.order }])
) as Record<MealSlot, { label: string; emoji: string; order: number }>

// ─── Tareas ───────────────────────────────────────────────────────────────────

export const TASK_RECURRENCES: { value: TaskRecurrence; label: string; shortLabel: string }[] = [
  { value: 'none',    label: 'No se repite', shortLabel: '' },
  { value: 'daily',   label: 'Diaria',       shortLabel: 'Diaria' },
  { value: 'weekly',  label: 'Semanal',      shortLabel: 'Semanal' },
  { value: 'monthly', label: 'Mensual',      shortLabel: 'Mensual' },
]

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'high',   label: 'Alta',  color: '#D96C6C' },
  { value: 'medium', label: 'Media', color: '#E9C46A' },
  { value: 'low',    label: 'Baja',  color: '#8BA888' },
]

/**
 * A partir de esta cantidad de ítems aparece el buscador. Lo comparten el de
 * una lista y el que cruza todas. Empezó en 6 y bajó a 3: con seis costaba
 * encontrarlo, y esconder una herramienta hasta que hace falta solo funciona si
 * el usuario sabe que existe.
 */
export const MINIMO_PARA_BUSCAR = 3

/**
 * A partir de cuántas tareas en un mismo día el calendario las pliega bajo una
 * línea de resumen. Lo vencido se arrastra al día de hoy, así que hoy acumula
 * todo lo que se quedó atrás: seis tareas hacían la fila de hoy seis veces más
 * alta que las demás, con seis triángulos rojos seguidos, y el calendario abría
 * enseñando la lista de tareas en vez de los planes.
 *
 * Plegar no es esconder —el resumen dice cuántas hay y cuántas van tarde, y se
 * abre de un toque—, que es lo que pide "desaparecer no es lo que le pasa a una
 * tarea sin hacer". Tres y no dos: con dos se plegaba un día perfectamente
 * legible y costaba más de lo que ahorraba.
 */
export const TAREAS_PARA_PLEGAR = 3

// ─── Agenda por horas ─────────────────────────────────────────────────────────

/**
 * Cuánto dura, a efectos de dibujo, un evento sin hora de fin. El formulario la
 * acepta vacía a propósito ("sin hora de fin es válido"), pero un bloque sin
 * duración no se puede pintar. 45 minutos da una caja que se lee y que no
 * exagera lo que ocupa una cita corta.
 */
export const DURACION_SIN_HORA_FIN = 45

/**
 * Alto mínimo del eje de horas, en horas. El día de una familia tiene dos o
 * tres citas, así que el eje se recorta a las horas que tienen algo: pintar de
 * 00:00 a 24:00 era casi todo blanco. Por debajo de seis horas deja de parecer
 * un día y parece un recorte, de ahí el suelo.
 */
export const HORAS_MINIMAS_AGENDA = 6

/**
 * Cuántos platos ya cocinados se ofrecen al planificar una comida. Muy por
 * encima de las 5 sugerencias sueltas del resto de formularios: aquí el bloque
 * hace de catálogo buscable —se teclea y se filtra— y el menú de una familia
 * gira sobre bastantes más de cinco platos.
 */
export const PLATOS_SUGERIDOS = 30

/**
 * Con cuántos días de antelación se avisa de que un documento caduca. Un mes da
 * margen para pedir cita y renovar sin correr; menos, y el aviso llega tarde
 * para lo que más tarda (DNI, pasaporte).
 *
 * Lo comparten la tarjeta del documento y el recordatorio diario del cron, para
 * que "caduca pronto" signifique lo mismo en la pantalla y en el aviso.
 */
export const DIAS_AVISO_CADUCIDAD = 30

// ─── Rutas ────────────────────────────────────────────────────────────────────

export const ROUTES = {
  home:     '/home',
  calendar: '/calendar',
  tasks:    '/tasks',
  lists:    '/lists',
  meals:    '/meals',
  docs:     '/docs',
  settings: '/settings',
} as const
