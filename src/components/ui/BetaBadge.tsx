/**
 * «Beta»: esto funciona, pero todavía puede cambiar.
 *
 * Nació el 28-09-2026 para salir en Google Play con dos piezas de Finanzas que
 * aún se están afinando —los presupuestos de fuera y traer el extracto del banco—
 * sin esconderlas: la familia ya las usa con datos reales. La pastilla avisa de
 * que la forma puede moverse, no de que los datos corran peligro.
 *
 * Salmón sobre su tinte, 6,0:1: es texto, así que va en `-strong`.
 */
export function BetaBadge() {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded-full bg-accent-tint px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-accent-strong">
      Beta
    </span>
  )
}
