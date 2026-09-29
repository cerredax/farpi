import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IS_DEMO_MODE } from '@/lib/supabase/env'
import { LandingPage } from '@/components/landing/LandingPage'

/**
 * La portada es la única página que alguien encuentra buscando, y heredaba el
 * «Farpi» a secas del layout: en la pestaña y en un resultado de Google no decía
 * de qué va. Lleva el mismo título que la previsualización de WhatsApp.
 *
 * `canonical` para que `/?algo=` (lo que añaden las campañas y algunos
 * mensajeros) cuente como la misma página. El día que exista `/en`, aquí van
 * también `alternates.languages`, que es lo que le dice a Google que son la
 * misma página en dos idiomas.
 */
export const metadata: Metadata = {
  title: { absolute: 'Farpi — qué tenemos que saber hoy en casa' },
  alternates: { canonical: '/' },
}

export default async function RootPage() {
  if (!IS_DEMO_MODE) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/home')
  }

  return <LandingPage />
}
