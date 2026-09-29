import { ShieldCheck } from 'lucide-react'

/**
 * Las tres cosas que pregunta quien llega de fuera antes que ninguna otra:
 * quién ve mis datos, cuánto cuesta y si me van a poner anuncios.
 *
 * Sale donde alguien está a punto de escribir su correo, porque la respuesta
 * tiene que estar donde se duda y no en un apartado más abajo: bajo el
 * formulario de `AuthCard` en el login, y en la portada bajo el titular, que va
 * al lado del formulario. Ahí `AuthCard` no la repite (`conGarantias={false}`)
 * desde el 28-09-2026: las dos a la misma altura se leían como un descuido.
 * Antes vivía dentro de `AuthCard` como una frase de letra pequeña que no leía
 * nadie.
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
