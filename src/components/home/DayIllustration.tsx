import { getDayPeriod } from '@/lib/date-utils'

interface DayIllustrationProps {
  date: Date
}

/**
 * El nido de la tarjeta de hoy: dos huevos que no cambian y un cielo que sí,
 * con el mismo tramo del día que decide el saludo (`getDayPeriod`). Ocupa el
 * hueco de las dos manchas de color que había antes, así que no añade alto.
 */
export function DayIllustration({ date }: DayIllustrationProps) {
  const period = getDayPeriod(date)

  return (
    <svg className="pointer-events-none absolute -right-1 -top-1.5 h-20 w-20 lg:h-24 lg:w-24" viewBox="0 0 96 96" aria-hidden>
      {period === 'mañana' && (
        <>
          <circle cx="66" cy="28" r="11" fill="var(--color-sand)" opacity="0.9" />
          <g stroke="var(--color-sand)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
            <line x1="66" y1="8" x2="66" y2="2" />
            <line x1="84" y1="16" x2="88" y2="12" />
            <line x1="90" y1="28" x2="96" y2="28" />
            <line x1="48" y1="16" x2="44" y2="12" />
          </g>
        </>
      )}
      {period === 'tarde' && (
        <>
          <circle cx="70" cy="40" r="12" fill="var(--color-accent)" opacity="0.95" />
          <path d="M46 54 Q 70 48 94 54" stroke="var(--color-accent)" strokeWidth="2" opacity="0.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {period === 'noche' && (
        <g fill="var(--color-primary)">
          <path d="M 60 14 A 12 12 0 1 0 74 32 A 9 9 0 0 1 60 14 Z" />
          <circle cx="42" cy="12" r="1.6" />
          <circle cx="52" cy="20" r="1.2" />
          <circle cx="34" cy="24" r="1.3" />
        </g>
      )}
      <path d="M12 66 Q 40 46 68 66" fill="none" stroke="#D8B593" strokeWidth="5" strokeLinecap="round" />
      <path d="M16 71 Q 40 54 64 71" fill="none" stroke="#B4906F" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="40" cy="78" rx="29" ry="8" fill="none" stroke="#B4906F" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="32" cy="66" rx="5.5" ry="6.5" fill="var(--color-warm)" stroke="var(--color-line)" strokeWidth="1.5" />
      <ellipse cx="47" cy="68" rx="5.5" ry="6.5" fill="var(--color-warm)" stroke="var(--color-line)" strokeWidth="1.5" />
    </svg>
  )
}
