/**
 * Tareas: la pantalla, la tarjeta de cada tarea, su sheet y la confirmación de
 * marcarla fuera de día.
 *
 * Los nombres de la recurrencia y de la prioridad no están aquí: son de
 * `comun.recurrencias` y `comun.prioridades`, que ya viajan por la clave del dato.
 */
export const tareas = {
  resumen: (n: number) => `${n} tarea${n !== 1 ? 's' : ''} de la familia`,
  buscarEn: (n: number) => `Buscar en ${n} tareas…`,
  buscar: 'Buscar tareas',
  nuevaTarea: 'Nueva tarea',
  filtrarPorPersona: 'Filtrar por persona',
  todas: 'Todas',
  mias: 'Mías',
  pendientes: 'Pendientes',
  completadas: 'Completadas',
  sinCoincidencias: 'Sin coincidencias',
  ningunaPendienteCon: (busqueda: string) => `Ninguna tarea pendiente con «${busqueda}»`,
  sinTareas: 'Sin tareas todavía',
  todoAlDia: 'Todo al día',

  tarjeta: {
    hoy: 'Hoy',
    /** El vencimiento de una tarea que no es de hoy: "15 ago". */
    formatoVencimiento: 'd MMM',
    marcarPendiente: 'Marcar como pendiente',
    marcarCompletada: 'Marcar como completada',
    hechaPor: (nombre: string) => `Hecha por ${nombre}`,
    eliminar: 'Eliminar',
    borrar: 'Borrar',
    eliminarLaTarea: (titulo: string) => `Eliminar la tarea ${titulo}`,
    confirmarEliminar: (titulo: string) => `Confirmar que se elimina la tarea ${titulo}`,
  },

  sheet: {
    nueva: 'Nueva tarea',
    editar: 'Editar tarea',
    crear: 'Crear tarea',
    guardarCambios: 'Guardar cambios',
    guardando: 'Guardando…',
    eliminar: 'Eliminar tarea',
    confirmarEliminacion: 'Confirmar eliminación',
    tarea: 'Tarea',
    tareaEjemplo: '¿Qué hay que hacer?',
    empiezaEl: 'Empieza el',
    vencimiento: 'Vencimiento',
    prioridad: 'Prioridad',
    repeticion: 'Repetición',
    terminaEl: 'Termina el',
    opcional: '(opcional)',
    notas: 'Notas',
    notasEjemplo: 'Detalles opcionales…',
  },

  /** Marcar hecha una tarea cuyo vencimiento no es hoy. */
  fueraDeDia: {
    titulo: 'Confirmar tarea',
    /** La fecha dentro de la frase: "15 de agosto". */
    formatoFecha: "d 'de' MMMM",
    siMarcar: 'Sí, marcar como hecha',
    cancelar: 'Cancelar',
    /**
     * Las frases van partidas por lo que sale en negrita. La de una tarea que se
     * repite lleva dos —la recurrencia y la fecha—, así que va en tres trozos:
     * antes de la primera, entre las dos y lo que cierra.
     */
    repiteAntes: 'Esta tarea es ',
    repiteEnMedio: ' y toca el ',
    repiteDespues: '.',
    /** La de una sola vez, partida por la fecha. */
    esParaAntes: 'Esta tarea es para el ',
    esParaDespues: ', no para hoy.',
    pregunta: '¿Marcarla como hecha hoy igualmente?',
  },
}
