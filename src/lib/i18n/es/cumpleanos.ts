/** Cumpleaños: la pantalla y los helpers de `lib/birthdays.ts` que también usan Inicio y el calendario. */
export const cumpleanos = {
  /** `edadEnPalabras`: «8 años», «1 año». */
  edad: (n: number) => (n === 1 ? '1 año' : `${n} años`),
  /** Lo que cumple, al final de la fila: «cumple 8 años». */
  cumpleEdad: (n: number) => (n === 1 ? 'cumple 1 año' : `cumple ${n} años`),

  /** `diaDeCumple`: cerca se dice en días y lejos con la fecha. */
  hoy: 'Hoy',
  manana: 'Mañana',
  formatoDia: 'EEE d MMM',

  resumen: (n: number) => `${n} cumpleaños en los próximos doce meses`,
  buscarEn: (n: number) => `Buscar en ${n} cumpleaños…`,
  buscarPorNombre: 'Buscar un cumpleaños por nombre',
  apuntar: 'Apuntar un cumpleaños',
  sinCumpleanos: 'Sin cumpleaños',
  sinCoincidencias: 'Sin coincidencias',
  nadieCon: (busqueda: string) => `Nadie con «${busqueda}» en el nombre`,
  editarElDe: (nombre: string) => `Editar el cumpleaños de ${nombre}`,
  cambiarFechaDe: (nombre: string) => `Cambiar la fecha de nacimiento de ${nombre} en Ajustes`,
}
