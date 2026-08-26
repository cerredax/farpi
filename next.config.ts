import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad. No había ninguna, y Nido guarda documentos de la
 * familia: DNI, informes médicos, el libro de familia.
 */

/**
 * Content Security Policy (26-08-2026).
 *
 * Durante meses no hubo, y por una razón buena: Next inyecta scripts en línea y
 * una CSP mal puesta rompe la app en producción sin haber avisado en local,
 * porque `npm run dev` no sirve lo mismo que el build. La condición para ponerla
 * era probarla contra `npm run build && npm run start`, y es lo que se hizo.
 *
 * **Qué compra y qué no.** Lleva `'unsafe-inline'` en los scripts porque Next los
 * inyecta y la alternativa —nonces por petición desde el proxy— es bastante
 * maquinaria para una app de una familia. Eso significa que **no** para un XSS
 * de script en línea. Lo que sí para, y no es poco:
 *
 * - cargar un script de otro dominio (`script-src 'self'`), que es la forma
 *   normal de convertir un XSS en robo de sesión;
 * - `<object>` y `<embed>` (`object-src 'none'`);
 * - meter la app en un iframe (`frame-ancestors`, que es X-Frame-Options dicho
 *   en el idioma moderno);
 * - reescribir la base de las rutas relativas (`base-uri`);
 * - **enviar un formulario a otro dominio** (`form-action`), que es como se
 *   exfiltran credenciales con solo inyectar HTML, sin script;
 * - hablar con cualquier servidor que no sea Supabase (`connect-src`).
 *
 * `connect-src` se arma con la URL real del proyecto en vez de un comodín
 * `*.supabase.co`: si un día se cuela una clave de otro proyecto, la petición no
 * sale. En modo demo no hay URL y se queda en `'self'`, que es lo correcto porque
 * ahí no se habla con nadie.
 *
 * `'unsafe-eval'` solo en desarrollo: lo necesita el refresco en caliente, y en
 * el build servido no hace falta.
 */
function buildCsp(): string {
  const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/$/, '')
  const esDemo = !supabase || supabase.includes('placeholder') || supabase.includes('your-supabase')
  const conexiones = esDemo
    ? "'self'"
    : `'self' ${supabase} ${supabase.replace(/^https:/, 'wss:')}`

  const scripts = process.env.NODE_ENV === 'development'
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'"

  return [
    "default-src 'self'",
    `script-src ${scripts}`,
    // Tailwind y Next escriben estilos en línea; sin esto no se pinta nada.
    "style-src 'self' 'unsafe-inline'",
    // `data:` por los iconos en línea y `blob:` por las descargas de documentos,
    // que se sirven desde una URL firmada y se abren como blob.
    "img-src 'self' data: blob:",
    // La fuente la autoaloja `next/font`, así que no hace falta abrir ningún host.
    "font-src 'self'",
    `connect-src ${conexiones}`,
    "media-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: buildCsp() },
  // Nadie mete Nido en un iframe: sin esto, una web ajena puede superponerse a
  // los botones y conseguir que un toque borre algo (clickjacking). Se queda
  // junto a `frame-ancestors` porque los navegadores viejos solo entienden esta.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Un archivo subido no se ejecuta aunque el navegador crea adivinar que es
  // otra cosa.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Al salir a otro dominio no se filtra la ruta, que aquí lleva ids de familia.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // La app no usa cámara, micrófono ni ubicación: que tampoco pueda nadie más.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
