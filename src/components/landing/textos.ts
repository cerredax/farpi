/**
 * Los textos de la portada, fuera del JSX (28-09-2026).
 *
 * Salieron del componente para que la portada se pueda traducir **sin tocar la
 * maqueta**: `LandingPage` recibe uno de estos objetos y pinta lo que diga, y la
 * versión en inglés será otro objeto con la misma forma. `TextosPortada` es el
 * contrato, así que TypeScript no deja compilar una traducción a la que le
 * falte una frase. Qué más hace falta para abrir `/en`, en
 * `docs/architecture.md`, sección «La portada en otro idioma».
 *
 * Aquí solo van **textos**. Qué capturas se enseñan y en qué orden es maqueta y
 * se queda en el componente.
 *
 * Las reglas de siempre siguen valiendo, y alguna la vigila
 * `e2e/unit/portada-textos.spec.ts`: ni un guion largo, se dice «casa» y no
 * «hogar», y **los títulos no llevan punto final**. El nombre de la app se
 * escribe tal cual, «Farpi»: el componente lo reconoce dentro de cualquier frase
 * y lo marca solo.
 *
 * Y una que no vigila nadie: **lo que se dice de una captura es lo que se ve en
 * ella**. Las notas nombran el pediatra de las 10:30 y la vitamina de Cris, no
 * "gestiona tus citas". Si se regeneran las capturas y cambia lo que enseñan,
 * cambian las notas.
 */

type Texto = { titulo: string; texto: string }

export type TextosPortada = {
  /**
   * El `lang` de la página. `<html lang="es">` lo fija el layout raíz para toda
   * la app, así que la portada lo repite en su envoltorio: es lo que usa un
   * lector de pantalla para elegir la voz, y lo que hace que `/en` no se lea
   * con pronunciación castellana.
   */
  idioma: string
  /** El nombre accesible del logo de la barra, que lleva a la portada. */
  irAlInicio: string
  titular: string
  entradilla: string
  proximamentePlay: string
  /** El texto de Omar, contado como un reportaje: su primera frase en grande y el resto en columna. */
  historia: {
    frase: string
    autor: string
    parrafos: string[]
    /** Va delante del correo de contacto, que el componente pone como enlace. */
    sugerencias: string
  }
  capturas: {
    titulo: string
    entradilla: string
    /** La de Inicio, en grande y con una nota por cada parte de la pantalla. */
    inicio: { alt: string; notas: Texto[] }
    listas: Texto & { alt: string }
    calendario: Texto & { alt: string }
    /** Lo que la app lleva y las capturas no enseñan. */
    ademas: string
  }
  preguntas: {
    titulo: string
    lista: { pregunta: string; respuesta: string }[]
  }
  pie: {
    autor: string
    privacidad: string
    terminos: string
    borrarCuenta: string
  }
}

export const PORTADA_ES: TextosPortada = {
  idioma: 'es',
  irAlInicio: 'Farpi, inicio',
  // El titular es también el lema de la marca: está en las metaetiquetas, en el
  // aviso de las siete, en `gen-capturas.mjs` y en los papeles. Cambiarlo aquí no
  // es cambiar un texto. Y va igual en `LoginHero`: si se toca uno, el otro.
  titular: 'Qué tenemos que saber hoy en casa',
  entradilla:
    'Farpi es el espacio privado de tu familia: todos veis lo mismo sin tener que preguntar, y lo que hay que recordar deja de estar en la cabeza de uno solo.',
  proximamentePlay: 'Próximamente en Google Play',
  /**
   * El texto de Omar, y el único sitio de la página donde no habla la app.
   *
   * **Lo escribió él.** Las dos versiones anteriores se redactaron a partir de lo
   * que contó y las dos sonaban a folleto, cada una a su manera: la primera
   * demasiado redonda, la segunda demasiado cortada, a frases de tres palabras
   * que piden aplauso. La buena salió cuando la dictó él y la edición se limitó a
   * la ortografía, dos concordancias y partir una frase que se trababa.
   *
   * Así que aquí no se "mejora la redacción". Si algún día hay que cambiar algo,
   * se le pregunta a él y se vuelve a tocar lo mínimo: lo que hace que esto no
   * parezca escrito por una máquina es justo lo que un corrector querría
   * arreglar. **Y lo mismo vale para traducirlo**: la versión en inglés la tiene
   * que dar por buena él, no basta con que esté bien traducida.
   *
   * Hasta el 28-09-2026 se presentaba como una carta —título «Por qué existe
   * Farpi», la frase de las discusiones sacada aparte en grande, fondo cálido y
   * firma—, y a unos amigos les pareció hecha con IA. No eran las palabras: era
   * el disfraz de «carta del fundador», que es lo que sale en cualquier
   * plantilla. Ahora va como un reportaje, sin caja ni firma, y el texto es el
   * mismo. Solo cambian dos cosas: la primera frase se separa para ir en grande,
   * y por eso pierde el punto, que es un título; y la de las discusiones vuelve a
   * su sitio en la lista de párrafos, que es donde la escribió.
   */
  historia: {
    frase: 'Desde que nació mi hija creo que perdí memoria',
    autor: 'Omar García Carballo, septiembre de 2026',
    parrafos: [
      'Eso, unido a la cantidad de cosas pequeñas que hay que tener presentes cada día y al cambio que supone un hijo en tu vida, me hizo sentir que necesitaba un poco de organización: que ya no valía lo de antes.',
      'Lo que pretendía era tener un sitio de familia donde los dos viéramos lo mismo sin tener que preguntárnoslo. Así surgió este proyecto personal, que se llama Farpi en honor a un juego de palabras con los apellidos de mi hija.',
      'Esta aplicación está hecha para que no se nos pase nada, y también para evitar discusiones tontas por los despistes.',
      'La publico porque considero que, si a mí me es útil, puede serlo para los demás. Si es de vuestro agrado, bienvenidos sois a uniros. Se trata de hacer el día un poco más fácil, no tiene más.',
    ],
    sugerencias: 'Cualquier sugerencia es bienvenida:',
  },
  capturas: {
    titulo: 'Lo que ves al abrirla',
    entradilla: 'Son pantallas de la app de verdad, con la familia de ejemplo que trae.',
    // `alt` empieza por «Pantalla de Inicio»: `e2e/smoke.spec.ts` la busca así.
    inicio: {
      alt: 'Pantalla de Inicio en Farpi, con las citas, las tareas y las comidas de hoy',
      notas: [
        {
          titulo: 'Lo que hay apuntado hoy',
          texto: 'El pediatra a las diez y media y la reunión de vecinos a las seis y media, sin abrir el calendario.',
        },
        {
          titulo: 'Lo que falta por hacer',
          texto: 'Darle la vitamina a Cris y escanear el contrato de la luz. Quien lo hace, lo marca, y los demás ya no tienen que preguntar.',
        },
        {
          titulo: 'Qué se come',
          texto: 'El desayuno, la comida y la cena de hoy, y lo que le ponen en el comedor.',
        },
      ],
    },
    listas: {
      titulo: 'La compra',
      texto: 'Cada lista dice lo que falta: en la compra, el café y la leche; en la farmacia, el suero. Lo que apunta uno les sale a los demás.',
      alt: 'Pantalla de Listas en Farpi, con lo que falta en cada lista',
    },
    calendario: {
      titulo: 'El mes',
      texto: 'Un punto en cada día que tiene algo. Tocas uno y debajo sale lo de ese día, con quién va.',
      alt: 'Pantalla del mes en Farpi, con el 17 de junio marcado y sus planes debajo',
    },
    ademas:
      'Además lleva las comidas de la semana, el dinero del mes, las notas de casa y los documentos, que se quedan en vuestro propio Google Drive.',
  },
  preguntas: {
    titulo: 'Antes de apuntaros',
    // Contestan como una persona, y solo a lo que se pregunta de verdad. La mejor
    // fuente son las que le hacen a Omar quienes la ven por primera vez.
    lista: [
      {
        pregunta: '¿Quién ve lo que apuntamos?',
        respuesta:
          'Vosotros y nadie más. Todo lo que se guarda queda atado a vuestra familia, y el servidor no lo deja salir de ahí. Farpi no es un sitio donde publicar nada.',
      },
      {
        pregunta: '¿Cuántos podemos ser?',
        respuesta:
          'Los que seáis. Los dos, o los dos y los abuelos. Le mandas un correo a cada uno y quien entra ve y apunta lo mismo que el resto, desde el primer día.',
      },
      {
        pregunta: '¿Hay que instalar algo?',
        respuesta:
          'No. Farpi se abre en el navegador y va igual en el móvil, en la tablet y en el ordenador, con la misma cuenta y lo mismo apuntado en los tres. Si te apetece, en el móvil la añades a la pantalla de inicio y se comporta como una app más.',
      },
      {
        pregunta: '¿Dónde acaban mis documentos?',
        respuesta:
          'En tu propio Google Drive, no en un cajón nuestro. Farpi guarda solo la ficha (qué es, de quién es, cuándo caduca) y se la enseña a tu familia.',
      },
      {
        pregunta: '¿Me avisa de las cosas?',
        respuesta:
          'Solo si tú quieres. Lo enciendes en Ajustes y te llega un aviso al móvil con lo que toca ese día. Si no lo enciendes, Farpi no te dice nada.',
      },
      // Lo que dice tiene que ser lo que hay: la copia es `BackupCard` y el
      // borrado `DeleteAccountCard`, los dos en Ajustes → Cuenta. Quien ya no
      // puede entrar tiene «Borrar la cuenta» en el pie.
      {
        pregunta: '¿Y si un día queremos irnos?',
        respuesta:
          'Os lo lleváis todo. En Ajustes, en Cuenta, descargáis una copia de todo lo que tiene apuntado la familia, y ahí mismo se borra la cuenta.',
      },
    ],
  },
  pie: {
    autor: 'Un proyecto personal de Omar García Carballo.',
    privacidad: 'Privacidad',
    terminos: 'Términos',
    borrarCuenta: 'Borrar la cuenta',
  },
}
