/** Comidas: el menú de hoy, la semana (lista en móvil, rejilla en escritorio) y sus sheets. */
export const comidas = {
  /** Patrones de `date-fns`: el orden y las palabras de una fecha también son del idioma. */
  formatos: {
    diaYMes: "d 'de' MMMM",
    diaMesYAno: "d 'de' MMMM yyyy",
    diaCorto: 'd MMM',
    diaDeLaSemana: "EEEE d 'de' MMMM",
    /** La cabecera de cada día en la semana en vertical. */
    diaDeLista: 'EEEE d',
    /** La cabecera de cada columna de la rejilla. */
    semanaCorta: 'EEE',
    mes: 'MMMM',
  },

  vista: {
    resumen: 'Menú de la familia',
    anadirComida: 'Añadir comida',
    hoy: 'Hoy',
    estaSemana: 'Esta semana',
    sinMenuHoy: 'Sin menú para hoy',
    anadirComidaDeHoy: 'Añadir comida de hoy',
    vistaSemanal: 'Vista semanal',
    semanaAnterior: 'Semana anterior',
    semanaSiguiente: 'Semana siguiente',
    /** Las fechas llegan ya escritas con `formatos`. */
    rangoMovil: (desde: string, hasta: string) => `${desde} - ${hasta}`,
    rangoEscritorio: (desde: string, hasta: string) => `${desde} – ${hasta}`,
  },

  /** Lo que comparten la rejilla y la lista de la semana. */
  semana: {
    franja: 'Franja',
    hoy: 'Hoy',
    copiar: 'Copiar',
    anadir: 'Añadir',
    copiarMenuDel: (fecha: string) => `Copiar menú del ${fecha}`,
    anadirPara: (franja: string, fecha: string) => `Añadir ${franja.toLowerCase()} para ${fecha}`,
    editarDel: (franja: string, fecha: string) => `Editar ${franja.toLowerCase()} del ${fecha}`,
  },

  fila: {
    editar: (plato: string) => `Editar ${plato}`,
  },

  mealSheet: {
    anadirComida: 'Añadir comida',
    editarComida: 'Editar comida',
    guardarComida: 'Guardar comida',
    guardarCambios: 'Guardar cambios',
    eliminarComida: 'Eliminar comida',
    confirmarEliminacion: 'Confirmar eliminación',
    fecha: 'Fecha',
    franja: 'Franja',
    yaTienePlato: 'Este horario ya tiene plato (se reemplazará)',
    primerPlato: 'Primer plato',
    plato: 'Plato',
    buscaUnPlato: 'Busca un plato o escribe uno nuevo',
    yaLoHabeisHecho: (n: number) => `Ya lo habéis hecho (${n})`,
    losQueMasRepetis: 'Los que más repetís',
    platoNuevo: 'Plato nuevo: no lo habíais apuntado nunca.',
    segundoPlato: 'Segundo plato',
    postre: 'Postre',
    notas: 'Notas',
    opcional: '(opcional)',
    ejemploSegundo: 'Ej: Filete de pollo con ensalada',
    ejemploPostre: 'Ej: Fruta del tiempo',
    ejemploNotas: 'Ej: Sin cebolla',
  },

  copiarSheet: {
    titulo: 'Copiar menú',
    copiarMenu: 'Copiar menú',
    copiarYRepetir: 'Copiar y repetir menú',
    menuOrigen: 'Menú origen',
    sinComidas: 'Este día no tiene comidas para copiar.',
    copiarAlDia: 'Copiar al día',
    seSustituira: 'Si ese día ya tenía menú, se sustituirá por este.',
    repetirCadaDia: 'Repetir este menú cada día',
    ideal: 'Ideal para repetir una semana tipo hasta la fecha que elijas.',
    fechaFin: 'Fecha fin',
    fechaFinAnterior: 'La fecha fin no puede ser anterior al día destino.',
  },
}
