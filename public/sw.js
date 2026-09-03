// Service worker de Farpi — caché offline básica.
// Estrategias:
//  - Navegaciones: network-first con fallback a /offline.
//  - Estáticos (_next/static, iconos): stale-while-revalidate.
//  - API, /auth y peticiones cross-origin (Supabase): siempre red.

// La numeración arranca de cero con el nombre nuevo (31-08-2026). Da igual el
// número: lo único que importa es que la cadena cambie, así que el `activate` de
// abajo barre la caché vieja de todos los móviles que ya tenían la app instalada.
//
// **Son dos cachés y no una desde el 03-09-2026**, y es lo que hace posible
// vaciar al cerrar sesión sin romper nada. Lo que se guarda de una navegación es
// una página que se vio **con la sesión abierta**, así que al salir no tiene por
// qué quedarse en el disco de nadie; lo estático y el precache no son de nadie y
// se quedan. Con una sola caché había que elegir entre dejar las páginas o
// llevarse por delante `/offline` —que solo se repone en el `install`, es decir en
// la siguiente versión del worker— y quedarse sin fallback de sin conexión hasta
// entonces.
const CACHE_PAGINAS = 'farpi-paginas-v1'
const CACHE_ESTATICOS = 'farpi-estaticos-v1'
/** Las que valen ahora. El `activate` borra toda caché que no esté aquí. */
const CACHES_VIGENTES = [CACHE_PAGINAS, CACHE_ESTATICOS]
const OFFLINE_URL = '/offline'
const PRECACHE = ['/offline', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_ESTATICOS)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !CACHES_VIGENTES.includes(k)).map(k => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  )
})

// Cerrar sesión vacía las páginas cacheadas. Lo pide la propia app —`signOut` en
// `src/lib/supabase/client.ts`— porque es ella la que sabe que se está saliendo;
// aquí solo se sabe hacer. Se contesta siempre, incluso si falla, para que el
// `signOut` no se quede esperando a un worker que no puede.
self.addEventListener('message', event => {
  if (event.data !== 'farpi:vaciar-paginas') return
  const responder = ok => event.source && event.source.postMessage({ vaciado: ok })
  caches.delete(CACHE_PAGINAS).then(responder, () => responder(false))
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return

  // Navegaciones: intenta red, cachea la respuesta y cae a /offline si falla.
  // Solo se guarda lo que salió bien: desde que existe la pantalla de "Farpi no
  // está disponible" (un 503 servido en la URL que pediste), cachear cualquier
  // respuesta dejaría la avería pegada a /home hasta la siguiente visita buena.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE_PAGINAS).then(cache => cache.put(request, copy))
          }
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
            caches.open(CACHE_ESTATICOS).then(cache => cache.put(request, copy))
            return res
          })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
})

// ── Notificaciones push ─────────────────────────────────────────
// El servidor envía { title, body, url }. Mostramos la notificación
// y, al pulsarla, enfocamos una pestaña abierta o abrimos la app.
self.addEventListener('push', event => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }
  const title = payload.title || 'Farpi'
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.url || '/home' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/home'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsList => {
      for (const client of clientsList) {
        if (client.url.includes(target) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    }),
  )
})
