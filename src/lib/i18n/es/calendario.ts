/** El calendario: la cabecera, el mes, la agenda, el eje de horas, los bloques de debajo del mes y el sheet de un evento. */
export const calendario = {
  vistas: {
    agenda: 'Agenda',
    dia: 'Día',
    semana: 'Semana',
    mes: 'Mes',
  },

  /**
   * Los patrones de fecha de `date-fns`. El orden y las palabras de una fecha
   * también son del idioma, así que viajan con el resto de sus textos.
   */
  formatos: {
    /** "Martes 25 de agosto": el rótulo de un día en la agenda y en el panel del día. */
    dia: "EEEE d 'de' MMMM",
    /** "25 de agosto": dentro de una frase ("Qué hay el…", "Apuntar algo el…"). */
    diaYMes: "d 'de' MMMM",
    /** "15 ago": las pastillas estrechas (ausencias, cumpleaños). */
    diaYMesCorto: 'd MMM',
    /** El nombre accesible de una celda del mes: "martes, 25 de agosto". */
    celda: "EEEE, d 'de' MMMM",
    /** La fecha de un resultado de búsqueda, que puede ser de otro año. */
    resultado: "EEEE d 'de' MMMM yyyy",
    /** El título de la cabecera. En móvil, abreviado (ver `CalendarView`). */
    mesLargo: 'MMMM yyyy',
    mesCorto: 'MMM yyyy',
    diaLargo: "EEEE, d 'de' MMMM",
    diaCorto: 'EEE, d MMM',
    /** Los dos extremos de una semana: "17 – 23 de agosto", o "31 de ago – 6 de septiembre" si cruza de mes. */
    semanaDesdeOtroMes: "d 'de' MMM",
    semanaDesdeOtroMesCorto: 'd MMM',
    semanaHasta: "d 'de' MMMM",
    semanaHastaCorto: 'd MMM',
  },

  /** Las letras de la cabecera del mes y de los días de una serie, de lunes a domingo. */
  iniciales: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],

  /** Para contar una serie en una frase ("lunes, miércoles y viernes"). Por `getDay()`: 0 es el domingo. */
  semana: {
    plurales: ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'],
    y: 'y',
  },

  /** Los rótulos de la agenda (`tramoDeAgenda`). */
  tramos: {
    hoy: 'Hoy',
    manana: 'Mañana',
    estaSemana: 'Esta semana',
    laSemanaQueViene: 'La semana que viene',
    mes: 'MMMM',
    mesYAno: 'MMMM yyyy',
  },

  cabecera: {
    queEnsena: 'Qué enseña el calendario',
    anterior: { mes: 'Mes anterior', semana: 'Semana anterior', dia: 'Día anterior' },
    siguiente: { mes: 'Mes siguiente', semana: 'Semana siguiente', dia: 'Día siguiente' },
    hoy: 'Hoy',
  },

  apuntarAlgo: 'Apuntar algo',
  apuntarAlgoEl: (fecha: string) => `Apuntar algo el ${fecha}`,
  apuntarAlgoALas: (fecha: string, hora: string) => `Apuntar algo el ${fecha} a las ${hora}`,
  todoElDia: 'Todo el día',
  festivo: 'Festivo',
  tareas: (n: number) => (n === 1 ? '1 tarea' : `${n} tareas`),
  /** La etiqueta de quien falta, en el panel del día y en la franja de todo el día. */
  ausencia: {
    vacaciones: (nombre: string) => `${nombre} · vacaciones`,
    descanso: (nombre: string) => `${nombre} · descansa`,
  },

  mes: {
    eligeUnDia: 'Elige un día para ver qué tiene.',
    verTodoLoQueViene: 'Ver todo lo que viene',
  },

  /** Una celda del mes. */
  celda: {
    aLas: (titulo: string, hora: string) => `${titulo}, a las ${hora}`,
    mas: (n: number) => `+${n} más`,
  },

  /** Lo que hay un día, en palabras, para la etiqueta accesible de la celda (`resumenDelDia`). */
  resumen: {
    planes: (n: number) => (n === 1 ? '1 plan' : `${n} planes`),
    familiaDeVacaciones: 'la familia de vacaciones',
    familiaDescansando: 'la familia descansando',
    /** `mas`: si va detrás de la familia ("1 más de vacaciones"). */
    deVacaciones: (n: number, mas: boolean) => `${n}${mas ? ' más' : ''} de vacaciones`,
    descansando: (n: number, mas: boolean) => `${n}${mas ? ' más' : ''} descansando`,
    sinPlanes: 'sin planes',
  },

  panelDelDia: {
    queHay: (fecha: string) => `Qué hay el ${fecha}`,
    nadaApuntado: 'Nada apuntado.',
  },

  agenda: {
    nombre: 'Agenda',
    porPersona: 'Agenda por persona',
    buscar: 'Buscar…',
    buscarEnElCalendario: 'Buscar en el calendario',
    ejes: { dia: 'Por día', persona: 'Por persona' },
    resultados: (n: number) => (n === 1 ? '1 resultado en todo el calendario' : `${n} resultados en todo el calendario`),
    sinCoincidencias: 'Sin coincidencias',
    ningunEventoCon: (busqueda: string) => `Ningún evento con «${busqueda}»`,
    sinPlanes: 'Sin planes',
  },

  tareasDelDia: {
    marcar: (titulo: string) => `Marcar "${titulo}" como completada`,
    atrasada: 'Atrasada',
    todasAtrasadas: (n: number) => (n === 1 ? '1 tarea atrasada' : `${n} tareas atrasadas`),
    atrasadas: (n: number) => (n === 1 ? '1 atrasada' : `${n} atrasadas`),
    ocultar: 'Ocultar las tareas',
  },

  /** El bloque "Vacaciones y descansos" (`Availability`). */
  ausencias: {
    titulo: 'Vacaciones y descansos',
    /** Lo que se dice de quien falta, según cuándo. `fecha` va ya escrita ("15 ago"). */
    vacaciones: {
      hoy: 'de vacaciones hoy',
      manana: 'de vacaciones mañana',
      el: (fecha: string) => `de vacaciones el ${fecha}`,
      hasta: (fecha: string) => `de vacaciones hasta el ${fecha}`,
      del: (desde: string, hasta: string) => `de vacaciones del ${desde} al ${hasta}`,
    },
    descanso: {
      hoy: 'descansa hoy',
      manana: 'descansa mañana',
      el: (fecha: string) => `descansa el ${fecha}`,
      hasta: (fecha: string) => `descansa hasta el ${fecha}`,
      del: (desde: string, hasta: string) => `descansa del ${desde} al ${hasta}`,
    },
    editar: (titulo: string, nombre: string, estado: string) => `Editar ${titulo}: ${nombre} ${estado}`,
  },

  /** El bloque de cumpleaños de debajo del mes. */
  cumples: {
    titulo: 'Cumpleaños',
    hoy: 'hoy',
    manana: 'mañana',
    el: (fecha: string) => `el ${fecha}`,
    /** `edad` llega ya escrita ("8 años"), o null si no se sabe el año. */
    cuandoYEdad: (cuando: string, edad: string | null) => (edad ? `${cuando}, ${edad}` : cuando),
    editar: (nombre: string, detalle: string) => `Editar el cumpleaños de ${nombre}: ${detalle}`,
    yaPasaron: (n: number) => (n === 1 ? '1 que ya pasó' : `${n} que ya pasaron`),
  },

  /** El sheet de un evento. */
  evento: {
    editar: 'Editar lo apuntado',
    apuntarCumple: 'Apuntar un cumpleaños',
    apuntarEnElCalendario: 'Apuntar en el calendario',
    eliminar: 'Eliminar',
    confirmar: 'Confirmar',
    queEs: 'Qué es',
    tipos: {
      evento: 'Un plan',
      vacaciones: 'Vacaciones',
      descanso: 'Descanso',
      festivo: 'Festivo',
      cumple: 'Cumpleaños',
    },
    deQuien: 'De quién',
    tituloOpcional: 'Título (opcional)',
    titulo: 'Título',
    /** Con qué nombre se guarda si no se escribe ninguno. Lo que se guarda sigue en castellano (`eventTitleOr`). */
    placeholders: {
      vacaciones: 'Vacaciones',
      descanso: 'Descanso',
      festivo: 'Festivo',
      cumple: 'Abuela Carmen',
      evento: '¿Qué ocurre?',
    },
    descripcion: 'Descripción (opcional)',
    descripcionPlaceholder: 'Lugar, notas…',
    desde: 'Desde',
    hasta: 'Hasta',
    dia: 'Día',
    anoDeNacimiento: 'Año de nacimiento (opcional)',
    fecha: 'Fecha',
    inicio: 'Inicio',
    fin: 'Fin',

    guardarCambios: 'Guardar cambios',
    apuntarCumpleanos: 'Apuntar cumpleaños',
    apuntarDias: (n: number) => (n === 1 ? 'Apuntar 1 día' : `Apuntar ${n} días`),
    apuntarVacaciones: 'Apuntar vacaciones',
    apuntarDescanso: 'Apuntar descanso',
    apuntarFestivo: 'Apuntar festivo',
    apuntar: 'Apuntar',

    errores: {
      algunDia: 'Selecciona al menos un día',
      fechaDeFin: 'Indica la fecha de fin',
      finAntesDelInicio: 'La fecha de fin debe ser posterior a la fecha de inicio',
      maximo52Semanas: 'El período máximo es 52 semanas',
      ningunEvento: 'No se crearán eventos con esta configuración',
      anoFinal: 'El año final debe ser igual o posterior al año de inicio',
      ultimoDia: 'El último día no puede ser anterior al primero',
    },
  },

  /** Borrar un evento que se repite. */
  borrarSerie: {
    seRepite: 'Este evento se repite',
    queEliminar: '¿Qué quieres eliminar?',
    soloEste: 'Eliminar solo este',
    todaLaSerie: 'Eliminar toda la serie',
    cancelar: 'Cancelar',
  },

  /** La parte de "esto se repite" del sheet. */
  repeticion: {
    titulo: 'Repetición',
    opciones: { none: 'No se repite', weekly: 'Cada semana', yearly: 'Cada año' },
    repetirLosDias: 'Repetir los días',
    terminaEl: 'Termina el',
    repetirHastaElAno: 'Repetir hasta el año',
    /** Va detrás del título del evento, en negrita. `dias` llega ya unido ("lunes y jueves"). */
    semanal: (dias: string, fin: string) => `se añadirá los ${dias} hasta el ${fin}.`,
    anual: (ano: number) => `se añadirá cada año el mismo día hasta ${ano}.`,
    seCrearan: (n: number) => (n === 1 ? 'Se crearán 1 evento.' : `Se crearán ${n} eventos.`),
    elEvento: 'El evento',
    porSeparado: 'Podrás editar cada evento por separado.',
  },
}
