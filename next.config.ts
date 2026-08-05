import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad. No había ninguna, y Nido guarda documentos de la
 * familia: DNI, informes médicos, el libro de familia.
 *
 * No hay CSP a propósito: Next inyecta scripts en línea y una CSP mal puesta
 * rompe la app en producción sin haber avisado en local. Estas cuatro no tienen
 * ese riesgo y cubren lo que se puede intentar desde fuera.
 */
const SECURITY_HEADERS = [
  // Nadie mete Nido en un iframe: sin esto, una web ajena puede superponerse a
  // los botones y conseguir que un toque borre algo (clickjacking).
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
