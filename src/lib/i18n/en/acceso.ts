import type { acceso as es } from '../es/acceso'

export const acceso: typeof es = {
  tarjeta: {
    tituloRegistro: 'Create your account',
    tituloEntrar: 'Sign in to Farpi',
    subtituloRegistro: 'Private, and made for a family’s everyday life.',
    subtituloEntrar: 'Open your family’s private space.',

    modoLocal: 'Local mode on',
    modoLocalExplicacion: 'Set up Supabase to turn on real accounts, invitations and sync.',

    pestanaEntrar: 'Sign in',
    pestanaRegistro: 'Sign up',
    continuarConGoogle: 'Continue with Google',
    o: 'or',

    tuNombre: 'Your name',
    tuNombrePlaceholder: 'First and last name',
    correo: 'Email',
    correoPlaceholder: 'you@email.com',
    contrasena: 'Password',
    contrasenaPlaceholder: 'At least 8 characters',
    minimoOchoCaracteres: 'At least 8 characters.',
    mostrarContrasena: 'Show password',
    ocultarContrasena: 'Hide password',
    repiteContrasena: 'Repeat the password',
    repiteContrasenaPlaceholder: 'Same password',
    contrasenasNoCoinciden: 'The passwords do not match.',

    unMomento: 'One moment',
    crearCuenta: 'Create account',
    entrar: 'Sign in',
    recuperarContrasena: 'Forgot your password?',

    escribeTuCorreo: 'Enter your email.',
    escribeTuCorreoPrimero: 'Enter your email first.',
    escribeTuNombre: 'Enter your name.',
    revisaTuCorreo: 'Check your email. We have sent you a link to confirm your account.',
    enlaceDeRecuperacion: 'We have sent you a link to reset your password.',

    errores: {
      credenciales: 'Wrong email or password.',
      sinConfirmar: 'Confirm your email with the link we sent you.',
      contrasenaCorta: 'The password must be at least 8 characters long.',
      yaRegistrado: 'That email already has an account. Try signing in instead.',
    },
  },

  garantias: {
    privado: 'Private to your family',
    gratis: 'Free',
    sinAnuncios: 'No ads',
  },

  hero: {
    lemaDeMarca: 'Family life, calmly',
    // El mismo lema que `metadatos.lema`, como titular.
    titular: 'What we need to know at home today',
    parrafo:
      'is your family’s private space: everyone sees the same thing without having to ask, and what needs remembering stops living in one person’s head.',
  },

  callback: {
    invitacionCaducada: 'The invitation has expired. Ask for a new one.',
    invitacionCancelada: 'The invitation was cancelled. Ask for a new one.',
    invitacionFallida: 'The invitation could not be accepted. Ask whoever invited you to send it again.',
    sesionFallida: 'Could not sign you in from the link.',
    enlaceCaducado: 'The link has expired or was already used. Ask for a new one to continue.',
    enlaceInvalido: 'The link could not be validated. Ask for a new one to continue.',

    noHasEntrado: 'You have not joined the family',
    seguirAFarpi: 'Continue to Farpi',
    noHemosPodidoAbrir: 'We could not open the link',
    irAIniciarSesion: 'Go to sign in',
    vasAEntrarComo: 'You are about to sign in to Farpi as',
    siNoEsTuCorreo: 'If this is not your email, stop here: this link belongs to someone else.',
    entrando: 'Signing in…',
    entrar: 'Sign in',
    noSoyYo: 'That is not me',
    entrandoEnFarpi: 'Signing in to Farpi',
    validandoEnlace: 'Checking the link…',
  },

  onboarding: {
    titulo: 'Set up your family',
    explicacion:
      'Create your household’s private space. If you have been invited, open the link in the email to join directly.',
    nombreDeLaFamilia: 'Family name',
    placeholder: 'E.g. The Garcias',
    creando: 'Creating',
    crearMiFamilia: 'Create my family',
    errorAlCrear: 'Could not create the family',
  },

  offline: {
    titulo: 'Offline',
    texto: 'There is no internet right now. Farpi will be back as soon as you are connected again.',
  },

  noDisponible: {
    titulo: 'Farpi is unavailable',
    texto:
      'The service where your data is stored is not responding right now. Nothing has been lost: as soon as it is back, everything will be where you left it.',
    reintentar: 'Try again',
  },
}
