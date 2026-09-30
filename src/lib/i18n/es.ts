/**
 * Los textos de la app en castellano (28-09-2026).
 *
 * **Este es el diccionario de referencia**: su forma es el contrato
 * (`Diccionario`), así que TypeScript no deja compilar una traducción a la que
 * le falte una frase. Un texto nuevo se añade aquí primero, y después a las
 * demás traducciones.
 *
 * Lo que es de toda la app vive aquí mismo (la navegación, el guardado, los
 * validadores, los errores). **Cada pantalla tiene su bloque en un archivo**
 * (`es/calendario.ts`, `es/finanzas.ts`…) con su pareja en `en/`, que se tipa
 * con el castellano del mismo bloque: así una pantalla se traduce abriendo dos
 * archivos y no uno de tres mil líneas. `es/comun.ts` es lo que comparten
 * varias: los rótulos de `constants.ts`, los componentes de `ui/` y los mensajes
 * de la capa de datos. Cómo se trae un texto, en `docs/architecture.md`, «La app
 * en otro idioma».
 *
 * Reglas para escribir aquí:
 *
 * - **Se agrupa por dónde se lee**, no por tipo de palabra: `ajustes.personas`
 *   y no `titulos.personas`. Así, traducir una pantalla es traducir un bloque.
 * - **Con número, una función** que devuelve la frase entera
 *   (`adultos: n => …`), nunca un trozo que se pega a otro. Cada idioma hace el
 *   plural a su manera, y en otros idiomas el número no va en el mismo sitio.
 * - **Sin HTML ni JSX dentro**: si una frase lleva un enlace, se parte en dos.
 * - La portada tiene su propio diccionario (`components/landing/textos.ts`):
 *   es una página pública con su propio ritmo y sus propias reglas.
 */
import { ajustes } from './es/ajustes'
import { comun } from './es/comun'
import { inicio } from './es/inicio'
import { cumpleanos } from './es/cumpleanos'
import { notas } from './es/notas'
import { calendario } from './es/calendario'
import { finanzas } from './es/finanzas'
import { listas } from './es/listas'
import { comidas } from './es/comidas'
import { tareas } from './es/tareas'
import { documentos } from './es/documentos'
import { acceso } from './es/acceso'

export const es = {
  /** Los nombres de cada pantalla: la barra de abajo, la columna de escritorio, la cabecera y "Más". */
  secciones: {
    inicio: 'Inicio',
    calendario: 'Calendario',
    listas: 'Listas',
    tareas: 'Tareas',
    comidas: 'Comidas',
    finanzas: 'Finanzas',
    notas: 'Notas',
    cumpleanos: 'Cumpleaños',
    documentos: 'Documentos',
    ajustes: 'Ajustes',
  },

  navegacion: {
    /** El nombre accesible de la columna de escritorio. */
    secciones: 'Secciones',
    mas: 'Más',
    cerrarSesion: 'Cerrar sesión',
    /** Lo que dice el pie de la columna mientras no se sabe quién eres. */
    miCuenta: 'Mi cuenta',
  },

  guardado: {
    noSeHaGuardado: 'No se ha guardado el cambio',
    cerrarAviso: 'Cerrar aviso',
    guardando: 'Guardando…',
    deshacer: 'Deshacer',
    guardado: 'Guardado',
  },

  arranque: {
    cargando: 'Cargando Farpi',
    noSePudoCargar: 'No se pudo cargar Farpi',
    noSePudoResolverFamilia: 'No se pudo resolver la familia activa',
    noSePudoCargarLaFamilia: 'No se pudo cargar la familia',
    revisaLaSesion: 'Revisa la sesión o la configuración de Supabase.',
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

  /**
   * Las etiquetas de la página (`generateMetadata` del layout raíz): la
   * descripción y la vista previa de un enlace. La portada y los papeles
   * legales ponen su propio título, en castellano como su contenido.
   */
  metadatos: {
    /** Va detrás de «Farpi — », que no se traduce (el guion largo es del título de siempre). */
    lema: 'qué tenemos que saber hoy en casa',
    descripcion:
      'El espacio privado de tu familia: agenda, tareas, listas, comidas, gastos y los papeles importantes, en un solo sitio.',
    altImagen: 'Farpi, la pantalla de inicio con el día de una familia',
    /** El formato de Open Graph, con guion bajo: `es_ES`, no `es-ES`. */
    locale: 'es_ES',
  },

  /** Lo que devuelven los validadores de `lib/validators.ts`, y por tanto lo que se lee al pulsar Guardar. */
  validacion: {
    documentoTipo: 'Solo se admiten PDF, JPG o PNG.',
    documentoTamano: 'El archivo supera el límite de 20 MB.',
    familiaSinNombre: 'El nombre de la familia no puede estar vacío.',
    adultoSinNombre: 'El nombre del adulto no puede estar vacío.',
    hijoSinNombre: 'El nombre del hijo no puede estar vacío.',
    fechaObligatoria: 'La fecha es obligatoria.',
    platoSinNombre: 'El nombre del plato no puede estar vacío.',
    tituloObligatorio: 'El título es obligatorio.',
    cumpleSinNombre: 'Pon de quién es el cumpleaños.',
    añoDeNacimiento: 'El año de nacimiento no parece correcto.',
    fechaFinal: 'La fecha final debe ser posterior o igual a la inicial.',
    horaDeInicioPrimero: 'Indica primero la hora de inicio.',
    avisoSinHora: 'Pon la hora de inicio para que el aviso sepa cuándo llegar.',
    horaDeFin: 'La hora de fin debe ser posterior a la de inicio.',
    finDeRecurrencia: 'La fecha de fin de recurrencia debe ser posterior a la fecha de inicio.',
    listaSinNombre: 'El nombre de la lista no puede estar vacío.',
    textoObligatorio: 'El texto es obligatorio.',
    notaSinTitulo: 'El título de la nota no puede estar vacío.',
    ingresoSinNombre: 'Di de qué es el ingreso.',
    gastoSinNombre: 'Di de qué es el gasto.',
    partidaSinNombre: 'La partida necesita un nombre.',
    presupuestoSinTitulo: 'Di para qué es el presupuesto.',
    presupuestoSinProveedor: 'Di quién te lo ha pasado.',
    /** Un importe vacío, dicho según lo que se está apuntando. */
    faltaImporte: {
      fijo: 'Pon cuánto es al mes.',
      ajusteDelMes: 'Pon cuánto ha sido este mes.',
      partida: 'Pon cuánto se puede gastar al mes.',
      gasto: 'Pon cuánto ha sido.',
      presupuesto: 'Pon cuánto cuesta.',
    },
    importeIncorrecto: 'El importe no parece correcto. Prueba con algo como 24,90.',
    /** `maximo` llega ya escrito como dinero ("1.000.000 €"). */
    importeMaximo: (maximo: string) => `Como mucho ${maximo}.`,
  },

  /** Los fallos de Supabase dichos para leerse en casa (`lib/errores.ts`). */
  errores: {
    generico: 'No se ha podido guardar. Inténtalo otra vez en un momento.',
    permiso: 'No tienes permiso para hacer ese cambio. En la familia, invitar y cambiar los ajustes es cosa de un administrador.',
    sesion: 'La sesión ha caducado. Vuelve a entrar en Farpi e inténtalo otra vez.',
    conexion: 'No hay conexión con Farpi. Comprueba internet e inténtalo otra vez.',
    duplicado: 'Eso ya estaba guardado.',
    enlazado: 'No se ha podido guardar: algo con lo que va enlazado ya no está.',
    obligatorio: 'Falta algún dato obligatorio.',
    noVale: 'Alguno de los datos no vale. Revísalo e inténtalo otra vez.',
    demasiadoLargo: 'Alguno de los textos es demasiado largo.',
    /** El `Acceso denegado: …` de las RPC, contado como lo cuenta la app. */
    accesoDenegado: 'No tienes permiso para hacer eso. En la familia, invitar y cambiar los ajustes es cosa de un administrador.',
  },
}

/** La forma que tiene que tener cualquier traducción: la del castellano. */
export type Diccionario = typeof es
