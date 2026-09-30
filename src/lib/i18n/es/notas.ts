/** Notas: la pantalla, la tarjeta y el sheet. */
export const notas = {
  resumen: (n: number) => `${n} nota${n !== 1 ? 's' : ''} de la familia`,
  /** Solo sale con `MINIMO_PARA_BUSCAR` notas o más, así que nunca con una. */
  buscarEn: (n: number) => `Buscar en ${n} notas…`,
  buscar: 'Buscar notas',
  nuevaNota: 'Nueva nota',
  ningunaCoincide: 'Ninguna nota coincide',
  sinNotas: 'Sin notas',
  ningunaCoincideCon: (busqueda: string) => `Ninguna coincide con «${busqueda}»`,

  /** La chincheta de la tarjeta, a oídas. */
  fijada: 'Fijada',

  sheet: {
    nueva: 'Nueva nota',
    editar: 'Editar nota',
    crear: 'Crear nota',
    guardar: 'Guardar',
    eliminar: 'Eliminar nota',
    confirmarEliminacion: 'Confirmar eliminación',
    titulo: 'Título',
    tituloEjemplo: 'Ej: Wifi de casa',
    contenido: 'Contenido',
    opcional: '(opcional)',
    contenidoEjemplo: 'Red: FARPI_2G\nClave: …',
    fijar: 'Fijar',
    arribaDelTodo: 'Arriba del todo',
    icono: 'Icono',
  },
}
