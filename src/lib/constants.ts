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
 * atributos `style`, no en clases. Coincide a propósito con el token `sand`.
 */
export const FAMILY_COLOR = '#E9C46A'

/**
 * Colores de las personas de la familia, adultos e hijos. El nombre no es
 * decorativo: es la etiqueta accesible de cada botón del selector, que antes
 * leía el hexadecimal.
 *
 * Ocho, y de claridad escalonada a propósito. Antes eran doce pasteles y no
 * servían para lo único que tienen que hacer, que es decir de quién es cada
 * cosa: había dieciséis parejas por debajo de ΔE 20 (CIEDE2000) y la peor
 * —lavanda y lila— estaba en 5,3, cuando el umbral de "se nota la diferencia"
 * es 2. Ahora la peor pareja está en 18,4.
 *
 * La claridad varía por necesidad, no por gusto. Con daltonismo rojo-verde el
 * tono se pierde y solo queda la claridad: ocho tonos repartidos por el círculo
 * pero todos igual de claros dan ΔE 4 para quien lo tiene. Escalonados, 9,7.
 *
 * Y los ocho llegan a 4,5:1 con el color de texto que les toca, que lo elige
 * `textColorOn` en `assignees.ts`. El teja es un poco más oscuro de lo que pedía
 * el ojo justo por eso: al primer valor le faltaban tres décimas de contraste.
 *
 * El orden tampoco es casual. `defaultMemberColor` reparte por posición, así
 * que los dos primeros son los dos adultos de una familia normal: van a 42,9 de
 * distancia, y no hay dos consecutivos por debajo de 27.
 *
 * Ya no están ni el mostaza ni el verde salvia, que eran exactamente
 * `FAMILY_COLOR` y `--color-primary`: se podía elegir a mano el color que
 * significa "de toda la familia" o el verde de la app.
 */
export const PERSON_COLORS: { value: string; label: string }[] = [
  { value: '#8A5A18', label: 'Ocre' },
  { value: '#9585C8', label: 'Lavanda' },
  { value: '#3C6B33', label: 'Verde bosque' },
  { value: '#B85940', label: 'Teja' },
  { value: '#4E9E8C', label: 'Verde agua' },
  { value: '#D06E8A', label: 'Frambuesa' },
  { value: '#3A6E9E', label: 'Azul' },
  { value: '#8E4A7A', label: 'Ciruela' },
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
