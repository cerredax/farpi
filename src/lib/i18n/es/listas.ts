/** Listas: la pantalla de todas, una lista abierta y sus sheets. */
export const listas = {
  /** Lo que se dice de un ítem en su fila, en la lista y en la búsqueda que cruza todas. */
  fila: {
    apuntarQueHaceFalta: (texto: string) => `Apuntar que hace falta ${texto}`,
    yaTeneis: (texto: string) => `Ya tenéis ${texto}, quitar de lo que falta`,
    quitarUnidad: (texto: string) => `Quitar una unidad de ${texto}`,
    anadirUnidad: (texto: string) => `Añadir una unidad de ${texto}`,
    abrirLista: (nombre: string) => `Abrir ${nombre}`,
  },

  vista: {
    resumen: (n: number) => (n === 1 ? '1 lista de la familia' : `${n} listas de la familia`),
    // Corto a propósito: en un móvil de 390 px, junto al `+`, «…de todas las listas»
    // se cortaba a media palabra. Que busca en todas lo dice el `aria-label`.
    buscarEnTodas: (n: number) => (n === 1 ? 'Buscar en 1 ítem…' : `Buscar en ${n} ítems…`),
    buscarEnTodasAria: 'Buscar ítems en todas las listas',
    nuevaLista: 'Nueva lista',
    sinCoincidencias: 'Sin coincidencias',
    ningunItem: (busqueda: string) => `Ningún ítem coincide con «${busqueda}»`,
    resultados: (n: number) => (n === 1 ? '1 resultado' : `${n} resultados`),
    sinListas: 'Sin listas todavía',
  },

  /** La tarjeta de una lista: lo que falta adelantado, o que está al día. */
  tarjeta: {
    alDia: 'Al día',
    /** `cosas` llega ya unido: «leche, pan, huevos…». */
    haceFalta: (cosas: string) => `Hace falta: ${cosas}`,
  },

  detalle: {
    volver: 'Volver a las listas',
    compartir: (nombre: string) => `Compartir lo que falta de ${nombre}`,
    editarLista: (nombre: string) => `Editar la lista ${nombre}`,
    buscarEn: (n: number) => (n === 1 ? 'Buscar en 1 ítem…' : `Buscar en ${n} ítems…`),
    buscarAria: 'Buscar ítems en la lista',
    vacia: 'Esta lista está vacía',
    sinCoincidencias: 'Sin coincidencias',
    ningunItem: (busqueda: string) => `Ningún ítem coincide con «${busqueda}»`,
    haceFaltaAhora: 'Hace falta ahora',
    noFaltaNada: 'No falta nada de esta lista',
    loDeSiempre: 'Lo de siempre',
    ocultarLoDeSiempre: 'Ocultar lo de siempre',
    verLoDeSiempre: 'Ver lo de siempre',
    coincidencias: 'Coincidencias',
    apuntarAlgo: 'Apuntar algo…',
    apuntarAlgoEn: (nombre: string) => `Apuntar algo en ${nombre}`,
    apuntarEn: (nombre: string) => `Apuntar en ${nombre}`,
  },

  itemSheet: {
    anadirItem: 'Añadir ítem',
    editarItem: 'Editar ítem',
    anadir: 'Añadir',
    guardar: 'Guardar',
    eliminarItem: 'Eliminar ítem',
    confirmar: 'Confirmar',
    item: 'Ítem',
    ejemplo: 'Ej: Leche entera',
    coincidencias: 'Coincidencias',
    losQueMasApuntais: 'Los que más apuntáis',
    moverAOtraLista: 'Mover a otra lista',
  },

  /** Lo dictado, antes de guardarlo: qué se va a añadir y a qué lista. */
  dictado: {
    seAnadiran: (n: number, lista: string | null) =>
      lista ? `Se añadirán ${n} a «${lista}»:` : `Se añadirán ${n}:`,
    anadirN: (n: number) => `Añadir ${n}`,
    descartar: 'Descartar',
  },

  listSheet: {
    eliminarLista: 'Eliminar lista',
    nuevaLista: 'Nueva lista',
    editarLista: 'Editar lista',
    siEliminar: 'Sí, eliminar la lista',
    crearLista: 'Crear lista',
    guardar: 'Guardar',
    /** La frase va partida por el nombre, que sale en negrita: antes, el nombre y después. */
    seBorraLaLista: 'Se borra la lista ',
    nombreEntreComillas: (nombre: string) => `«${nombre}»`,
    noSePuedeDeshacer: '. No se puede deshacer.',
    conElla: (n: number) =>
      n === 1
        ? 'Con ella se va el ítem que tiene apuntado, tanto lo que hace falta ahora como lo de siempre.'
        : `Con ella se van sus ${n} ítems, tanto lo que hace falta ahora como lo de siempre.`,
    nombre: 'Nombre',
    ejemplo: 'Ej: Compra del fin de semana',
    icono: 'Icono',
  },

  moverItem: {
    mover: (texto: string) => `Mover «${texto}»`,
    moverItem: 'Mover ítem',
    cancelar: 'Cancelar',
    sinDestino: 'No hay otra lista a la que moverlo. Crea una desde la pantalla de listas.',
  },
}
