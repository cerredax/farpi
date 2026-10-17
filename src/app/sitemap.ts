import type { MetadataRoute } from 'next'

const SITIO = (process.env.SITE_URL ?? 'https://www.farpi.app').replace(/\/$/, '')

/** Las páginas públicas de `PUBLIC_ROUTES` que merece la pena indexar (no `/offline` ni `/no-disponible`). */
const RUTAS = ['/', '/privacidad', '/terminos', '/borrar-cuenta']

export default function sitemap(): MetadataRoute.Sitemap {
  return RUTAS.map(ruta => ({ url: `${SITIO}${ruta === '/' ? '' : ruta}` }))
}
