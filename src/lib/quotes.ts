import { normalizaParaBuscar } from './text'
import type { Quote } from '@/types'

/**
 * Los presupuestos que te pasan de fuera: el fontanero, el dentista, la reforma
 * del baño. Lo que cuesta algo que **aún no has hecho**.
 *
 * **Viven aquí y no en `budgets.ts`** (14-09-2026). Estaban en el mismo archivo
 * que las partidas, que es exactamente la confusión que la sección entera se
 * dedicó a deshacer el 01-09: «presupuesto» en español son dos cosas —lo que le
 * asignas a la compra y el papel que te pasa el fontanero— y en Farpi solo
 * significa la segunda. Un archivo llamado `budgets.ts` con las dos dentro
 * obligaba a hacer esa traducción cada vez que se abría.
 *
 * No comparten ni una función con el resto de Finanzas: aquí no hay meses, ni
 * plantilla, ni cuenta que cuadrar. Solo un título, unos precios y cuál es el
 * más barato.
 */

export interface GrupoDePresupuestos {
  /** Para qué es, tal y como se escribió la primera vez. */
  titulo: string
  quotes: Quote[]
  /** El id del más barato del grupo. `null` si solo hay uno: no hay comparación. */
  masBaratoId: string | null
  /** Ya se ha aceptado uno, así que el grupo está decidido. */
  decidido: boolean
}

/**
 * Cómo se comparan dos claves de agrupación. Sin tildes, sin mayúsculas y sin
 * espacios de más: "Cambiar la caldera" y "cambiar la  Caldera" son el mismo
 * trabajo, y que salieran en dos bloques distintos rompería lo único que esta
 * pantalla hace de verdad.
 */
function claveDe(titulo: string): string {
  return normalizaParaBuscar(titulo.trim()).replace(/\s+/g, ' ')
}

/**
 * Los presupuestos pedidos, agrupados por para qué son.
 *
 * Los grupos sin decidir van primero: son los que piden algo de quien mira. Y
 * dentro de cada grupo, de más barato a más caro, porque es el orden en el que
 * se leen tres precios que se están comparando.
 *
 * El más barato solo se marca **si el grupo sigue abierto**. Marcarlo en uno ya
 * decidido sería un reproche —"el que aceptaste no era el barato"— y esa
 * decisión ya está tomada, a veces por buenas razones que la app no sabe.
 */
export function agruparPresupuestos(quotes: Quote[]): GrupoDePresupuestos[] {
  const grupos = new Map<string, GrupoDePresupuestos>()

  for (const quote of quotes) {
    const clave = claveDe(quote.title)
    const grupo = grupos.get(clave)
    if (grupo) grupo.quotes.push(quote)
    else grupos.set(clave, { titulo: quote.title.trim(), quotes: [quote], masBaratoId: null, decidido: false })
  }

  const lista = [...grupos.values()].map(grupo => {
    const quotes = [...grupo.quotes].sort((a, b) => a.amount_cents - b.amount_cents)
    const decidido = quotes.some(q => q.status === 'aceptado')
    const vivos = quotes.filter(q => q.status !== 'descartado')
    return {
      ...grupo,
      quotes,
      decidido,
      masBaratoId: !decidido && vivos.length > 1 ? vivos[0].id : null,
    }
  })

  return lista.sort((a, b) => {
    if (a.decidido !== b.decidido) return a.decidido ? 1 : -1
    return a.titulo.localeCompare(b.titulo, 'es')
  })
}

/** Un precio que ya no vale: tenía fecha y quedó atrás. */
export function estaCaducado(quote: Quote, hoy: string): boolean {
  return quote.valid_until !== null && quote.valid_until < hoy
}

/** Los títulos ya usados, para ofrecerlos al apuntar otro del mismo trabajo. */
export function titulosDePresupuestos(quotes: Quote[]): string[] {
  const vistos = new Map<string, string>()
  for (const q of quotes) {
    const clave = claveDe(q.title)
    if (!vistos.has(clave)) vistos.set(clave, q.title.trim())
  }
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'es'))
}
