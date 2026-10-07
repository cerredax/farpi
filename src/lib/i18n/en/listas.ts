import type { listas as es } from '../es/listas'

export const listas: typeof es = {
  fila: {
    apuntarQueHaceFalta: (texto: string) => `Mark ${texto} as needed`,
    yaTeneis: (texto: string) => `You have ${texto}, remove from what's needed`,
    quitarUnidad: (texto: string) => `One less ${texto}`,
    anadirUnidad: (texto: string) => `One more ${texto}`,
    abrirLista: (nombre: string) => `Open ${nombre}`,
  },

  vista: {
    resumen: (n: number) => (n === 1 ? '1 family list' : `${n} family lists`),
    buscarEnTodas: (n: number) => (n === 1 ? 'Search 1 item…' : `Search ${n} items…`),
    buscarEnTodasAria: 'Search items in all lists',
    nuevaLista: 'New list',
    sinCoincidencias: 'No matches',
    ningunItem: (busqueda: string) => `No item matches “${busqueda}”`,
    resultados: (n: number) => (n === 1 ? '1 result' : `${n} results`),
    sinListas: 'No lists yet',
  },

  tarjeta: {
    alDia: 'All set',
    haceFalta: (cosas: string) => `Needed: ${cosas}`,
  },

  detalle: {
    volver: 'Back to lists',
    compartir: (nombre: string) => `Share what's needed from ${nombre}`,
    editarLista: (nombre: string) => `Edit the list ${nombre}`,
    buscarEn: (n: number) => (n === 1 ? 'Search 1 item…' : `Search ${n} items…`),
    buscarAria: 'Search items in the list',
    vacia: 'This list is empty',
    sinCoincidencias: 'No matches',
    ningunItem: (busqueda: string) => `No item matches “${busqueda}”`,
    haceFaltaAhora: 'Needed now',
    noFaltaNada: 'Nothing needed from this list',
    // «Lo de siempre»: lo que la casa suele comprar y ahora no hace falta.
    loDeSiempre: 'The usual',
    ocultarLoDeSiempre: 'Hide the usual',
    verLoDeSiempre: 'Show the usual',
    coincidencias: 'Matches',
    apuntarAlgo: 'Add something…',
    apuntarAlgoEn: (nombre: string) => `Add something to ${nombre}`,
    apuntarEn: (nombre: string) => `Add to ${nombre}`,
  },

  itemSheet: {
    anadirItem: 'Add item',
    editarItem: 'Edit item',
    anadir: 'Add',
    guardar: 'Save',
    eliminarItem: 'Delete item',
    confirmar: 'Confirm',
    item: 'Item',
    ejemplo: 'E.g. Whole milk',
    coincidencias: 'Matches',
    losQueMasApuntais: 'Your most added',
    moverAOtraLista: 'Move to another list',
  },

  dictado: {
    seAnadiran: (n: number, lista: string | null) =>
      lista ? `${n} will be added to "${lista}":` : `${n} will be added:`,
    anadirN: (n: number) => `Add ${n}`,
    descartar: 'Discard',
  },

  listSheet: {
    eliminarLista: 'Delete list',
    nuevaLista: 'New list',
    editarLista: 'Edit list',
    siEliminar: 'Yes, delete the list',
    crearLista: 'Create list',
    guardar: 'Save',
    seBorraLaLista: 'The list ',
    nombreEntreComillas: (nombre: string) => `“${nombre}”`,
    noSePuedeDeshacer: ' will be deleted. This cannot be undone.',
    conElla: (n: number) =>
      n === 1
        ? 'Its one item goes with it, both what is needed now and the usual.'
        : `Its ${n} items go with it, both what is needed now and the usual.`,
    nombre: 'Name',
    ejemplo: 'E.g. Weekend shopping',
    icono: 'Icon',
  },

  moverItem: {
    mover: (texto: string) => `Move “${texto}”`,
    moverItem: 'Move item',
    cancelar: 'Cancel',
    sinDestino: 'There is no other list to move it to. Create one from the lists screen.',
  },
}
