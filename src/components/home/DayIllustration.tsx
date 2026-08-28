import { getDayPeriod } from '@/lib/date-utils'

interface DayIllustrationProps {
  date: Date
}

/**
 * La casa de la tarjeta de hoy: chimenea, ventana con forma de corazón sobre
 * la puerta y un arbusto al lado, siempre igual, con un cielo que cambia con
 * el mismo tramo del día que decide el saludo (`getDayPeriod`). De noche la
 * ventana se enciende en vez de llevar el color de acento. Ocupa el hueco de
 * las dos manchas de color que había antes, así que no añade alto.
 */
export function DayIllustration({ date }: DayIllustrationProps) {
  const period = getDayPeriod(date)

  return (
    <svg className="pointer-events-none absolute -right-1 -top-1.5 h-20 w-20 lg:h-24 lg:w-24" viewBox="0 0 96 96" aria-hidden>
      {period === 'mañana' && (
        <g stroke="var(--color-sand)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
          <circle cx="70" cy="26" r="10" fill="var(--color-sand)" stroke="none" />
          <line x1="70" y1="8" x2="70" y2="3" />
          <line x1="86" y1="14" x2="90" y2="10" />
          <line x1="90" y1="26" x2="96" y2="26" />
        </g>
      )}
      {period === 'tarde' && (
        <>
          <circle cx="73" cy="38" r="11" fill="var(--color-accent)" opacity="0.95" />
          <path d="M50 50 Q 73 45 95 50" stroke="var(--color-accent)" strokeWidth="2" opacity="0.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {period === 'noche' && (
        <g fill="var(--color-primary)">
          <path d="M 66 12 A 11 11 0 1 0 79 29 A 8 8 0 0 1 66 12 Z" />
          <circle cx="46" cy="10" r="1.5" />
          <circle cx="56" cy="18" r="1.1" />
          <circle cx="88" cy="22" r="1.2" />
        </g>
      )}
      <path d="M19 28 Q 23 23 19 18 Q 15 13 19 9" stroke="var(--color-muted)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.45" strokeDasharray="1 3.4" />
      <rect x="16" y="29" width="7" height="13" fill="#D8B593" stroke="#B4906F" strokeWidth="1" />
      <path d="M9 52 L34 25 L59 52 Z" fill="var(--color-primary)" />
      <rect x="13" y="50" width="42" height="29" rx="3" fill="var(--color-warm)" stroke="var(--color-line)" strokeWidth="1.5" />
      <rect x="27" y="61" width="13" height="18" rx="2" fill="#B4906F" />
      <circle cx="37.5" cy="70.5" r="1" fill="var(--color-warm)" />
      <path
        d="M34 60 C32.3 57.4 28.5 56.4 28.5 53 C28.5 50.9 30.5 49.5 32.1 50.6 C32.9 51.1 33.5 51.8 34 52.3 C34.5 51.8 35.1 51.1 35.9 50.6 C37.5 49.5 39.5 50.9 39.5 53 C39.5 56.4 35.7 57.4 34 60 Z"
        fill={period === 'noche' ? '#F1E6D8' : 'var(--color-accent)'}
      />
      <ellipse cx="63" cy="71" rx="7" ry="8" fill="var(--color-primary)" opacity="0.85" />
      <ellipse cx="70" cy="74" rx="5.5" ry="6" fill="var(--color-primary)" opacity="0.7" />
      <line x1="63" y1="79" x2="63" y2="83" stroke="#B4906F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
