import type { comun as es } from '../es/comun'

export const comun: typeof es = {
  familia: 'Family',
  asignarA: 'Assign to',
  cerrar: 'Close',
  limpiarBusqueda: 'Clear search',
  marcarComoPendiente: 'Mark as not done',
  marcarComoCompletado: 'Mark as done',
  apuntarQueHaceFalta: 'Mark as needed',
  beta: 'Beta',

  franjas: {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    // El comedor del colegio: lo que el niño come allí, no la comida de casa.
    school: 'School lunch',
    snack: 'Snack',
    dinner: 'Dinner',
  },

  categoriasDeDocumento: {
    salud: 'Health',
    colegio: 'School',
    personal: 'Personal',
    vivienda: 'Home',
    vehiculo: 'Vehicle',
    seguros: 'Insurance',
    finanzas: 'Finances',
    facturas: 'Bills',
    mascotas: 'Pets',
    viajes: 'Travel',
    otros: 'Other',
  },

  colores: {
    '#A8503A': 'Brick',
    '#7E5522': 'Leather',
    '#7A2E2E': 'Wine',
    '#4A6C8C': 'Blue',
    '#3D5C42': 'Forest green',
    '#8A3D4A': 'Garnet',
    '#536270': 'Slate',
    '#6B3F6D': 'Plum',
    '#F7B8CE': 'Bubblegum pink',
    '#FFAFA0': 'Light coral',
    '#F5D9A8': 'Golden champagne',
    '#F9BE94': 'Peach',
    '#F2A65A': 'Light pumpkin',
    '#D9A46C': 'Light cinnamon',
  },

  recurrencias: {
    none: 'Does not repeat',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
  },

  prioridades: {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  },

  estadosDePresupuesto: {
    pedido: { nombre: 'Requested', corto: 'Deciding' },
    aceptado: { nombre: 'Accepted', corto: 'Accepted' },
    descartado: { nombre: 'Turned down', corto: 'Turned down' },
  },

  store: {
    familiaNoEncontrada: 'Your family could not be found',
    errorCargando: 'The data could not be loaded',
    noSeGuardo: 'The change could not be saved',
    noSeCreoFamilia: 'The family could not be created',
    unicaFamilia: 'You cannot delete your only family.',
    noSeEliminoFamilia: 'The family could not be deleted',
    noSeCreoEvento: 'The event could not be created',
    noSeCreoSerie: 'The event series could not be created',
    noSeApuntaronMovimientos: 'The transactions could not be added',
    noSeGuardoDocumento: 'The document could not be saved',
    hecho: 'Done',
    tareaEliminada: 'Task deleted',
    notaEliminada: 'Note deleted',
    itemEliminado: 'Deleted',
  },

  datos: {
    operacionFallida: 'The operation could not be completed',
    seleccionaUnArchivo: 'Choose a file to upload',
    noSeSubioADrive: 'The file could not be uploaded to Google Drive. Please try again.',
    driveNoConfirmo: 'Google Drive did not confirm the upload.',
    errorAlInvitar: 'The invitation could not be sent',
    noAutenticado: 'You are not signed in',
    demoSinArchivos: 'Demo mode does not store real files, so there is nothing to open.',
  },
}
