export const runtime = 'nodejs'

export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return Response.json({
    hasUrl: !!url,
    urlPrefix: url ? url.substring(0, 30) : null,
    hasKey: !!key,
    keyLength: key.length,
  })
}
