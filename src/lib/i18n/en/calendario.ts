import type { calendario as es } from '../es/calendario'

export const calendario: typeof es = {
  vistas: {
    agenda: 'Agenda',
    dia: 'Day',
    semana: 'Week',
    mes: 'Month',
  },

  formatos: {
    dia: 'EEEE d MMMM',
    diaYMes: 'd MMMM',
    diaYMesCorto: 'd MMM',
    celda: 'EEEE d MMMM',
    resultado: 'EEEE d MMMM yyyy',
    mesLargo: 'MMMM yyyy',
    mesCorto: 'MMM yyyy',
    diaLargo: 'EEEE, d MMMM',
    diaCorto: 'EEE, d MMM',
    semanaDesdeOtroMes: 'd MMM',
    semanaDesdeOtroMesCorto: 'd MMM',
    semanaHasta: 'd MMMM',
    semanaHastaCorto: 'd MMM',
  },

  iniciales: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],

  semana: {
    plurales: ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'],
    y: 'and',
  },

  tramos: {
    hoy: 'Today',
    manana: 'Tomorrow',
    estaSemana: 'This week',
    laSemanaQueViene: 'Next week',
    mes: 'MMMM',
    mesYAno: 'MMMM yyyy',
  },

  cabecera: {
    queEnsena: 'What the calendar shows',
    anterior: { mes: 'Previous month', semana: 'Previous week', dia: 'Previous day' },
    siguiente: { mes: 'Next month', semana: 'Next week', dia: 'Next day' },
    hoy: 'Today',
  },

  apuntarAlgo: 'Add something',
  apuntarAlgoEl: (fecha: string) => `Add something on ${fecha}`,
  apuntarAlgoALas: (fecha: string, hora: string) => `Add something on ${fecha} at ${hora}`,
  todoElDia: 'All day',
  festivo: 'Bank holiday',
  tareas: (n: number) => (n === 1 ? '1 task' : `${n} tasks`),
  ausencia: {
    vacaciones: (nombre: string) => `${nombre} · on holiday`,
    descanso: (nombre: string) => `${nombre} · day off`,
  },

  mes: {
    eligeUnDia: 'Pick a day to see what’s on.',
    verTodoLoQueViene: 'See everything coming up',
  },

  celda: {
    aLas: (titulo: string, hora: string) => `${titulo}, at ${hora}`,
    mas: (n: number) => `+${n} more`,
  },

  resumen: {
    planes: (n: number) => (n === 1 ? '1 plan' : `${n} plans`),
    familiaDeVacaciones: 'the family on holiday',
    familiaDescansando: 'the family on a day off',
    deVacaciones: (n: number, mas: boolean) => `${n}${mas ? ' more' : ''} on holiday`,
    descansando: (n: number, mas: boolean) => `${n}${mas ? ' more' : ''} on a day off`,
    sinPlanes: 'no plans',
  },

  panelDelDia: {
    queHay: (fecha: string) => `What’s on ${fecha}`,
    nadaApuntado: 'Nothing planned.',
  },

  agenda: {
    nombre: 'Agenda',
    porPersona: 'Agenda by person',
    buscar: 'Search…',
    buscarEnElCalendario: 'Search the calendar',
    ejes: { dia: 'By day', persona: 'By person' },
    resultados: (n: number) => (n === 1 ? '1 result in the whole calendar' : `${n} results in the whole calendar`),
    sinCoincidencias: 'No matches',
    ningunEventoCon: (busqueda: string) => `No events with “${busqueda}”`,
    sinPlanes: 'No plans',
  },

  tareasDelDia: {
    marcar: (titulo: string) => `Mark "${titulo}" as done`,
    atrasada: 'Overdue',
    todasAtrasadas: (n: number) => (n === 1 ? '1 overdue task' : `${n} overdue tasks`),
    atrasadas: (n: number) => `${n} overdue`,
    ocultar: 'Hide the tasks',
  },

  ausencias: {
    titulo: 'Holidays and days off',
    vacaciones: {
      hoy: 'on holiday today',
      manana: 'on holiday tomorrow',
      el: (fecha: string) => `on holiday on ${fecha}`,
      hasta: (fecha: string) => `on holiday until ${fecha}`,
      del: (desde: string, hasta: string) => `on holiday from ${desde} to ${hasta}`,
    },
    descanso: {
      hoy: 'off today',
      manana: 'off tomorrow',
      el: (fecha: string) => `off on ${fecha}`,
      hasta: (fecha: string) => `off until ${fecha}`,
      del: (desde: string, hasta: string) => `off from ${desde} to ${hasta}`,
    },
    editar: (titulo: string, nombre: string, estado: string) => `Edit ${titulo}: ${nombre} ${estado}`,
  },

  cumples: {
    titulo: 'Birthdays',
    hoy: 'today',
    manana: 'tomorrow',
    el: (fecha: string) => `on ${fecha}`,
    cuandoYEdad: (cuando: string, edad: string | null) => (edad ? `${cuando}, ${edad}` : cuando),
    editar: (nombre: string, detalle: string) => `Edit ${nombre}’s birthday: ${detalle}`,
    yaPasaron: (n: number) => `${n} already passed`,
  },

  evento: {
    editar: 'Edit entry',
    apuntarCumple: 'Add a birthday',
    apuntarEnElCalendario: 'Add to the calendar',
    eliminar: 'Delete',
    confirmar: 'Confirm',
    queEs: 'What is it',
    tipos: {
      evento: 'A plan',
      vacaciones: 'Holiday',
      descanso: 'Day off',
      festivo: 'Bank holiday',
      cumple: 'Birthday',
    },
    deQuien: 'Whose',
    tituloOpcional: 'Title (optional)',
    titulo: 'Title',
    placeholders: {
      vacaciones: 'Holiday',
      descanso: 'Day off',
      festivo: 'Bank holiday',
      cumple: 'Grandma Carmen',
      evento: 'What’s happening?',
    },
    descripcion: 'Description (optional)',
    descripcionPlaceholder: 'Place, notes…',
    desde: 'From',
    hasta: 'To',
    dia: 'Day',
    anoDeNacimiento: 'Year of birth (optional)',
    fecha: 'Date',
    inicio: 'Start',
    fin: 'End',

    guardarCambios: 'Save changes',
    apuntarCumpleanos: 'Add birthday',
    apuntarDias: (n: number) => (n === 1 ? 'Add 1 day' : `Add ${n} days`),
    apuntarVacaciones: 'Add holiday',
    apuntarDescanso: 'Add day off',
    apuntarFestivo: 'Add bank holiday',
    apuntar: 'Add',

    errores: {
      algunDia: 'Pick at least one day',
      fechaDeFin: 'Give an end date',
      finAntesDelInicio: 'The end date must be after the start date',
      maximo52Semanas: 'The longest it can run is 52 weeks',
      ningunEvento: 'These settings won’t create any events',
      anoFinal: 'The last year must be the same as or after the first',
      ultimoDia: 'The last day can’t be before the first',
    },
  },

  borrarSerie: {
    seRepite: 'This event repeats',
    queEliminar: 'What do you want to delete?',
    soloEste: 'Delete just this one',
    todaLaSerie: 'Delete the whole series',
    cancelar: 'Cancel',
  },

  repeticion: {
    titulo: 'Repeat',
    opciones: { none: 'Doesn’t repeat', weekly: 'Every week', yearly: 'Every year' },
    repetirLosDias: 'Repeat on',
    terminaEl: 'Ends on',
    repetirHastaElAno: 'Repeat until the year',
    semanal: (dias: string, fin: string) => `will be added on ${dias} until ${fin}.`,
    anual: (ano: number) => `will be added on the same day every year until ${ano}.`,
    seCrearan: (n: number) => (n === 1 ? '1 event will be created.' : `${n} events will be created.`),
    elEvento: 'The event',
    porSeparado: 'You can edit each event separately.',
  },
}
