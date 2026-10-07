/** Inicio: la tarjeta de hoy y las secciones de debajo. */
export const inicio = {
  /** El saludo de la tarjeta de hoy, por el tramo del día (`getGreeting`). */
  saludo: {
    manana: 'Buenos días',
    tarde: 'Buenas tardes',
    noche: 'Buenas noches',
  },
  /** La fecha de debajo del saludo. */
  formatoFecha: "EEEE, d 'de' MMMM",
  /** Un día vacío con la casa al día. */
  calmaTotal: 'Hoy pinta tranquilo. La casa respira un poco.',
  /** Un día sin nada a una hora pero con cosas pendientes debajo. */
  sinAgenda: 'Un día sin agenda',
  /** El título del sheet de apuntar algo en la cesta. */
  anadirA: (cesta: string) => `Añadir a ${cesta}`,

  verCalendario: 'Ver calendario',
  todoElDia: 'Todo el día',

  cumpleHoy: {
    deNombre: (nombre: string) => `Hoy es el cumple de ${nombre}`,
    conEdad: (nombre: string, edad: number) =>
      `Hoy ${nombre} cumple ${edad === 1 ? '1 año' : `${edad} años`}`,
  },

  tareasDeHoy: {
    marcarCompletada: (titulo: string) => `Marcar "${titulo}" como completada`,
    formatoAtrasada: 'd MMM',
    atrasada: (fecha: string) => `Atrasada · ${fecha}`,
    yMas: (n: number) => (n === 1 ? 'Y una más' : `Y ${n} más`),
  },

  menu: {
    verMenuSemanal: 'Ver menú semanal',
  },

  papeles: {
    formatoFecha: "d 'de' MMMM",
    caducoEl: (nombre: string, fecha: string) => `«${nombre}» caducó el ${fecha}`,
    caducaEl: (nombre: string, fecha: string) => `«${nombre}» caduca el ${fecha}`,
    /** Con varios papeles ya no cabe cuál, así que se cuentan. */
    varios: (caducados: number, pronto: number) => {
      const partes: string[] = []
      if (caducados === 1) partes.push('un papel ha caducado')
      else if (caducados > 1) partes.push(`${caducados} papeles han caducado`)
      if (pronto === 1) partes.push('uno caduca pronto')
      else if (pronto > 1) partes.push(`${pronto} caducan pronto`)
      const frase = partes.join(' y ')
      return frase.charAt(0).toUpperCase() + frase.slice(1)
    },
  },

  /** La tarjeta que ofrece activar los avisos, mientras nadie los haya pedido. */
  avisos: {
    titulo: 'Activa los avisos',
    explicacion: 'Te avisamos de los planes, tareas y cumpleaños de la casa en este móvil.',
    activar: 'Activar avisos',
    ahoraNo: 'Ahora no',
    activando: 'Activando…',
    noSePudo: 'No se pudo activar. Prueba desde Ajustes.',
  },

  cesta: {
    titulo: 'Listas de casa',
    vacia: 'La cesta está vacía, de momento',
    apuntarEn: (cesta: string) => `Apuntar algo en ${cesta}`,
    apuntarEnLaLista: 'Apuntar algo en la lista',
    verTodas: 'Ver todas las listas',
    plegar: 'Plegar las listas',
    yaTeneis: (texto: string) => `Ya tenéis "${texto}", quitar de lo que falta`,
  },

  tareas: {
    titulo: 'Lo demás por hacer',
    verTodas: 'Ver todas las tareas',
    marcarCompletada: 'Marcar como completada',
  },

  proximos: {
    manana: 'Mañana',
    proximosDias: 'Próximos días',
    proximaSemana: 'Próxima semana',
    /** El día que encabeza un bloque: «Miércoles 6». */
    formatoDia: 'EEEE d',
  },

  cumples: {
    titulo: 'Cumpleaños',
    verLaFamilia: 'Ver la familia',
  },
}
