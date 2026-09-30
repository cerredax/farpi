/** Documentos: la pantalla, la tarjeta, el sheet, conectar Google Drive y lo que contestan sus rutas API. */
export const documentos = {
  vista: {
    resumen: (n: number) => (n === 1 ? '1 documento guardado' : `${n} documentos guardados`),
    buscarEn: (n: number) => `Buscar en ${n} documentos…`,
    buscarDocumentos: 'Buscar documentos',
    anadir: 'Añadir documento',
    driveConectado:
      'Google Drive conectado. Ya puedes guardar documentos: se quedarán en tu Drive y la familia los verá aquí.',
    driveError: 'No se pudo conectar Google Drive. Vuelve a intentarlo desde el botón de añadir documento.',
    filtrarPorCategoria: 'Filtrar por categoría',
    todos: 'Todos',
    /** La pastilla que despliega las categorías que no caben. */
    mas: (n: number) => `+${n} más`,
    verMenos: 'Ver menos',
    sinCoincidencias: 'Sin coincidencias',
    sinDocumentosEnCategoria: 'Sin documentos en esta categoría',
    sinDocumentos: 'Sin documentos',
    ningunoCoincide: (busqueda: string) => `Ningún documento coincide con «${busqueda}»`,
  },

  tarjeta: {
    caducoEl: (fecha: string) => `Caducó el ${fecha}`,
    caducaEl: (fecha: string) => `Caduca el ${fecha}`,
    formatoFecha: 'd MMM yyyy',
  },

  sheet: {
    anadir: 'Añadir documento',
    editar: 'Editar documento',
    subiendo: 'Subiendo el archivo…',
    guardando: 'Guardando…',
    guardarDocumento: 'Guardar documento',
    guardarCambios: 'Guardar cambios',
    eliminar: 'Eliminar documento',
    confirmarEliminacion: 'Confirmar eliminación',
    nombreObligatorio: 'El nombre es obligatorio.',
    conectaParaSubir: 'Conecta tu Google Drive para poder subir el documento.',
    seleccionaArchivo: 'Selecciona un archivo.',
    noSeAbrio: 'No se pudo abrir el documento',
    archivo: 'Archivo',
    seleccionarArchivo: 'Seleccionar archivo…',
    tiposAdmitidos: (megas: number) => `PDF, JPG o PNG. Tamaño máximo: ${megas} MB.`,
    abriendo: 'Abriendo…',
    abrir: 'Abrir documento',
    nombre: 'Nombre',
    nombreEjemplo: 'Ej: Cartilla de vacunas',
    categoria: 'Categoría',
    deQuienEs: 'De quién es',
    opcional: '(opcional)',
    descripcion: 'Descripción',
    descripcionEjemplo: 'Ej: Revisión 2026',
    caducaEl: 'Caduca el',
  },

  /** El cartel de conectar, dentro del sheet de subir. */
  conectar: {
    titulo: 'Conecta tu Google Drive',
    tituloRevocada: 'Vuelve a conectar tu Google Drive',
    explicacion:
      'Los documentos que subas se guardarán en tu Drive. El resto de la familia los verá en Farpi como siempre, sin conectar nada.',
    explicacionRevocada:
      'Los documentos que subiste siguen en tu Drive, pero la familia no puede abrirlos hasta que vuelvas a dar permiso.',
    boton: 'Conectar Google Drive',
    botonRevocada: 'Volver a conectar',
  },

  /** Cómo se llama el tipo de archivo en una frase (`etiquetaDeTipo`). */
  tipos: {
    pdf: 'Documento PDF',
    jpg: 'Imagen JPG',
    png: 'Imagen PNG',
    imagen: 'Imagen',
    archivo: 'Archivo',
  },

  /** Lo que contestan las rutas `/api/documents/*` y acaba en el sheet. */
  servidor: {
    /** Cuando el archivo es de quien mira: «lo subió tu cuenta». */
    tuCuenta: 'tu cuenta',
    quienLoSubio: 'quien lo subió',
    sinConexion: (dueno: string) => `Este documento lo subió ${dueno} y todavía no ha conectado su almacenamiento.`,
    conexionRevocada: (dueno: string) =>
      `Este documento lo subió ${dueno} y su almacenamiento ya no está conectado. Pídele que vuelva a entrar en Documentos y lo conecte otra vez.`,
    sinDueno:
      'De este documento solo queda la ficha: su archivo no está en el Google Drive de nadie. Para volver a tenerlo, hay que subirlo otra vez.',
    archivoNoEsta: (dueno: string) =>
      `El archivo ya no está en el Google Drive de ${dueno}. La ficha se queda, pero el documento no se puede abrir.`,
    archivoRechazado: 'El archivo no se pudo guardar: revisa que sea un PDF, JPG o PNG de menos de 20 MB.',
    cuota: (dueno: string) => `El Google Drive de ${dueno} no admite más archivos ahora mismo.`,
    desconocido: 'No se pudo acceder al documento. Inténtalo de nuevo en un momento.',

    configIncompleta: 'Configuración incompleta en el servidor',
    faltanDatosDocumento: 'Faltan datos del documento',
    faltanDatosArchivo: 'Faltan datos del archivo',
    archivoAjeno: 'Ese archivo no es de esta subida',
    noPerteneces: 'No perteneces a esta familia',
    noEncontrado: 'Documento no encontrado',
    noSeBorro: 'No se pudo borrar el documento',
  },
}
