import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
})

export const metadata: Metadata = {
  title: 'Nido',
  description: 'Tu espacio familiar privado',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
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

