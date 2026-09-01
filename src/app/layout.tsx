import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'

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

const DESCRIPCION =
  'El espacio privado de tu familia: agenda, tareas, listas, comidas, gastos y los papeles importantes, en un solo sitio.'

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: 'Farpi',
  description: DESCRIPCION,
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
    locale: 'es_ES',
    url: SITIO,
    title: 'Farpi — qué tenemos que saber hoy en casa',
    description: DESCRIPCION,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Farpi, la pantalla de inicio con el día de una familia' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Farpi — qué tenemos que saber hoy en casa',
    description: DESCRIPCION,
    images: ['/og.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // La barra del navegador en Android. Es metadata, no CSS: aquí no llega
  // `var(--color-primary)`, así que va el literal. Si cambia el acento de marca
  // en `globals.css`, hay que cambiarlo aquí también.
  themeColor: '#8BA888',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={nunito.variable}>
      <body className="font-[family-name:var(--font-nunito)]">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}

