import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { IdiomaProvider } from '@/lib/i18n/contexto'
import { diccionario } from '@/lib/i18n'
import { idiomaDeLaPeticion } from '@/lib/i18n/servidor'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
})

/**
 * El sitio, para las etiquetas que necesitan una URL absoluta. Sale de
 * `SITE_URL`, la misma variable con la que se arman las invitaciones, y cae al
 * dominio real si falta: aquí una URL equivocada no rompe nada, solo hace que
 * la imagen de compartir no se vea.
 */
const SITIO = (process.env.SITE_URL ?? 'https://www.farpi.app').replace(/\/$/, '')

/**
 * En el idioma del dispositivo, como el resto de la página (29-09-2026). Quien
 * más lee estas etiquetas no lo tiene: WhatsApp y Google entran sin cookie y
 * ven siempre el castellano, que es el idioma por defecto. Traducidas aquí
 * solo cambian para quien ya usa la app en inglés; la vista previa en inglés
 * de verdad es cosa de una portada en `/en`, con sus propias etiquetas.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { metadatos: t } = diccionario(await idiomaDeLaPeticion())
  const titulo = `Farpi — ${t.lema}`

  return {
    metadataBase: new URL(SITIO),
    title: 'Farpi',
    description: t.descripcion,
    manifest: '/manifest.json',
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-icon.png',
    },
    /**
     * Cómo se ve el enlace cuando alguien lo manda por WhatsApp, que es como se
     * va a compartir esto: entre familias, no por un buscador. Sin estas
     * etiquetas viaja pelado —solo el dominio— y parece cualquier cosa.
     *
     * `og.png` la genera `scripts/gen-capturas.mjs` con las capturas. Se declara
     * su tamaño real porque WhatsApp y Telegram deciden si enseñan la
     * previsualización grande o una miniatura antes de descargarla, mirando
     * justo eso.
     */
    openGraph: {
      type: 'website',
      siteName: 'Farpi',
      locale: t.locale,
      url: SITIO,
      title: titulo,
      description: t.descripcion,
      // El texto alternativo describe la imagen, que es una captura en
      // castellano: en inglés lo dice, para no prometer otra cosa.
      images: [{ url: '/og.png', width: 1200, height: 630, alt: t.altImagen }],
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: t.descripcion,
      images: ['/og.png'],
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // La barra del navegador en Android. Es metadata, no CSS: aquí no llega
  // `var(--color-primary)`, así que va el literal. Si cambia el acento de marca
  // en `globals.css`, hay que cambiarlo aquí también.
  themeColor: '#8BA888',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // El idioma de este dispositivo, de su cookie (`lib/i18n/idiomas.ts`). Va en
  // el `lang` de la página, que es lo que usa un lector de pantalla para elegir
  // la voz, y baja a los componentes de cliente por `IdiomaProvider`.
  const idioma = await idiomaDeLaPeticion()

  return (
    <html lang={idioma} className={nunito.variable}>
      <body className="font-[family-name:var(--font-nunito)]">
        <IdiomaProvider idioma={idioma}>
          {children}
        </IdiomaProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}

