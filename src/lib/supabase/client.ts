import { createBrowserClient } from '@supabase/ssr'
import { IS_DEMO_MODE, SUPABASE_URL, SUPABASE_ANON_KEY } from './env'

export { IS_DEMO_MODE }

export function createClient() {
  if (IS_DEMO_MODE) return null as never
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

/**
 * Las páginas que el service worker guardó mientras había sesión.
 *
 * El worker hace network-first en las navegaciones y **se queda una copia** de lo
 * que salió bien, así que en el disco quedan `/home`, `/docs` y las demás tal y
 * como se vieron. Hoy eso no filtra ningún dato —las pantallas son cascarones de
 * cliente y los datos llegan después, del `StoreProvider`— pero es una invariante
 * que nadie escribió en ninguna parte: el día que una página del grupo `(app)`
 * renderice algo en el servidor, la caché de un móvil compartido lo enseñaría
 * después de cerrar sesión. Se vacía al salir y deja de ser un problema que hay
 * que recordar.
 *
 * Solo las páginas: lo estático y el precache viven en otra caché y se quedan,
 * que es lo que mantiene el fallback de sin conexión en pie (ver `public/sw.js`).
 *
 * No espera respuesta y no falla nunca: si el worker no está —primera visita,
 * navegador que no lo admite, iOS en una pestaña normal— salir tiene que
 * funcionar igual. Es limpieza, no una condición para cerrar la sesión.
 */
function vaciarPaginasCacheadas(): void {
  try {
    navigator.serviceWorker?.controller?.postMessage('farpi:vaciar-paginas')
  } catch {
    // Ni un log: `e2e/runtime.spec.ts` tumba la suite ante cualquier console.error,
    // y esto es lo más prescindible de todo el cierre de sesión.
  }
}

export async function signOut() {
  if (IS_DEMO_MODE) return
  const supabase = createClient()
  await supabase.auth.signOut()
  // Después de cerrar la sesión y no antes: si `signOut` fallara, las páginas
  // cacheadas siguen siendo de una sesión viva y tirarlas no arregla nada.
  vaciarPaginasCacheadas()
}
