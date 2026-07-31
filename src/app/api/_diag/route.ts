export const runtime = 'nodejs'

// Endpoint de diagnóstico TEMPORAL para verificar las env vars de Supabase
// en Vercel. Eliminar una vez resuelto. No expone secretos (la URL es
// pública; de la anon key solo se muestra el prefijo y la longitud).
export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return Response.json({
    url,
    urlLen: url.length,
    urlHasWhitespace: url !== url.trim(),
    urlTrimmed: url.trim(),
    anonPrefix: anon.slice(0, 14),
    anonLen: anon.length,
  })
}
