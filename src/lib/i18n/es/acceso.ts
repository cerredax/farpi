/** Entrar a Farpi: el formulario, la presentación del login, el onboarding y las páginas de apoyo. */
export const acceso = {
  /** `components/auth/AuthCard.tsx`: lo monta el login y también la portada. */
  tarjeta: {
    tituloRegistro: 'Crea tu cuenta',
    tituloEntrar: 'Entra a Farpi',
    subtituloRegistro: 'Privado y pensado para el día a día de una familia.',
    subtituloEntrar: 'Accede a tu espacio familiar privado.',

    modoLocal: 'Modo local activo',
    modoLocalExplicacion: 'Configura Supabase para activar cuentas reales, invitaciones y sincronización.',

    pestanaEntrar: 'Entrar',
    pestanaRegistro: 'Crear cuenta',
    continuarConGoogle: 'Continuar con Google',
    /** El separador entre Google y el correo. */
    o: 'o',

    tuNombre: 'Tu nombre',
    tuNombrePlaceholder: 'Nombre y apellido',
    correo: 'Correo electrónico',
    correoPlaceholder: 'tu@email.com',
    contrasena: 'Contraseña',
    contrasenaPlaceholder: 'Mínimo 8 caracteres',
    minimoOchoCaracteres: 'Mínimo 8 caracteres.',
    mostrarContrasena: 'Mostrar contraseña',
    ocultarContrasena: 'Ocultar contraseña',
    repiteContrasena: 'Repite la contraseña',
    repiteContrasenaPlaceholder: 'Misma contraseña',
    contrasenasNoCoinciden: 'Las contraseñas no coinciden.',

    unMomento: 'Un momento',
    crearCuenta: 'Crear cuenta',
    entrar: 'Entrar',
    recuperarContrasena: 'Recuperar contraseña',

    escribeTuCorreo: 'Escribe tu correo.',
    escribeTuCorreoPrimero: 'Escribe tu correo primero.',
    escribeTuNombre: 'Escribe tu nombre.',
    revisaTuCorreo: 'Revisa tu correo. Te hemos enviado un enlace para confirmar la cuenta.',
    enlaceDeRecuperacion: 'Te hemos enviado un enlace para recuperar la contraseña.',

    /** Los errores de Supabase Auth, que llegan en inglés, dichos a nuestra manera. */
    errores: {
      credenciales: 'Correo o contraseña incorrectos.',
      sinConfirmar: 'Confirma tu correo desde el enlace que te hemos enviado.',
      contrasenaCorta: 'La contraseña debe tener al menos 8 caracteres.',
      yaRegistrado: 'Ese correo ya tiene cuenta. Prueba a entrar directamente.',
    },
  },

  /** `components/ui/Garantias.tsx`: lo que pregunta quien llega de fuera. */
  garantias: {
    privado: 'Privado para tu familia',
    gratis: 'Gratis',
    sinAnuncios: 'Sin anuncios',
  },

  /** `app/auth/login/LoginHero.tsx`. El titular es el de la portada, que es el lema de la marca. */
  hero: {
    lemaDeMarca: 'Familia en calma',
    titular: 'Qué tenemos que saber hoy en casa',
    /** Va detrás de «Farpi», que se pinta en negrita y no se traduce. */
    parrafo:
      'es el espacio privado de tu familia: todos veis lo mismo sin tener que preguntar, y lo que hay que recordar deja de estar en la cabeza de uno solo.',
  },

  /** `app/auth/callback/page.tsx`: donde aterrizan los enlaces de los correos. */
  callback: {
    invitacionCaducada: 'La invitación ha caducado. Pide que te la manden otra vez.',
    invitacionCancelada: 'La invitación se canceló. Pide que te manden otra.',
    invitacionFallida: 'No se ha podido aceptar la invitación. Pide a quien te invitó que te la mande otra vez.',
    sesionFallida: 'No se ha podido iniciar la sesión desde el enlace.',
    enlaceCaducado: 'El enlace ha caducado o ya se había usado. Pide uno nuevo para continuar.',
    enlaceInvalido: 'No se ha podido validar el enlace. Pide uno nuevo para continuar.',

    noHasEntrado: 'No has entrado en la familia',
    seguirAFarpi: 'Seguir a Farpi',
    noHemosPodidoAbrir: 'No hemos podido abrir el enlace',
    irAIniciarSesion: 'Ir a iniciar sesión',
    vasAEntrarComo: 'Vas a entrar en Farpi como',
    siNoEsTuCorreo: 'Si no es tu correo, no sigas: este enlace es de otra persona.',
    entrando: 'Entrando…',
    entrar: 'Entrar',
    noSoyYo: 'No soy yo',
    entrandoEnFarpi: 'Entrando en Farpi',
    validandoEnlace: 'Validando el enlace…',
  },

  onboarding: {
    titulo: 'Configura tu familia',
    explicacion:
      'Crea el espacio privado de tu casa. Si te han invitado, entra desde el enlace del email para unirte directamente.',
    nombreDeLaFamilia: 'Nombre de la familia',
    placeholder: 'Ej: Familia Garcia',
    creando: 'Creando',
    crearMiFamilia: 'Crear mi familia',
    errorAlCrear: 'No se pudo crear la familia',
  },

  offline: {
    titulo: 'Sin conexión',
    texto: 'No hay internet ahora mismo. Farpi volverá en cuanto recuperes la conexión.',
  },

  noDisponible: {
    titulo: 'Farpi no está disponible',
    texto:
      'El servicio donde se guardan vuestros datos no responde ahora mismo. No se ha perdido nada: en cuanto vuelva, todo estará donde lo dejasteis.',
    reintentar: 'Volver a intentarlo',
  },
}
