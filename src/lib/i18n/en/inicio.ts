import type { inicio as es } from '../es/inicio'

export const inicio: typeof es = {
  saludo: {
    manana: 'Good morning',
    tarde: 'Good afternoon',
    noche: 'Good evening',
  },
  formatoFecha: 'EEEE, d MMMM',
  calmaTotal: 'A quiet day ahead. The house can breathe a little.',
  sinAgenda: 'Nothing on the calendar today',
  anadirA: (cesta: string) => `Add to ${cesta}`,

  verCalendario: 'See calendar',
  todoElDia: 'All day',

  cumpleHoy: {
    deNombre: (nombre: string) => `It's ${nombre}'s birthday today`,
    conEdad: (nombre: string, edad: number) => `${nombre} turns ${edad} today`,
  },

  tareasDeHoy: {
    marcarCompletada: (titulo: string) => `Mark "${titulo}" as done`,
    formatoAtrasada: 'd MMM',
    atrasada: (fecha: string) => `Overdue · ${fecha}`,
    yMas: (n: number) => (n === 1 ? 'And 1 more' : `And ${n} more`),
  },

  menu: {
    verMenuSemanal: 'See weekly menu',
  },

  papeles: {
    formatoFecha: 'd MMMM',
    caducoEl: (nombre: string, fecha: string) => `“${nombre}” expired on ${fecha}`,
    caducaEl: (nombre: string, fecha: string) => `“${nombre}” expires on ${fecha}`,
    varios: (caducados: number, pronto: number) => {
      const partes: string[] = []
      if (caducados === 1) partes.push('one document has expired')
      else if (caducados > 1) partes.push(`${caducados} documents have expired`)
      if (pronto === 1) partes.push('one expires soon')
      else if (pronto > 1) partes.push(`${pronto} expire soon`)
      const frase = partes.join(' and ')
      return frase.charAt(0).toUpperCase() + frase.slice(1)
    },
  },

  cesta: {
    titulo: 'Household lists',
    vacia: 'The basket is empty, for now',
    apuntarEn: (cesta: string) => `Add something to ${cesta}`,
    apuntarEnLaLista: 'Add something to the list',
    verTodas: 'See all lists',
    plegar: 'Collapse the lists',
    yaTeneis: (texto: string) => `You've got "${texto}", remove it from what's missing`,
  },

  tareas: {
    titulo: 'Everything else to do',
    verTodas: 'See all tasks',
    marcarCompletada: 'Mark as done',
  },

  proximos: {
    manana: 'Tomorrow',
    proximosDias: 'Coming days',
    proximaSemana: 'Next week',
    formatoDia: 'EEEE d',
  },

  cumples: {
    titulo: 'Birthdays',
    verLaFamilia: 'See the family',
  },
}
