import { ShieldCheck } from 'lucide-react'

/**
 * Las tres cosas que pregunta quien llega de fuera antes que ninguna otra:
 * quién ve mis datos, cuánto cuesta y si me van a poner anuncios.
 *
 * Sale **dos veces en la portada**, bajo el titular y bajo el formulario, y una
 * en la pantalla de login. No es un descuido: son los dos sitios donde alguien
 * está a punto de escribir su correo, y la respuesta tiene que estar donde se
 * duda, no en un apartado más abajo. Antes vivía dentro de `AuthCard` como una
 * frase de letra pequeña que no leía nadie.
 *
 * Los puntos son elementos aparte y marcados como decorativos: así quien usa un
 * lector de pantalla oye tres cosas y no una frase con puntos en medio.
 */
export function Garantias({ className = '' }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-ink ${className}`}>
      <li className="inline-flex items-center gap-1.5">
        <ShieldCheck size={15} strokeWidth={2.4} className="flex-shrink-0 text-primary-strong" />
        Privado para tu familia
      </li>
      <li aria-hidden className="text-muted-soft">·</li>
      <li>Gratis</li>
      <li aria-hidden className="text-muted-soft">·</li>
      <li>Sin anuncios</li>
    </ul>
  )
}
