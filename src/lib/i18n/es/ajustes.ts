/** Ajustes: el marco (pestañas, bloques, avisos de administrador) y lo que va dentro de cada pestaña. */
export const ajustes = {
  pestanas: {
    familia: 'Familia',
    casa: 'Casa',
    cuenta: 'Cuenta',
    sincronizacion: 'Sincronización',
    legal: 'Legal',
  },
  seccionesDeAjustes: 'Secciones de ajustes',

  tuFamilia: 'Tu familia',
  soloAdminNombre: 'El nombre de la casa lo cambia un administrador.',
  /** La marca de la familia que se está mirando, en la lista de familias. */
  activa: 'activa',
  nombreDeLaFamilia: 'Nombre de la familia',
  crear: 'Crear',
  cancelar: 'Cancelar',
  nuevaFamilia: '+ Nueva familia',

  personas: 'Personas',
  adultos: (n: number) => (n === 1 ? '1 adulto' : `${n} adultos`),
  hijos: (n: number) => (n === 1 ? '1 hijo' : `${n} hijos`),
  invitaciones: (n: number) => (n === 1 ? '1 invitación' : `${n} invitaciones`),
  adultosConCuenta: 'Adultos con cuenta',
  soloAdminPersonas:
    'Invitar a alguien y cambiar quién es administrador son cosa de un administrador. Tu nombre y tu color sí los cambias tú.',
  adultosSinCuenta: 'Adultos sin cuenta',
  grupoHijos: 'Hijos',

  preferenciasDeLaCasa: 'Preferencias de la casa',
  franjasDeComida: 'Franjas de comida',
  soloAdminFranjas: 'Las franjas las decide un administrador, porque son las de toda la casa.',

  notificaciones: 'Notificaciones',

  idioma: {
    titulo: 'Idioma',
    /** Por qué cada uno elige el suyo: la cookie es de este móvil, no de la familia. */
    explicacion: 'Solo cambia en este dispositivo: cada persona de la casa elige el suyo.',
  },

  privacidad: 'Política de privacidad',
  terminos: 'Términos de servicio',

  modoDemo: 'Modo demo',
  datosDePrueba: 'Los datos son de prueba y viven en este navegador.',
  confirmarReinicio: 'Confirmar reinicio',
  reiniciarDemo: 'Reiniciar datos de demo',

  /** La tarjeta de la familia y su sheet (renombrarla y cerrarla). */
  familia: {
    editar: 'Editar familia',
    eliminar: 'Eliminar familia',
    confirmarEliminar: 'Sí, borrarla con todo',
    guardar: 'Guardar',
    nombre: 'Nombre',
    nombreEjemplo: 'Ej: Familia de Omar, Sofía y Cris',
    /** La pregunta de borrar parte en tres: antes del nombre, el nombre en negrita y lo de después. */
    seBorra: 'Se borra ',
    nombreEntreComillas: (nombre: string) => `«${nombre}»`,
    conTodoLoSuyo: (contenido: string) => ` con todo lo suyo: ${contenido}.`,
    queEstaVacia: ', que está vacía.',
    noSePuedeDeshacer: 'No se puede deshacer.',
    archivosEnDrive: 'Los archivos siguen en el Google Drive de quien los subió: lo que se borra aquí es su ficha.',
    unicaFamilia:
      'Esta es tu única familia, así que no se puede eliminar: Farpi siempre trabaja dentro de una. Crea otra antes, o borra tu cuenta para dejarlo todo.',
  },

  /** Los adultos con cuenta: la lista, las invitaciones y el sheet de invitar o editar. */
  miembros: {
    administrador: 'Administrador',
    miembro: 'Miembro',
    editarA: (nombre: string) => `Editar ${nombre}`,
    caducada: 'Caducada',
    pendiente: 'Pendiente',
    yaNoSePuedeAceptar: 'Ya no se puede aceptar: vuelve a invitar',
    invitacionEnviada: 'Invitación enviada',
    cancelarInvitacionA: (email: string) => `Cancelar invitación a ${email}`,
    invitarPersona: 'Invitar persona',

    quitarMiembro: 'Quitar miembro',
    editarMiembro: 'Editar miembro',
    confirmarQuitar: 'Sí, quitar de la familia',
    enviando: 'Enviando…',
    enviarInvitacion: 'Enviar invitación',
    guardar: 'Guardar',
    emailInvalido: 'Introduce un email válido.',
    nombreVacio: 'El nombre no puede estar vacío.',
    alMenosUnAdmin: 'La familia debe tener al menos un administrador.',
    noSeCambioElRol: 'No se pudo cambiar el rol.',
    /** Detrás del nombre en negrita. */
    dejaDeTenerAcceso:
      ' deja de tener acceso a esta familia. Su cuenta no se toca: puedes volver a invitarla cuando quieras.',
    loAsignadoAntes: 'Lo que tuviera asignado ',
    noSeBorra: 'no se borra',
    loAsignadoDespues: ': se queda en su sitio, sin nadie asignado.',
    /** Los documentos que subió, en tres trozos: antes de la negrita, la negrita y lo de después. */
    documentosAntes: (n: number) =>
      n === 1
        ? 'El documento que subió está en su Google Drive, así que '
        : `Los ${n} documentos que subió están en su Google Drive, así que `,
    documentosFuerte: 'dejarán de abrirse en Farpi',
    documentosDespues: '. La ficha se queda en Documentos, pero el archivo ya no se puede servir.',
    email: 'Email',
    emailEjemplo: 'correo@ejemplo.com',
    enModoDemo: 'En modo demo, la invitación no se envía. El email queda guardado como referencia.',
    nombre: 'Nombre',
    nombreVisible: 'Nombre visible',
    color: 'Color',
    colorExplicacion: 'Identifica a esta persona en el calendario y en los documentos.',
    rol: 'Rol',
    rolExplicacion: 'Los administradores gestionan miembros, invitaciones y ajustes de la familia.',
  },

  /** Hijos y adultos sin cuenta: la lista y su sheet. Lo que cambia según cuál es, por `hijo` y `adulto`. */
  personasSinCuenta: {
    edadEnMeses: (n: number) => (n === 1 ? '1 mes' : `${n} meses`),
    edadEnAnos: (n: number) => (n === 1 ? '1 año' : `${n} años`),
    formatoFecha: 'd MMM yyyy',
    hijo: {
      vacio: 'Aún no hay hijos',
      anadir: 'Añadir hijo',
      editar: 'Editar hijo',
      eliminar: 'Eliminar hijo',
      confirmar: 'Sí, eliminar al hijo',
      placeholder: 'Nombre del niño o niña',
      sinNombre: 'Nombre del hijo',
    },
    adulto: {
      vacio: 'Aún no hay adultos sin cuenta',
      anadir: 'Añadir adulto',
      editar: 'Editar adulto',
      eliminar: 'Eliminar adulto',
      confirmar: 'Sí, eliminar al adulto',
      placeholder: 'Abuela, tío, canguro…',
      sinNombre: 'Nombre del adulto',
    },
    eliminar: 'Eliminar',
    guardarCambios: 'Guardar cambios',
    /** Detrás del nombre en negrita. */
    dejaDeEstar: ' deja de estar en la familia y de poder elegirse al asignar nada.',
    loAsignadoAntes: 'Lo que tuviera asignado (eventos, tareas, documentos y apuntes de Finanzas) ',
    noSeBorra: 'no se borra',
    loAsignadoDespues: ': se queda en su sitio, sin nadie asignado.',
    explicacionAdulto:
      'No entra en la app ni recibe invitación: sirve para asignarle eventos, tareas y documentos. Para dar acceso a alguien, invítalo por correo desde Adultos.',
    nombre: 'Nombre',
    fechaDeNacimiento: 'Fecha de nacimiento',
    color: 'Color',
  },

  franjas: {
    quitarNoBorra: 'Quitar una no borra lo apuntado en ella: vuelve si la activas.',
    alMenosUna: 'Tiene que quedar al menos una franja',
  },

  /** La tarjeta de avisos y los errores de `lib/push.ts` al activarlos. */
  recordatorios: {
    titulo: 'Recordatorios',
    explicacion: 'Avisos de eventos y tareas de la familia en este dispositivo.',
    /** Las instrucciones del iPhone, partidas por los dos nombres de botón de Safari. */
    iosAntes: 'Para recibir avisos en el iPhone, añade Farpi a la pantalla de inicio: toca ',
    iosCompartir: 'Compartir',
    iosEntre: ' y luego ',
    iosAnadirAInicio: 'Añadir a pantalla de inicio',
    iosDespues: '. Abre la app desde ahí y vuelve a estos ajustes.',
    noAdmite: 'Tu navegador no admite notificaciones.',
    proximamente: 'Estarán disponibles próximamente.',
    bloqueadas: 'Has bloqueado las notificaciones. Actívalas desde los ajustes del navegador para este sitio.',
    guardando: 'Guardando…',
    desactivar: 'Desactivar notificaciones',
    activar: 'Activar notificaciones',
    noSeCambio: 'No se pudo cambiar la configuración.',
    noConfiguradas: 'Las notificaciones aún no están configuradas.',
    permisoDenegado: 'Permiso de notificaciones denegado.',
    sinServiceWorker: 'No se pudo preparar el aviso en este dispositivo. Recarga la página y vuelve a intentarlo.',
  },

  /** Google Drive, la pestaña Sincronización. */
  almacen: {
    titulo: 'Google Drive',
    sinConectar:
      'Los documentos que subas se guardan en tu propio Drive, no en Farpi. La familia los ve igual sin conectar nada: conectar hace falta para subir, no para mirar.',
    conectar: 'Conectar Google Drive',
    revocada:
      'La conexión ya no vale. Los documentos que subiste siguen en tu Drive, pero la familia no puede abrirlos hasta que vuelvas a dar permiso.',
    seGuardanEn: (email: string) => `Los documentos que subes se guardan en ${email}.`,
    seGuardanEnTuDrive: 'Los documentos que subes se guardan en tu Google Drive.',
    volverAConectar: 'Volver a conectar',
    confirmarDesconectar: 'Confirmar: los demás dejarán de ver tus documentos',
    desconectar: 'Desconectar Google Drive',
    noSeBorraNada:
      'No se borra ningún archivo de tu Drive. Los documentos que subiste dejarán de poder abrirse en Farpi hasta que vuelvas a conectarlo.',
    noSeDesconecto: 'No se pudo desconectar.',
  },

  copia: {
    titulo: 'Copia de seguridad',
    explicacion:
      'Un archivo con todo lo de la familia: personas, calendario, tareas, listas, comidas y las fichas de los documentos.',
    descargar: 'Descargar una copia de todo',
    sinCifrar:
      'Sin cifrar y con datos de la familia dentro: guárdalo donde guardarías los papeles. Los archivos de los documentos no van en la copia; están en Google Drive.',
    descargada: 'Copia descargada.',
    noSePreparo: 'No se pudo preparar la copia.',
    /** El recuento de debajo del botón (`resumenDeExportacion`): cada parte, entera. */
    resumen: {
      personas: (n: number) => (n === 1 ? '1 persona' : `${n} personas`),
      eventos: (n: number) => (n === 1 ? '1 evento' : `${n} eventos`),
      tareas: (n: number) => (n === 1 ? '1 tarea' : `${n} tareas`),
      articulos: (n: number) => (n === 1 ? '1 artículo' : `${n} artículos`),
      comidas: (n: number) => (n === 1 ? '1 comida' : `${n} comidas`),
      notas: (n: number) => (n === 1 ? '1 nota' : `${n} notas`),
      apuntes: (n: number) => (n === 1 ? '1 apunte' : `${n} apuntes`),
      documentos: (n: number) => (n === 1 ? '1 documento' : `${n} documentos`),
    },
  },

  contrasena: {
    nueva: 'Nueva contraseña',
    minimo: (n: number) => `Mínimo ${n} caracteres`,
    demasiadoCorta: (n: number) => `La contraseña debe tener al menos ${n} caracteres.`,
    guardando: 'Guardando…',
    guardar: 'Guardar',
    cancelar: 'Cancelar',
    cambiar: 'Cambiar contraseña',
    actualizada: 'Contraseña actualizada.',
  },

  borrarCuenta: {
    titulo: 'Borrar cuenta',
    explicacion:
      'Elimina tu cuenta y tus datos. Las familias donde eres el único miembro se borran por completo. Si eres el único administrador de una familia compartida, tendrás que nombrar a otro administrador antes.',
    borrando: 'Borrando…',
    confirmar: 'Confirmar borrado definitivo',
    boton: 'Borrar mi cuenta',
    noSeBorro: 'No se pudo borrar la cuenta.',
  },

  instalar: 'Instalar Farpi en el dispositivo',

  /** Lo que contestan `/api/invite`, `/api/account/delete` y `/api/push`, y se lee en pantalla. */
  servidor: {
    faltanParametrosInvitacion: 'Faltan parámetros: familyId y email son obligatorios',
    correoSinForma: 'Ese correo no tiene forma de correo',
    soloAdminsInvitan: 'Solo los administradores pueden invitar miembros',
    noSeCreoInvitacion: 'No se pudo crear la invitación',
    demasiadasInvitaciones: 'Has mandado muchas invitaciones hoy. Prueba de nuevo mañana.',
    invitacionDuplicada: 'Ya existe una invitación pendiente para ese email',
    faltaDominio: 'La invitación no se puede enviar: falta configurar el dominio de la app.',
    errorEnviandoEmail: 'Error al enviar el email de invitación',
    /** Sin punto final: es el de la ruta, distinto del de la tarjeta. */
    noSeBorroCuenta: 'No se pudo borrar la cuenta',
    nombraOtroAdmin: 'Antes de borrar tu cuenta, nombra administrador a otra persona de la familia.',
    noSeConsultoSuscripcion: 'No se pudo consultar la suscripción',
    suscripcionInvalida: 'Suscripción inválida',
    noSeGuardoSuscripcion: 'No se pudo guardar la suscripción',
    faltaEndpoint: 'Falta endpoint',
    noSeBorroSuscripcion: 'No se pudo borrar la suscripción',
  },
}
