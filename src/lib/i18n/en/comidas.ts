import type { comidas as es } from '../es/comidas'

export const comidas: typeof es = {
  formatos: {
    diaYMes: 'd MMMM',
    diaMesYAno: 'd MMMM yyyy',
    diaCorto: 'd MMM',
    diaDeLaSemana: 'EEEE d MMMM',
    diaDeLista: 'EEEE d',
    semanaCorta: 'EEE',
    mes: 'MMMM',
  },

  vista: {
    resumen: 'Family menu',
    anadirComida: 'Add meal',
    hoy: 'Today',
    estaSemana: 'This week',
    sinMenuHoy: 'No menu for today',
    anadirComidaDeHoy: "Add today's meal",
    vistaSemanal: 'Week view',
    semanaAnterior: 'Previous week',
    semanaSiguiente: 'Next week',
    volverAHoy: 'Back to today',
    rangoMovil: (desde: string, hasta: string) => `${desde} - ${hasta}`,
    rangoEscritorio: (desde: string, hasta: string) => `${desde} – ${hasta}`,
  },

  semana: {
    // La columna de las franjas: desayuno, comida, cena…
    franja: 'Meal',
    hoy: 'Today',
    copiar: 'Copy',
    anadir: 'Add',
    copiarMenuDel: (fecha: string) => `Copy the menu for ${fecha}`,
    anadirPara: (franja: string, fecha: string) => `Add ${franja.toLowerCase()} for ${fecha}`,
    editarDel: (franja: string, fecha: string) => `Edit ${franja.toLowerCase()} on ${fecha}`,
  },

  fila: {
    editar: (plato: string) => `Edit ${plato}`,
  },

  mealSheet: {
    anadirComida: 'Add meal',
    editarComida: 'Edit meal',
    guardarComida: 'Save meal',
    guardarCambios: 'Save changes',
    eliminarComida: 'Delete meal',
    confirmarEliminacion: 'Confirm deletion',
    fecha: 'Date',
    franja: 'Meal',
    yaTienePlato: 'This meal already has a dish (it will be replaced)',
    primerPlato: 'First course',
    plato: 'Dish',
    buscaUnPlato: 'Search for a dish or type a new one',
    yaLoHabeisHecho: (n: number) => `Made before (${n})`,
    losQueMasRepetis: 'Your most repeated',
    platoNuevo: 'New dish: you had never added it before.',
    segundoPlato: 'Second course',
    postre: 'Dessert',
    notas: 'Notes',
    opcional: '(optional)',
    ejemploSegundo: 'E.g. Chicken fillet with salad',
    ejemploPostre: 'E.g. Seasonal fruit',
    ejemploNotas: 'E.g. No onion',
  },

  copiarSheet: {
    titulo: 'Copy menu',
    copiarMenu: 'Copy menu',
    copiarYRepetir: 'Copy and repeat menu',
    menuOrigen: 'Source menu',
    sinComidas: 'This day has no meals to copy.',
    copiarAlDia: 'Copy to day',
    seSustituira: 'If that day already had a menu, it will be replaced by this one.',
    repetirCadaDia: 'Repeat this menu every day',
    ideal: 'Puts this same menu on every day up to the date you choose, replacing whatever was there.',
    fechaFin: 'End date',
    fechaFinAnterior: 'The end date cannot be before the target day.',
  },
}
