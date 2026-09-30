/**
 * Lo que comparten varias pantallas: los rótulos de `constants.ts`, los
 * componentes de `ui/` y los mensajes de la capa de datos (el store y los
 * repositorios).
 *
 * Los rótulos van por la clave del dato (`franjas.breakfast`,
 * `prioridades.high`), la misma que guarda la base: así se traduce el nombre sin
 * tocar lo que se guarda.
 */
export const comun = {
  /** Quien lleva algo cuando no es de nadie en concreto. */
  familia: 'Familia',
  asignarA: 'Asignar a',
  cerrar: 'Cerrar',
  limpiarBusqueda: 'Limpiar búsqueda',
  marcarComoPendiente: 'Marcar como pendiente',
  marcarComoCompletado: 'Marcar como completado',
  apuntarQueHaceFalta: 'Apuntar que hace falta',
  beta: 'Beta',

  franjas: {
    breakfast: 'Desayuno',
    lunch: 'Comida',
    school: 'Comedor',
    snack: 'Merienda',
    dinner: 'Cena',
  },

  categoriasDeDocumento: {
    salud: 'Salud',
    colegio: 'Colegio',
    personal: 'Personal',
    vivienda: 'Vivienda',
    vehiculo: 'Vehículo',
    seguros: 'Seguros',
    finanzas: 'Finanzas',
    facturas: 'Facturas',
    mascotas: 'Mascotas',
    viajes: 'Viajes',
    otros: 'Otros',
  },

  /** El nombre de cada color de persona, por su valor en `PERSON_COLORS`. */
  colores: {
    '#A8503A': 'Ladrillo',
    '#7E5522': 'Cuero',
    '#7A2E2E': 'Vino',
    '#4A6C8C': 'Azul',
    '#3D5C42': 'Verde bosque',
    '#8A3D4A': 'Granate',
    '#536270': 'Pizarra',
    '#6B3F6D': 'Ciruela',
    '#F7B8CE': 'Rosa chicle',
    '#FFAFA0': 'Coral claro',
    '#F5D9A8': 'Champán dorado',
    '#F9BE94': 'Melocotón',
    '#F2A65A': 'Calabaza clara',
    '#D9A46C': 'Canela clara',
  },

  /** Cada cuánto se repite una tarea. En la tarjeta sale el mismo nombre, sin «No se repite». */
  recurrencias: {
    none: 'No se repite',
    daily: 'Diaria',
    weekly: 'Semanal',
    monthly: 'Mensual',
  },

  prioridades: {
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
  },

  /** El de un presupuesto que te pasan: `nombre` en el selector y `corto` en la tarjeta. */
  estadosDePresupuesto: {
    pedido: { nombre: 'Pedido', corto: 'Decidiendo' },
    aceptado: { nombre: 'Aceptado', corto: 'Aceptado' },
    descartado: { nombre: 'Descartado', corto: 'Descartado' },
  },

  /** Lo que dice el store cuando una escritura no sale y no hay un mensaje mejor. */
  store: {
    familiaNoEncontrada: 'No se ha encontrado la familia activa',
    errorCargando: 'Error cargando los datos',
    noSeGuardo: 'No se pudo guardar el cambio',
    noSeCreoFamilia: 'No se pudo crear la familia',
    unicaFamilia: 'No puedes eliminar tu única familia.',
    noSeEliminoFamilia: 'No se pudo eliminar la familia',
    noSeCreoEvento: 'No se pudo crear el evento',
    noSeCreoSerie: 'No se pudo crear la serie de eventos',
    noSeApuntaronMovimientos: 'No se pudieron apuntar los movimientos',
    noSeGuardoDocumento: 'No se pudo guardar el documento',
    /** El «Hecho · Deshacer» de marcar una tarea. */
    hecho: 'Hecho',
  },

  /** Los de los repositorios, antes de llegar al store. */
  datos: {
    operacionFallida: 'No se pudo completar la operación',
    seleccionaUnArchivo: 'Selecciona un archivo para subirlo',
    noSeSubioADrive: 'No se pudo subir el archivo a Google Drive. Inténtalo de nuevo.',
    driveNoConfirmo: 'Google Drive no confirmó la subida del archivo.',
    errorAlInvitar: 'Error al enviar la invitación',
    noAutenticado: 'Usuario no autenticado',
    demoSinArchivos: 'En modo demo no se guardan archivos reales, así que no hay nada que abrir.',
  },
}
