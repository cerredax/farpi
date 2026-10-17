import type { MetadataRoute } from 'next'

const SITIO = (process.env.SITE_URL ?? 'https://www.farpi.app').replace(/\/$/, '')

/**
 * Solo la portada y las páginas legales se ven sin sesión: lo demás redirige al
 * login y no tiene nada que indexar. Se cierra igualmente para que un rastreador
 * no gaste visitas en `/api` ni en `/auth`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/auth/', '/onboarding'] },
    sitemap: `${SITIO}/sitemap.xml`,
  }
}
