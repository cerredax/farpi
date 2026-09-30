import type { notas as es } from '../es/notas'

export const notas: typeof es = {
  resumen: (n: number) => (n === 1 ? '1 family note' : `${n} family notes`),
  buscarEn: (n: number) => (n === 1 ? 'Search 1 note…' : `Search ${n} notes…`),
  buscar: 'Search notes',
  nuevaNota: 'New note',
  ningunaCoincide: 'No notes match',
  sinNotas: 'No notes',
  ningunaCoincideCon: (busqueda: string) => `Nothing matches “${busqueda}”`,

  fijada: 'Pinned',

  sheet: {
    nueva: 'New note',
    editar: 'Edit note',
    crear: 'Create note',
    guardar: 'Save',
    eliminar: 'Delete note',
    confirmarEliminacion: 'Confirm deletion',
    titulo: 'Title',
    tituloEjemplo: 'E.g. Home wifi',
    contenido: 'Content',
    opcional: '(optional)',
    contenidoEjemplo: 'Network: FARPI_2G\nPassword: …',
    fijar: 'Pin',
    arribaDelTodo: 'Keep at the top',
    icono: 'Icon',
  },
}
