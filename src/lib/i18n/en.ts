import type { Diccionario } from './es'
import { ajustes } from './en/ajustes'
import { comun } from './en/comun'
import { inicio } from './en/inicio'
import { cumpleanos } from './en/cumpleanos'
import { notas } from './en/notas'
import { calendario } from './en/calendario'
import { finanzas } from './en/finanzas'
import { listas } from './en/listas'
import { comidas } from './en/comidas'
import { tareas } from './en/tareas'
import { documentos } from './en/documentos'
import { acceso } from './en/acceso'

/**
 * Los textos de la app en inglés (28-09-2026).
 *
 * Tiene la forma de `es.ts` y ni una frase más ni una menos: el tipo lo obliga.
 * Cubre el mismo tramo que el castellano, así que con este idioma activo el
 * resto de pantallas sale todavía en castellano. Por eso no se ofrece en Ajustes
 * (`IDIOMAS_OFRECIDOS`): se prueba escribiendo la cookie `farpi_idioma=en`.
 *
 * Inglés sin marca de país a propósito, y el nombre de la app no se traduce.
 */
export const en: Diccionario = {
  secciones: {
    inicio: 'Home',
    calendario: 'Calendar',
    listas: 'Lists',
    tareas: 'Tasks',
    comidas: 'Meals',
    finanzas: 'Finances',
    notas: 'Notes',
    cumpleanos: 'Birthdays',
    documentos: 'Documents',
    ajustes: 'Settings',
  },

  navegacion: {
    secciones: 'Sections',
    mas: 'More',
    cerrarSesion: 'Sign out',
    miCuenta: 'My account',
  },

  guardado: {
    noSeHaGuardado: 'Your change was not saved',
    cerrarAviso: 'Close notice',
    guardando: 'Saving…',
    deshacer: 'Undo',
    guardado: 'Saved',
  },

  arranque: {
    cargando: 'Loading Farpi',
    noSePudoCargar: 'Farpi could not load',
    noSePudoResolverFamilia: 'Your family could not be found',
    noSePudoCargarLaFamilia: 'Your family could not be loaded',
    revisaLaSesion: 'Check your session or the Supabase configuration.',
  },

  ajustes,
  comun,
  inicio,
  cumpleanos,
  notas,
  calendario,
  finanzas,
  listas,
  comidas,
  tareas,
  documentos,
  acceso,

  metadatos: {
    lema: 'what we need to know at home today',
    descripcion:
      'Your family’s private space: calendar, tasks, lists, meals, spending and the important papers, all in one place.',
    altImagen: 'Farpi, the home screen showing a family’s day (in Spanish)',
    locale: 'en_GB',
  },

  validacion: {
    documentoTipo: 'Only PDF, JPG or PNG files are allowed.',
    documentoTamano: 'The file is larger than the 20 MB limit.',
    familiaSinNombre: 'The family name cannot be empty.',
    adultoSinNombre: 'The adult’s name cannot be empty.',
    hijoSinNombre: 'The child’s name cannot be empty.',
    fechaObligatoria: 'The date is required.',
    platoSinNombre: 'The dish name cannot be empty.',
    tituloObligatorio: 'The title is required.',
    cumpleSinNombre: 'Say whose birthday it is.',
    añoDeNacimiento: 'The year of birth does not look right.',
    fechaFinal: 'The end date must be the same as or after the start date.',
    horaDeInicioPrimero: 'Set the start time first.',
    avisoSinHora: 'Set a start time so the reminder knows when to arrive.',
    horaDeFin: 'The end time must be after the start time.',
    finDeRecurrencia: 'The repeat end date must be after the start date.',
    listaSinNombre: 'The list name cannot be empty.',
    textoObligatorio: 'The text is required.',
    notaSinTitulo: 'The note title cannot be empty.',
    ingresoSinNombre: 'Say what the income is for.',
    gastoSinNombre: 'Say what the expense is for.',
    partidaSinNombre: 'The budget category needs a name.',
    presupuestoSinTitulo: 'Say what the quote is for.',
    presupuestoSinProveedor: 'Say who gave it to you.',
    faltaImporte: {
      fijo: 'Enter how much it is per month.',
      ajusteDelMes: 'Enter how much it was this month.',
      partida: 'Enter how much can be spent per month.',
      gasto: 'Enter how much it was.',
      presupuesto: 'Enter how much it costs.',
    },
    importeIncorrecto: 'The amount does not look right. Try something like 24.90.',
    importeMaximo: (maximo: string) => `${maximo} at most.`,
  },

  errores: {
    generico: 'It could not be saved. Please try again in a moment.',
    permiso: 'You do not have permission to make that change. In the family, inviting people and changing settings is up to an admin.',
    sesion: 'Your session has expired. Sign in to Farpi again and try once more.',
    conexion: 'Farpi cannot be reached. Check your internet connection and try again.',
    duplicado: 'That was already saved.',
    enlazado: 'It could not be saved: something it is linked to no longer exists.',
    obligatorio: 'Some required information is missing.',
    noVale: 'Some of the information is not valid. Check it and try again.',
    demasiadoLargo: 'Some of the text is too long.',
    accesoDenegado: 'You do not have permission to do that. In the family, inviting people and changing settings is up to an admin.',
  },
}
