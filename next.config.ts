import type { NextConfig } from "next";
import { IS_DEMO_MODE, SUPABASE_URL } from "./src/lib/supabase/env";

/**
 * Cabeceras de seguridad. No había ninguna, y Farpi guarda documentos de la
 * familia: DNI, informes médicos, el libro de familia.
 */

/**
 * El único destino externo además de Supabase.
 *
 * Los documentos se guardan en el Google Drive de quien los sube, y **la subida
 * va del navegador a Google directamente**, sin pasar por el servidor: una
 * función de Vercel corta el cuerpo de la petición muy por debajo de los 20 MB
 * que admite un documento. Leerlos sí pasa por Farpi —ahí el token es prestado— y
 * por eso no hace falta abrir nada más.
 *
 * Es el host de la API, no un comodín `*.google.com`: lo que se autoriza es
 * hablar con Drive, no con Google.
 */
const GOOGLE_API = 'https://www.googleapis.com'

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
 * - hablar con cualquier servidor que no sean Supabase y la API de Google Drive
 *   (`connect-src`).
 *
 * `connect-src` se arma con la URL real del proyecto en vez de un comodín
 * `*.supabase.co`: si un día se cuela una clave de otro proyecto, la petición no
 * sale. Google entra por la misma puerta y con el mismo criterio —el host de la
 * API y nada más— porque los documentos se suben del navegador a Drive. En modo
 * demo se queda en `'self'`, que es lo correcto porque ahí no se habla con nadie. Quién está en modo demo lo dice `IS_DEMO_MODE` y nadie más:
 * esta función tenía su propia versión de la regla, mirando solo la URL, y una
 * regla escrita dos veces es una regla que acaba diciendo dos cosas.
 *
 * `'unsafe-eval'` solo en desarrollo: lo necesita el refresco en caliente, y en
 * el build servido no hace falta.
 */
function buildCsp(): string {
  // La barra final se quita aquí y no en `env.ts` porque es cosa de la cabecera:
  // un origen de CSP no la lleva.
  const supabase = SUPABASE_URL.replace(/\/$/, '')
  const conexiones = IS_DEMO_MODE
    // En modo demo no se habla con nadie: ni Supabase ni Drive. Los archivos no
    // salen del navegador.
    ? "'self'"
    : `'self' ${supabase} ${supabase.replace(/^https:/, 'wss:')} ${GOOGLE_API}`

  const scripts = process.env.NODE_ENV === 'development'
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'"

  return [
    "default-src 'self'",
    `script-src ${scripts}`,
    // Tailwind y Next escriben estilos en línea; sin esto no se pinta nada.
    "style-src 'self' 'unsafe-inline'",
    // `data:` por los iconos en línea y `blob:` por las imágenes que el navegador
    // arma en memoria. Los documentos ya no necesitan más: los sirve la propia
    // app desde `/api/documents/…`, que entra por `'self'`.
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
  // Nadie mete Farpi en un iframe: sin esto, una web ajena puede superponerse a
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
  /**
   * Las calidades que el optimizador acepta.
   *
   * **Next 16 cambió el valor por defecto a `[75]` y a secas**: un `quality={90}`
   * en un `<Image>` no falla ni avisa, se redondea al permitido más cercano y te
   * quedas con 75 sin enterarte. Aquí importa porque las capturas de la portada
   * son pantallas de móvil enseñadas a la mitad de tamaño, con texto de la app
   * cayendo a unos 7 px: a 75 se emborrona.
   */
  images: {
    qualities: [75, 90],
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
