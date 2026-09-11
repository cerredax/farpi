import type { DocCategory, DocMimeType, MealSlot, QuoteStatus, TaskPriority, TaskRecurrence } from '@/types'

// ─── Documentos ───────────────────────────────────────────────────────────────

/**
 * Las carpetas del cajón de los papeles, en el orden en que se enseñan.
 *
 * `personal` es **identidad**: DNI, pasaporte, libro de familia, títulos. Lo que
 * antes caía ahí por descarte —el seguro del coche, la factura de la lavadora—
 * tiene ahora su sitio, y por eso la lista es larga: el filtro solo sirve si
 * cada papel de una casa cabe en una carpeta que no sea «Otros».
 *
 * **El icono es un emoji, como en el resto de la app.** Una lista, una nota y
 * una partida se reconocen por el suyo; Documentos era la única sección que
 * identificaba con iconos de línea de `lucide`, y no por una razón de producto:
 * el argumento era que el chip medía 10 px y a ese tamaño un emoji de color es
 * una mancha. Eso justificaba aquel chip, no la sección entera, y a cambio dejó
 * once carpetas dibujadas en un idioma que no se habla en ninguna otra pantalla.
 *
 * Los emoji se eligen del mismo vocabulario que ya usan los sheets de listas,
 * notas y partidas (🏥, 🎒, 🏠, 🚗, 🐾, ✈️, 🧾), y ninguno es posterior a
 * Unicode 7: en un catálogo fijo, un emoji nuevo no es un icono raro que alguien
 * eligió, es un cuadrado vacío para toda la familia que tenga el móvil viejo.
 * Por eso `personal` no lleva 🪪, que es más literal y es de Unicode 14.
 *
 * Y el que lleva es 👤 y no 🆔 porque el juego tiene que **caber en la paleta**:
 * el 🆔 se dibuja como un bloque violeta macizo, el único color saturado de los
 * once, y en una pantalla de salvia y arena se veía antes que el nombre del
 * documento. 👤 es gris, va con la palabra y dice lo que es la carpeta: los
 * papeles de una persona.
 *
 * Aquí sí caben, al contrario que los de `lucide`: son texto, y este archivo lo
 * importa también el servidor.
 */
export const DOC_CATEGORIES: { key: DocCategory; label: string; emoji: string }[] = [
  { key: 'salud',    label: 'Salud',    emoji: '🏥' },
  { key: 'colegio',  label: 'Colegio',  emoji: '🎒' },
  { key: 'personal', label: 'Personal', emoji: '👤' },
  { key: 'vivienda', label: 'Vivienda', emoji: '🏠' },
  { key: 'vehiculo', label: 'Vehículo', emoji: '🚗' },
  { key: 'seguros',  label: 'Seguros',  emoji: '🛡️' },
  { key: 'finanzas', label: 'Finanzas', emoji: '💶' },
  { key: 'facturas', label: 'Facturas', emoji: '🧾' },
  { key: 'mascotas', label: 'Mascotas', emoji: '🐾' },
  { key: 'viajes',   label: 'Viajes',   emoji: '✈️' },
  { key: 'otros',    label: 'Otros',    emoji: '📄' },
]

/**
 * La misma lista indexada por clave, para pintar una categoría suelta sin
 * recorrer las once. La usan la tarjeta del listado y la pastilla.
 */
export const DOC_CATEGORY: Record<DocCategory, { label: string; emoji: string }> =
  Object.fromEntries(
    DOC_CATEGORIES.map(({ key, label, emoji }) => [key, { label, emoji }])
  ) as Record<DocCategory, { label: string; emoji: string }>

export const VALID_MIME_TYPES: DocMimeType[] = ['application/pdf', 'image/jpeg', 'image/png']

/**
 * La extensión que le toca a cada tipo, para nombrar el archivo cuando se sirve.
 *
 * Existe porque en la base no se guarda el nombre del archivo original —solo el
 * nombre del documento, que lo pone la familia— y sin extensión, «guardar como»
 * deja en el móvil un archivo que ningún visor sabe abrir. El tipo sí lo sabemos,
 * y lo dice el proveedor al subir, no el navegador.
 */
export const EXTENSION_POR_MIME: Record<DocMimeType, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

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
 * Color de un cumpleaños de fuera de casa (`kind = 'cumple'`).
 *
 * Tiene el suyo porque **no es de nadie**: la abuela o el amigo del cole no
 * están en la familia, así que ni les toca un color de persona —eso significa
 * "esto lo lleva tal" en toda la app— ni el amarillo de `FAMILY_COLOR`, que
 * diría que es algo de la casa entera cuando es de alguien de fuera. Sin este
 * color salían en amarillo, indistinguibles de la cena de los abuelos.
 *
 * El lila no está en `PERSON_COLORS` ni lo puede elegir nadie, así que un
 * cumpleaños nunca se confunde con una persona. El más cercano de la paleta es
 * Ciruela, mucho más oscuro. Como el de la familia, viaja en `style` y no en
 * clases.
 */
export const CUMPLE_COLOR = '#A88BC4'

/**
 * Colores de las personas de la familia, en dos grupos por **claridad**: ocho de
 * adulto en L* 30-45 y seis de niño en L* 71-88. El nombre no es decorativo: es
 * la etiqueta accesible de cada botón del selector, que antes leía el
 * hexadecimal.
 *
 * La franja L* 52-62 se esquiva a propósito: ahí ni el blanco ni la tinta llegan
 * a 4,5:1 encima del color, así que no cabe un grupo entero. De la separación
 * sale el reparto de texto que hace `textColorOn` en `assignees.ts`: los ocho de
 * adulto llevan blanco (el peor, Ladrillo, 5,42:1) y los seis de niño llevan
 * tinta (el peor, Canela clara, 6,92:1).
 *
 * **Los adultos ya no se reparten por género** (24-08-2026). Eran "cinco de
 * hombre" y "tres de mujer", y esa división obligaba a elegir tonos para cumplir
 * la cuota en vez de por cómo se distinguen. La app no sabe de géneros —no hay
 * campo para eso— así que la paleta tampoco. Los ocho son sobrios y se ofrecen
 * igual a cualquiera.
 *
 * Salieron con ese cambio Rosa fuerte y **Mostaza oscura**, que era la que se
 * confundía con el amarillo de "toda la familia"; entraron Pizarra y Ciruela.
 * Ahora el adulto más cercano a ese amarillo es Cuero, a ΔE00 37. Ninguno es el
 * `FAMILY_COLOR` ni el verde de la app, que antes sí estaban en la lista: se
 * podía elegir a mano el color que significa "de toda la familia".
 *
 * Lo que cuesta, medido: de las noventa y una parejas, once quedan por debajo de
 * ΔE00 15 (eran doce). La más cercana sigue siendo Calabaza clara con Canela
 * clara, a 5,71, las dos de niño; entre adultos, Azul con Pizarra a 7,40 y Vino
 * con Granate a 7,71, que son los dos roces que trae esta paleta.
 *
 * El orden es el de los grupos, que es como se eligen. Tiene una consecuencia:
 * `defaultMemberColor` reparte por posición cuando nadie ha elegido, así que a
 * los primeros adultos les tocan los tonos oscuros. Es un valor por defecto que
 * se cambia de un toque.
 *
 * Quitar un color de aquí **no toca lo guardado**: `memberColor` devuelve el que
 * la persona tenga, sea de la lista o no, y `ColorPicker` simplemente no lo marca
 * como elegido. Ya pasa hoy con el `#FBC4DC` de Cris en los datos de demo.
 */
export const PERSON_COLORS: { value: string; label: string }[] = [
  // Adultos
  { value: '#A8503A', label: 'Ladrillo' },
  { value: '#7E5522', label: 'Cuero' },
  { value: '#7A2E2E', label: 'Vino' },
  { value: '#4A6C8C', label: 'Azul' },
  { value: '#3D5C42', label: 'Verde bosque' },
  { value: '#8A3D4A', label: 'Granate' },
  { value: '#536270', label: 'Pizarra' },
  { value: '#6B3F6D', label: 'Ciruela' },
  // Hijos
  { value: '#F7B8CE', label: 'Rosa chicle' },
  { value: '#FFAFA0', label: 'Coral claro' },
  { value: '#F5D9A8', label: 'Champán dorado' },
  { value: '#F9BE94', label: 'Melocotón' },
  { value: '#F2A65A', label: 'Calabaza clara' },
  { value: '#D9A46C', label: 'Canela clara' },
]

// ─── Comidas ──────────────────────────────────────────────────────────────────

export const MEAL_SLOTS: { key: MealSlot; label: string; emoji: string; order: number }[] = [
  { key: 'breakfast', label: 'Desayuno', emoji: '☀️',  order: 0 },
  { key: 'lunch',     label: 'Comida',   emoji: '🍽️', order: 1 },
  { key: 'school',    label: 'Comedor',  emoji: '🎒',  order: 2 },
  { key: 'snack',     label: 'Merienda', emoji: '🍎',  order: 3 },
  { key: 'dinner',    label: 'Cena',     emoji: '🌙',  order: 4 },
]

/**
 * Las franjas que se apuntan por platos —primero, segundo y postre— y no con un
 * plato solo. El comedor siempre viene así, y la comida de casa muchas veces
 * también; un desayuno o una merienda, nunca, y ahí los campos extra serían dos
 * huecos que la app pide llenar todos los días.
 */
export const MEAL_SLOTS_CON_PLATOS: MealSlot[] = ['lunch', 'school']

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

/**
 * El orden manda dos veces: es el de los botones del sheet y el peso con el que
 * `selectors.ts` ordena las tareas a igual fecha.
 *
 * **Sin color desde el 27-08-2026.** Cada prioridad tenía su hex y solo se
 * usaba para pintar tres círculos en el sheet de la tarea, justo debajo de los
 * círculos de "Asignar a": el mismo control, dos filas seguidas, dos
 * significados. Y el de "Media" era `#E9C46A`, el `FAMILY_COLOR` exacto (ΔE00
 * 0), con Champán dorado a 9,4 y Canela clara a 12,1 por detrás, los dos por
 * debajo del umbral 15 que se le exige a `PERSON_COLORS`.
 *
 * No se cambiaron los tonos porque el problema no era el tono: en Farpi el color
 * dice **de quién es algo**, y la prioridad es un grado, no una identidad. En la
 * lista sigue habiendo señal de color, pero como banda al borde de la tarjeta
 * (`PRIORITY_BORDER` en `TaskItem`), que no se confunde con un punto con nombre.
 */
export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'high',   label: 'Alta'  },
  { value: 'medium', label: 'Media' },
  { value: 'low',    label: 'Baja'  },
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

/**
 * Cuántas unidades como mucho de un ítem de la lista. Lo mismo que el `check` de
 * la migración 021: sin tope, un dedo apoyado en el botón de más deja un número
 * absurdo que la fila tiene que pintar. Noventa y nueve sobra para una casa.
 */
export const MAX_UNIDADES = 99

/**
 * Cuánto aguanta armada la confirmación de borrar una fila —un ítem de la lista,
 * una tarea— antes de volverse a desarmar sola. En un sheet no hace falta, que
 * al cerrarlo se lleva el estado; una fila se queda ahí. Cuatro segundos son los
 * que se tarda en leer «Borrar» y decidir, y poco para que a nadie se le olvide
 * que lo dejó pulsado.
 */
export const MS_CONFIRMAR_BORRADO = 4000

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

/**
 * Cuánto vale una invitación a la familia.
 *
 * **Este número está también en la base**, dentro de `accept_family_invite`
 * (`interval '30 days'`), y ahí es donde manda: quien deja entrar es la RPC, no
 * la pantalla. Aquí está para que Ajustes pueda decir «caducada» en vez de
 * seguir diciendo «pendiente» de algo que ya no vale, y no puede ser de otra
 * forma —una función de Postgres no se importa desde TypeScript—. Si cambia uno,
 * cambia el otro; el que engaña es este, porque el que decide es aquel.
 *
 * Treinta días porque el caso real es alguien que tarda en mirar el correo o en
 * crearse la cuenta, y eso se resuelve en días.
 */
export const DIAS_VALIDEZ_INVITACION = 30

/**
 * Con cuánta antelación asoma un cumpleaños en Inicio. Dos semanas: lo justo
 * para comprar un regalo o cuadrar una comida, y poco para que el bloque no se
 * quede fijo en la pantalla todo el mes diciendo lo mismo.
 *
 * El aviso de las siete no usa esta ventana: ahí solo se felicita el mismo día.
 * Un "faltan once días" a las siete de la mañana no es algo que haya que saber
 * hoy en casa.
 */
export const DIAS_AVISO_CUMPLE = 14

/**
 * Cuánto abarca la pantalla de Cumpleaños: los doce meses que vienen.
 *
 * Un año **menos un día** a propósito. Los de fuera de casa son eventos, una
 * fila por año, así que con 365 quien cumple hoy saldría dos veces: hoy y
 * dentro de un año. Con 364 no se pierde ninguno —el próximo cumpleaños de
 * cualquiera cae siempre a 365 días o menos, y el de quien cumple hoy está a
 * cero— y la lista no repite a nadie.
 */
export const DIAS_LISTA_CUMPLES = 364

/**
 * Cuántos años por delante se apunta un cumpleaños de fuera de casa.
 *
 * La serie anual se materializa —una fila por año, como los festivos—, así que
 * hay que elegir un final. Veinte filas por persona no las nota nadie, y
 * preguntar "¿hasta qué año?" al apuntar el cumpleaños de la abuela es la clase
 * de trabajo administrativo que esta app existe para no pedir.
 */
export const ANOS_DE_CUMPLE = 20

// ─── Finanzas ────────────────────────────────────────────────────────────────

/**
 * En qué anda cada presupuesto pedido, con el nombre que se lee en la pantalla.
 * El orden es el del ciclo: se pide, y luego se acepta o se descarta.
 */
export const QUOTE_STATUSES: { value: QuoteStatus; label: string; corto: string }[] = [
  { value: 'pedido',     label: 'Pedido',     corto: 'Decidiendo' },
  { value: 'aceptado',   label: 'Aceptado',   corto: 'Aceptado' },
  { value: 'descartado', label: 'Descartado', corto: 'Descartado' },
]

// ─── Rutas ────────────────────────────────────────────────────────────────────

export const ROUTES = {
  home:     '/home',
  calendar: '/calendar',
  tasks:    '/tasks',
  lists:    '/lists',
  meals:    '/meals',
  finanzas: '/finanzas',
  notes:    '/notes',
  docs:     '/docs',
  cumples:  '/cumples',
  settings: '/settings',
} as const
