import type { ajustes as es } from '../es/ajustes'

export const ajustes: typeof es = {
  pestanas: {
    familia: 'Family',
    // No «Home»: así se llama ya Inicio, y serían dos sitios con el mismo nombre.
    casa: 'Household',
    cuenta: 'Account',
    sincronizacion: 'Sync',
    legal: 'Legal',
  },
  seccionesDeAjustes: 'Settings sections',

  tuFamilia: 'Your family',
  soloAdminNombre: 'Only an admin can change the family name.',
  activa: 'active',
  nombreDeLaFamilia: 'Family name',
  crear: 'Create',
  cancelar: 'Cancel',
  nuevaFamilia: '+ New family',

  personas: 'People',
  adultos: (n: number) => (n === 1 ? '1 adult' : `${n} adults`),
  hijos: (n: number) => (n === 1 ? '1 child' : `${n} children`),
  invitaciones: (n: number) => (n === 1 ? '1 invitation' : `${n} invitations`),
  adultosConCuenta: 'Adults with an account',
  soloAdminPersonas:
    'Inviting someone and choosing who is an admin is up to an admin. Your own name and colour are yours to change.',
  adultosSinCuenta: 'Adults without an account',
  grupoHijos: 'Children',

  preferenciasDeLaCasa: 'Household preferences',
  franjasDeComida: 'Meal times',
  soloAdminFranjas: 'Meal times are set by an admin, because they are the same for the whole household.',

  notificaciones: 'Notifications',

  idioma: {
    titulo: 'Language',
    explicacion: 'This only changes on this device: everyone at home chooses their own.',
  },

  privacidad: 'Privacy policy',
  terminos: 'Terms of service',

  modoDemo: 'Demo mode',
  datosDePrueba: 'This is sample data and it lives in this browser.',
  confirmarReinicio: 'Confirm reset',
  reiniciarDemo: 'Reset demo data',

  familia: {
    editar: 'Edit family',
    eliminar: 'Delete family',
    confirmarEliminar: 'Yes, delete it and everything in it',
    guardar: 'Save',
    nombre: 'Name',
    nombreEjemplo: 'E.g. Omar, Sofía and Cris’s family',
    seBorra: 'This deletes ',
    nombreEntreComillas: (nombre: string) => `“${nombre}”`,
    conTodoLoSuyo: (contenido: string) => ` and everything in it: ${contenido}.`,
    queEstaVacia: ', which is empty.',
    noSePuedeDeshacer: 'It cannot be undone.',
    archivosEnDrive: 'The files stay in the Google Drive of whoever uploaded them: what is deleted here is their record.',
    unicaFamilia:
      'This is your only family, so it cannot be deleted: Farpi always works inside one. Create another one first, or delete your account to leave everything.',
  },

  miembros: {
    administrador: 'Admin',
    miembro: 'Member',
    editarA: (nombre: string) => `Edit ${nombre}`,
    caducada: 'Expired',
    pendiente: 'Pending',
    yaNoSePuedeAceptar: 'It can no longer be accepted: invite them again',
    invitacionEnviada: 'Invitation sent',
    cancelarInvitacionA: (email: string) => `Cancel invitation to ${email}`,
    invitarPersona: 'Invite someone',

    quitarMiembro: 'Remove member',
    editarMiembro: 'Edit member',
    confirmarQuitar: 'Yes, remove from the family',
    enviando: 'Sending…',
    enviarInvitacion: 'Send invitation',
    guardar: 'Save',
    emailInvalido: 'Enter a valid email.',
    nombreVacio: 'The name cannot be empty.',
    alMenosUnAdmin: 'The family must have at least one admin.',
    noSeCambioElRol: 'The role could not be changed.',
    dejaDeTenerAcceso:
      ' loses access to this family. Their account is not touched: you can invite them again whenever you like.',
    loAsignadoAntes: 'Whatever was assigned to them ',
    noSeBorra: 'is not deleted',
    loAsignadoDespues: ': it stays where it is, with nobody assigned.',
    // El inglés lleva el pronombre antes de la negrita («so it» / «so they»), y así la negrita no cambia.
    documentosAntes: (n: number) =>
      n === 1
        ? 'The document they uploaded is in their Google Drive, so it '
        : `The ${n} documents they uploaded are in their Google Drive, so they `,
    documentosFuerte: 'will no longer open in Farpi',
    documentosDespues: '. The record stays in Documents, but the file can no longer be served.',
    email: 'Email',
    emailEjemplo: 'email@example.com',
    enModoDemo: 'In demo mode, the invitation is not sent. The email is kept for reference.',
    nombre: 'Name',
    nombreVisible: 'Display name',
    color: 'Colour',
    colorExplicacion: 'It identifies this person in the calendar and in documents.',
    rol: 'Role',
    rolExplicacion: 'Admins manage members, invitations and family settings.',
  },

  personasSinCuenta: {
    edadEnMeses: (n: number) => (n === 1 ? '1 month' : `${n} months`),
    edadEnAnos: (n: number) => (n === 1 ? '1 year' : `${n} years`),
    formatoFecha: 'd MMM yyyy',
    hijo: {
      vacio: 'No children yet',
      anadir: 'Add child',
      editar: 'Edit child',
      eliminar: 'Delete child',
      confirmar: 'Yes, delete the child',
      placeholder: 'The child’s name',
      sinNombre: 'Child’s name',
    },
    adulto: {
      vacio: 'No adults without an account yet',
      anadir: 'Add adult',
      editar: 'Edit adult',
      eliminar: 'Delete adult',
      confirmar: 'Yes, delete the adult',
      placeholder: 'Grandma, uncle, babysitter…',
      sinNombre: 'Adult’s name',
    },
    eliminar: 'Delete',
    guardarCambios: 'Save changes',
    dejaDeEstar: ' is no longer part of the family and can no longer be picked when assigning anything.',
    loAsignadoAntes: 'Whatever was assigned to them (events, tasks, documents and Finances entries) ',
    noSeBorra: 'is not deleted',
    loAsignadoDespues: ': it stays where it is, with nobody assigned.',
    explicacionAdulto:
      'They do not use the app or get an invitation: this is for assigning them events, tasks and documents. To give someone access, invite them by email from Adults.',
    nombre: 'Name',
    fechaDeNacimiento: 'Date of birth',
    color: 'Colour',
  },

  franjas: {
    quitarNoBorra: 'Turning one off does not delete what was planned in it: it comes back if you turn it on.',
    alMenosUna: 'At least one meal time has to stay on',
  },

  recordatorios: {
    titulo: 'Reminders',
    explicacion: 'Alerts for the family’s events and tasks on this device.',
    iosAntes: 'To get alerts on your iPhone, add Farpi to your Home Screen: tap ',
    iosCompartir: 'Share',
    iosEntre: ' and then ',
    iosAnadirAInicio: 'Add to Home Screen',
    iosDespues: '. Open the app from there and come back to these settings.',
    noAdmite: 'Your browser does not support notifications.',
    proximamente: 'They will be available soon.',
    bloqueadas: 'You have blocked notifications. Turn them on in your browser settings for this site.',
    guardando: 'Saving…',
    desactivar: 'Turn off notifications',
    activar: 'Turn on notifications',
    noSeCambio: 'The setting could not be changed.',
    noConfiguradas: 'Notifications are not set up yet.',
    permisoDenegado: 'Notification permission denied.',
    sinServiceWorker: 'The alerts could not be set up on this device. Reload the page and try again.',
  },

  almacen: {
    titulo: 'Google Drive',
    sinConectar:
      'The documents you upload are saved in your own Drive, not in Farpi. The family sees them all the same without connecting anything: connecting is needed to upload, not to look.',
    conectar: 'Connect Google Drive',
    revocada:
      'The connection is no longer valid. The documents you uploaded are still in your Drive, but the family cannot open them until you give permission again.',
    seGuardanEn: (email: string) => `The documents you upload are saved in ${email}.`,
    seGuardanEnTuDrive: 'The documents you upload are saved in your Google Drive.',
    volverAConectar: 'Reconnect',
    confirmarDesconectar: 'Confirm: the others will stop seeing your documents',
    desconectar: 'Disconnect Google Drive',
    noSeBorraNada:
      'No file is deleted from your Drive. The documents you uploaded will no longer open in Farpi until you connect it again.',
    noSeDesconecto: 'It could not be disconnected.',
  },

  copia: {
    titulo: 'Backup',
    explicacion:
      'A file with everything of the family’s: people, calendar, tasks, lists, meals and the records of the documents.',
    descargar: 'Download a copy of everything',
    sinCifrar:
      'Not encrypted and with family data inside: keep it where you would keep your papers. The document files are not in the copy; they are in Google Drive.',
    descargada: 'Copy downloaded.',
    noSePreparo: 'The copy could not be prepared.',
    resumen: {
      personas: (n: number) => (n === 1 ? '1 person' : `${n} people`),
      eventos: (n: number) => (n === 1 ? '1 event' : `${n} events`),
      tareas: (n: number) => (n === 1 ? '1 task' : `${n} tasks`),
      articulos: (n: number) => (n === 1 ? '1 item' : `${n} items`),
      comidas: (n: number) => (n === 1 ? '1 meal' : `${n} meals`),
      notas: (n: number) => (n === 1 ? '1 note' : `${n} notes`),
      apuntes: (n: number) => (n === 1 ? '1 entry' : `${n} entries`),
      documentos: (n: number) => (n === 1 ? '1 document' : `${n} documents`),
    },
  },

  contrasena: {
    nueva: 'New password',
    minimo: (n: number) => `At least ${n} characters`,
    demasiadoCorta: (n: number) => `The password must be at least ${n} characters long.`,
    guardando: 'Saving…',
    guardar: 'Save',
    cancelar: 'Cancel',
    cambiar: 'Change password',
    actualizada: 'Password updated.',
  },

  borrarCuenta: {
    titulo: 'Delete account',
    explicacion:
      'Deletes your account and your data. Families where you are the only member are deleted completely. If you are the only admin of a shared family, you will need to make someone else an admin first.',
    borrando: 'Deleting…',
    confirmar: 'Confirm permanent deletion',
    boton: 'Delete my account',
    noSeBorro: 'The account could not be deleted.',
  },

  instalar: 'Install Farpi on this device',

  servidor: {
    faltanParametrosInvitacion: 'Missing parameters: familyId and email are required',
    correoSinForma: 'That does not look like an email address',
    soloAdminsInvitan: 'Only admins can invite members',
    noSeCreoInvitacion: 'The invitation could not be created',
    demasiadasInvitaciones: 'You have sent a lot of invitations today. Try again tomorrow.',
    invitacionDuplicada: 'There is already a pending invitation for that email',
    faltaDominio: 'The invitation cannot be sent: the app domain is not configured.',
    errorEnviandoEmail: 'Error sending the invitation email',
    noSeBorroCuenta: 'The account could not be deleted',
    nombraOtroAdmin: 'Before deleting your account, make someone else in the family an admin.',
    noSeConsultoSuscripcion: 'The subscription could not be checked',
    suscripcionInvalida: 'Invalid subscription',
    noSeGuardoSuscripcion: 'The subscription could not be saved',
    faltaEndpoint: 'Missing endpoint',
    noSeBorroSuscripcion: 'The subscription could not be deleted',
  },
}
