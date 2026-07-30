// Service worker de Nido — caché offline básica.
// Estrategias:
//  - Navegaciones: network-first con fallback a /offline.
//  - Estáticos (_next/static, iconos): stale-while-revalidate.
//  - API, /auth y peticiones cross-origin (Supabase): siempre red.

const CACHE = 'nido-v1'
const OFFLINE_URL = '/offline'
const PRECACHE = ['/offline', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return

  // Navegaciones: intenta red, cachea la respuesta y cae a /offline si falla.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(cache => cache.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match(OFFLINE_URL))),
    )
    return
  }

  // Estáticos: sirve de caché al instante y refresca en segundo plano.
  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icon') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg')

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request)
          .then(res => {
            const copy = res.clone()
            caches.open(CACHE).then(cache => cache.put(request, copy))
            return res
          })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
})
