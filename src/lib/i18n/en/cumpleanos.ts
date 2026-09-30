import type { cumpleanos as es } from '../es/cumpleanos'

export const cumpleanos: typeof es = {
  edad: (n: number) => (n === 1 ? '1 year old' : `${n} years old`),
  // «turns 8» y no «turns 8 years»: así se dice en inglés.
  cumpleEdad: (n: number) => `turns ${n}`,

  hoy: 'Today',
  manana: 'Tomorrow',
  formatoDia: 'EEE d MMM',

  resumen: (n: number) => (n === 1 ? '1 birthday in the next twelve months' : `${n} birthdays in the next twelve months`),
  buscarEn: (n: number) => (n === 1 ? 'Search 1 birthday…' : `Search ${n} birthdays…`),
  buscarPorNombre: 'Search birthdays by name',
  apuntar: 'Add a birthday',
  sinCumpleanos: 'No birthdays',
  sinCoincidencias: 'No matches',
  nadieCon: (busqueda: string) => `Nobody with “${busqueda}” in their name`,
  editarElDe: (nombre: string) => `Edit ${nombre}'s birthday`,
  cambiarFechaDe: (nombre: string) => `Change ${nombre}'s date of birth in Settings`,
}
