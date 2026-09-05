'use client'

import { Eraser, Lock, LockOpen } from 'lucide-react'
import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'

interface CierreDelMesProps {
  /** Aún no está cerrado y ya ha empezado, así que se puede dar por cerrado. */
  sePuedeCerrar: boolean
  /** Se cerró antes de tiempo y el mes sigue siendo el de hoy: se puede deshacer. */
  sePuedeReabrir: boolean
  /** Es un mes pasado con copia: se puede quitar y dejarlo en cero. */
  sePuedePonerACero: boolean
  /** «Septiembre 2026». Va en el diálogo, que es donde hay que decir de qué mes se habla. */
  nombreDelMes: string
  onCerrar: () => void
  onReabrir: () => void
  onPonerACero: () => void
}

/** Cuál de los dos diálogos está abierto. */
type Pendiente = 'cerrar' | 'cero' | null

/**
 * Qué se puede hacer con el mes que se está mirando: darlo por cerrado,
 * deshacerlo o ponerlo a cero.
 *
 * **Va al pie de la pestaña, lo último de todo** (04-09-2026, pedido). Estuvo
 * ahí desde el 02-09, subió a debajo de la tarjeta el 03-09 —porque abajo había
 * que recorrer las partidas y todos los apuntes para encontrarlo— y vuelve
 * abajo: puesto arriba se cruza en el camino cada vez que se entra a mirar el
 * mes, y cerrar es lo que se hace **cuando has terminado de mirarlo**. Que cueste
 * un poco llegar no es un defecto en un botón que se pulsa una vez al mes, y que
 * además casi nunca hace falta pulsar —el mes se cierra solo—.
 *
 * Está **fuera** de la tarjeta y separado por su línea, que es lo que la salvó de
 * convertirse en un panel de mandos.
 *
 * Tres cosas, nunca dos a la vez:
 *
 * 1. **Cerrar mes.** Un atajo, no una tarea: si nadie lo toca, el mes se cierra
 *    solo el día 1. Sirve para lo único que no se podía hacer de otra manera
 *    —preparar un cambio de la plantilla que valga a partir del mes que viene,
 *    porque el mes en curso es espejo de ella—.
 * 2. **Reabrir mes**, mientras el mes cerrado siga siendo el de hoy. No pide
 *    confirmación: no pierde nada.
 * 3. **Poner el mes a cero** (03-09-2026), en un mes pasado. Borra la copia y lo
 *    deja como el mes que nunca se cerró: en cero y diciéndolo. Existe porque el
 *    cierre automático llegó a guardar meses que no se vivieron —agosto, con unas
 *    nóminas creadas el 1 de septiembre— y no había forma de quitarlos. **Los
 *    apuntes no se borran**, y el diálogo lo dice antes de que nadie lo pregunte.
 *
 * **Son botones y no enlaces, y se llaman en dos palabras** (04-09-2026). Eran
 * texto verde centrado —«Dar el mes por cerrado», «Volver a seguir la plantilla
 * este mes»— y no parecían pulsables: en una pantalla donde casi todo lo verde y
 * pequeño es una etiqueta, se leían como un pie de la tarjeta. Ahora son botones de
 * verdad y los tres rótulos se acortaron a la vez: dejar uno corto y dos largos
 * habría sido peor que como estaban. Lo que **no** son es `fullWidth`: una barra a
 * todo lo ancho devolvería a la tarjeta el panel de mandos que se le quitó el 03-09.
 *
 * **Solo «Cerrar mes» lleva color**, y es ámbar y no rojo. Se pidió «más rojo o algo
 * así, para que se vea que es cerrar el mes», y el ámbar da esa presencia sin decir
 * lo que no es: cerrar el mes **no destruye nada** y se deshace mientras siga siendo
 * el mes en curso. El rojo se queda para «Poner el mes a cero», que sí borra —y que
 * por eso lo lleva en su diálogo—: si los dos botones fueran rojos, el que de verdad
 * hay que pensarse dos veces dejaría de distinguirse. «Reabrir mes» no lleva ninguno
 * porque no cuesta nada equivocarse: se vuelve a pulsar el otro.
 *
 * **Las dos que cambian algo piden confirmación en un diálogo** (03-09-2026), no
 * con el doble toque de `useConfirmAction` que usa el resto de la app. Es la
 * excepción a la regla y tiene motivo: el doble toque vale para deshacer algo que
 * se ve —borrar una fila que sigue ahí— y aquí lo que cambia es el mes entero,
 * fuera de la vista, sin nada que enseñe qué acaba de pasar. Un renglón que se
 * pone en rojo un segundo no es sitio para explicar que se van a congelar los
 * fijos de hoy.
 *
 * **Y con el diálogo se fue el texto de debajo.** Explicaba lo mismo, a 10 px y
 * todo el rato, a alguien que casi nunca va a pulsar ese botón; ahora lo cuenta el
 * diálogo, que es cuando hace falta saberlo.
 */
export function CierreDelMes({
  sePuedeCerrar, sePuedeReabrir, sePuedePonerACero, nombreDelMes,
  onCerrar, onReabrir, onPonerACero,
}: CierreDelMesProps) {
  const [pendiente, setPendiente] = useState<Pendiente>(null)

  if (!sePuedeCerrar && !sePuedeReabrir && !sePuedePonerACero) return null

  const confirmar = () => {
    if (pendiente === 'cerrar') onCerrar()
    if (pendiente === 'cero') onPonerACero()
    setPendiente(null)
  }

  return (
    <section aria-label="Cierre del mes" className="flex flex-col items-center border-t border-hairline pt-3">
      {sePuedePonerACero ? (
        <Button variant="secondary" size="sm" onClick={() => setPendiente('cero')} className="flex items-center gap-1.5">
          <Eraser size={13} strokeWidth={2.4} aria-hidden />
          Poner el mes a cero
        </Button>
      ) : sePuedeCerrar ? (
        <Button variant="warn" size="sm" onClick={() => setPendiente('cerrar')} className="flex items-center gap-1.5">
          <Lock size={13} strokeWidth={2.4} aria-hidden />
          Cerrar mes
        </Button>
      ) : (
        <>
          <Button variant="secondary" size="sm" onClick={onReabrir} className="flex items-center gap-1.5">
            <LockOpen size={13} strokeWidth={2.4} aria-hidden />
            Reabrir mes
          </Button>
          {/* Este sí se queda: no hay diálogo donde contarlo, porque deshacerlo
              no pide confirmación —no pierde nada— y la pega es de tiempo, no de
              lo que va a pasar al pulsar. */}
          <p className="mt-1 px-1 text-center text-[11px] leading-relaxed text-faint">
            Este mes está cerrado a mano. Solo se puede deshacer mientras siga siendo el
            mes en curso.
          </p>
        </>
      )}

      <BottomSheet
        open={pendiente !== null}
        title={pendiente === 'cero' ? 'Poner el mes a cero' : 'Cerrar mes'}
        onClose={() => setPendiente(null)}
        footer={
          <div className="space-y-2 px-5 py-4">
            <button
              type="button"
              onClick={confirmar}
              className={`w-full rounded-2xl py-3 text-sm font-semibold text-white transition-colors ${
                pendiente === 'cero' ? 'bg-danger hover:opacity-90' : 'bg-primary hover:bg-primary-hover'
              }`}
            >
              {pendiente === 'cero' ? 'Sí, ponerlo a cero' : 'Sí, cerrar el mes'}
            </button>
            <button
              type="button"
              onClick={() => setPendiente(null)}
              className="w-full rounded-2xl py-3 text-sm font-semibold text-muted transition-colors hover:bg-surface"
            >
              Cancelar
            </button>
          </div>
        }
      >
        <div className="space-y-2 px-5 pb-4 text-sm text-muted">
          {pendiente === 'cero' ? (
            <>
              <p>
                Se quitan los fijos y las partidas que se le guardaron a{' '}
                <strong className="text-ink">{nombreDelMes}</strong>, y el mes queda como
                si no se hubiera cerrado: en cero, y diciéndolo.
              </p>
              <p>Lo que se apuntó ese mes <strong className="text-ink">no se toca</strong>.</p>
            </>
          ) : (
            <>
              <p>
                Se guardan en <strong className="text-ink">{nombreDelMes}</strong> los
                fijos y las partidas de ahora mismo. A partir de ahí este mes deja de
                moverse cuando cambies la plantilla en «Lo fijo».
              </p>
              <p>No hace falta hacerlo: el día 1 se cierra solo.</p>
            </>
          )}
        </div>
      </BottomSheet>
    </section>
  )
}
