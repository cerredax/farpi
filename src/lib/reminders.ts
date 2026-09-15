import { capitalize } from './text'

/**
 * El texto del aviso de las siete de la mañana.
 *
 * Vive aquí y no dentro de `api/cron/reminders` por lo de siempre: es lógica
 * pura que hay que poder probar sin levantar nada, y era la única parte del
 * aviso sin un test detrás. La ruta se queda con lo suyo —consultar y enviar— y
 * el qué se lee, con sus reglas de plural y de puntuación, se prueba aparte.
 */

/** Un plan de hoy, con lo justo que el aviso necesita de él. */
export interface PlanDelAviso {
  titulo: string
  /**
   * Cuándo empieza, en ISO. `null` cuando ocupa el día entero: ahí no hay hora
   * que decir, y poner la de `start_at` sería inventarse las 00:00.
   */
  empiezaEn: string | null
}

/**
 * Cuántos planes se nombran antes de pasar a contarlos.
 *
 * Tres caben en el renglón y medio que Android enseña sin desplegar. A partir de
 * ahí la frase deja de leerse de un vistazo, que es lo único que se le pide a una
 * notificación, así que el cuarto y siguientes van como "y 2 más".
 */
const MAX_PLANES_NOMBRADOS = 3

/** "Martes 15". El día en el calendario de la familia, no en el del servidor. */
export function tituloDelAviso(ahora: Date, timeZone: string): string {
  const partes = new Intl.DateTimeFormat('es-ES', { timeZone, weekday: 'long', day: 'numeric' })
    .formatToParts(ahora)
  const diaSemana = partes.find(p => p.type === 'weekday')?.value ?? ''
  const numero = partes.find(p => p.type === 'day')?.value ?? ''
  return capitalize(`${diaSemana} ${numero}`.trim())
}

/**
 * "16:30", en la zona de la familia.
 *
 * No sirve `extractTime` de `date-utils`: esa lee la hora **del que mira**, y
 * quien mira aquí es una función de Vercel que va en UTC. A las 16:30 de Madrid
 * le diría a la familia que su cita es a las 14:30.
 */
export function horaDelPlan(empiezaEn: string, timeZone: string): string {
  const fecha = new Date(empiezaEn)
  if (Number.isNaN(fecha.getTime())) return ''
  return new Intl.DateTimeFormat('es-ES', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(fecha)
}

/**
 * Los planes en el orden en que se viven: primero lo que ocupa el día entero,
 * después por la hora a la que empieza. Es el mismo orden que la agenda.
 */
function porOrdenDelDia(planes: PlanDelAviso[]): PlanDelAviso[] {
  return [...planes].sort((a, b) => {
    if (a.empiezaEn === null && b.empiezaEn === null) return 0
    if (a.empiezaEn === null) return -1
    if (b.empiezaEn === null) return 1
    return a.empiezaEn.localeCompare(b.empiezaEn)
  })
}

/** "a, b y c". La coma del final no se pone: en español no hay coma de Oxford. */
function unirConY(piezas: string[]): string {
  if (piezas.length === 0) return ''
  if (piezas.length === 1) return piezas[0]
  return `${piezas.slice(0, -1).join(', ')} y ${piezas[piezas.length - 1]}`
}

function tareasEnPalabras(tareas: number): string {
  return tareas === 1 ? '1 tarea pendiente' : `${tareas} tareas pendientes`
}

/** El nombre del plan con su hora entre paréntesis: "Dentista (16:30)". */
function planConHora(plan: PlanDelAviso, timeZone: string): string {
  const titulo = plan.titulo.trim() || 'Un plan'
  const hora = plan.empiezaEn === null ? '' : horaDelPlan(plan.empiezaEn, timeZone)
  return hora ? `${titulo} (${hora})` : `${titulo} (todo el día)`
}

/**
 * Qué hay hoy, dicho por su nombre.
 *
 * Hasta el 15-09-2026 esto contaba en vez de nombrar —"Tenéis 1 evento para
 * hoy"—, y a las nueve de la mañana obligaba a abrir la app para saber cuál era.
 * Nombrarlo tiene un precio que se aceptó a sabiendas: el aviso se lee en la
 * pantalla de bloqueo, así que el título del plan se ve sin desbloquear.
 *
 * Cuando hay un solo plan y nada más, la frase se escribe entera ("Dentista, a
 * las 16:30."); en cuanto hay más de una cosa que decir, todas van en lista con
 * la hora entre paréntesis, que es lo único que se lee de un vistazo.
 */
export function fraseDeLoDeHoy(planes: PlanDelAviso[], tareas: number, timeZone: string): string {
  const ordenados = porOrdenDelDia(planes)
  const nombrados = ordenados.slice(0, MAX_PLANES_NOMBRADOS)
  const sinNombrar = ordenados.length - nombrados.length

  const piezas = nombrados.map(plan => planConHora(plan, timeZone))
  if (sinNombrar > 0) piezas.push(`${sinNombrar} más`)
  if (tareas > 0) piezas.push(tareasEnPalabras(tareas))

  if (piezas.length === 0) return ''

  // Un solo plan y nada que añadir: se escribe como se diría en voz alta, sin
  // paréntesis. Es el caso más frecuente en una casa y el que peor queda en lista.
  if (ordenados.length === 1 && piezas.length === 1) {
    const [plan] = ordenados
    const titulo = plan.titulo.trim() || 'Un plan'
    const hora = plan.empiezaEn === null ? '' : horaDelPlan(plan.empiezaEn, timeZone)
    return hora ? `${titulo}, a las ${hora}.` : `${titulo}, todo el día.`
  }

  // Sin ningún plan que nombrar, solo quedan tareas: ahí hace falta el verbo,
  // porque "2 tareas pendientes." a secas no es una frase.
  if (ordenados.length === 0) return `Tenéis ${unirConY(piezas)}.`

  return `${unirConY(piezas)}.`
}

/**
 * Lo que caduca, en frase aparte.
 *
 * No es de hoy: es un aviso con margen, y colarlo en la frase de "para hoy" haría
 * correr por algo que aún no corre prisa. Y lo ya vencido no puede decir que
 * "caduca este mes", así que son dos frases y no una.
 */
export function fraseDeLoQueCaduca(vencidos: number, porVencer: number): string {
  const avisos: string[] = []
  if (vencidos > 0) {
    avisos.push(vencidos === 1 ? '1 documento está caducado.' : `${vencidos} documentos están caducados.`)
  }
  if (porVencer > 0) {
    avisos.push(porVencer === 1 ? '1 documento caduca este mes.' : `${porVencer} documentos caducan este mes.`)
  }
  return avisos.join(' ')
}

export interface DatosDelAviso {
  /** La felicitación de cumpleaños ya escrita, o cadena vacía si hoy no hay. */
  felicitacion: string
  planes: PlanDelAviso[]
  tareas: number
  documentosVencidos: number
  documentosPorVencer: number
}

/**
 * El aviso entero: título y cuerpo.
 *
 * El cumpleaños abre el cuerpo. Es lo único de los tres que **caduca el mismo
 * día** —una tarea se hace por la tarde, un papel caduca dentro de un mes—, y
 * leído detrás de "Dentista (16:30)" se queda en la línea que ya nadie mira.
 */
export function avisoDelDia(datos: DatosDelAviso, ahora: Date, timeZone: string): { title: string; body: string } {
  const body = [
    datos.felicitacion,
    fraseDeLoDeHoy(datos.planes, datos.tareas, timeZone),
    fraseDeLoQueCaduca(datos.documentosVencidos, datos.documentosPorVencer),
  ].filter(Boolean).join(' ')

  return { title: tituloDelAviso(ahora, timeZone), body }
}
