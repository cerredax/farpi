/**
 * Hablar con las rutas API de la propia app desde el navegador.
 *
 * Casi todo en `supabase-repos/` va directo a PostgREST con la RLS delante, pero
 * los documentos no pueden: para servir el archivo de otra persona hace falta su
 * token, y un token no baja al navegador ni de broma. Esas operaciones pasan por
 * `/api/documents/*`, y esto es lo único que necesitan de común.
 *
 * Lo importante es la última línea: **el mensaje de error del servidor se
 * conserva**. Ahí es donde vienen los dos avisos que de verdad tienen arreglo
 * —"lo subió Marta y su almacenamiento ya no está conectado", "el archivo ya no
 * está en su Drive"—, y perderlos por un "Error 409" genérico dejaría a la
 * familia sin saber a quién avisar.
 */
export async function pedirApi<T>(
  url: string,
  cuerpo?: unknown,
  metodo: 'GET' | 'POST' | 'DELETE' = 'POST',
): Promise<T> {
  const res = await fetch(url, {
    method: metodo,
    ...(cuerpo === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }),
  })

  /**
   * La sesión caducada no llega como 401, llega como página de login.
   *
   * `requiereSesion` responde 401 en JSON, pero a estas rutas casi nunca les toca
   * hacerlo: el proxy (`src/proxy.ts`) intercepta antes cualquier ruta que no sea
   * pública y contesta **307 a `/auth/login`**. `fetch` sigue el redirect sin
   * preguntar, así que lo que llega aquí es un 200 con el HTML del login: `res.ok`
   * dice que todo fue bien y `res.json()` falla en silencio. Sin esta guarda,
   * `createDocument` acabaría reventando con un «Cannot destructure property» en
   * lugar de decir lo único que hace falta saber.
   */
  if (res.redirected && new URL(res.url).pathname.startsWith('/auth/')) {
    throw new Error('La sesión ha caducado. Vuelve a entrar en Nido e inténtalo otra vez.')
  }

  const datos = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(datos?.error ?? 'No se pudo completar la operación')
  }
  return datos as T
}
