'use client'

import { Check } from 'lucide-react'
import { fondoDePersona, type Assignee } from '@/lib/assignees'

/**
 * De quién se enseña lo del calendario: una pastilla por persona, encendida o
 * apagada.
 *
 * **Media pregunta del calendario de una casa es "¿y qué tiene Cris?"** y hasta
 * el 12-09-2026 se contestaba escaneando colores: la rejilla pintaba todo de
 * todos y la única forma de aislar a alguien era saberse la paleta. Es lo que en
 * Google son los calendarios de la columna de la izquierda, que es justo el
 * gesto que la gente ya trae aprendido de casa.
 *
 * Decisiones, y por qué:
 *
 * - **Apaga, no resalta.** Atenuar lo de los demás deja la pantalla igual de
 *   llena y encima con dos niveles de gris que hay que interpretar. Apagado es
 *   apagado: lo que queda es lo que hay.
 * - **Se guarda quién está apagado, no quién está encendido.** Así, cuando entre
 *   alguien nuevo en la familia, sus cosas se ven desde el primer día en vez de
 *   quedarse invisibles porque no estaba en la lista cuando se eligió.
 * - **Dura lo que dura la pantalla.** Es un "déjame ver solo esto un momento", no
 *   un ajuste: al volver al calendario está otra vez todo, que es como tiene que
 *   abrir una pantalla que contesta "¿qué hay en casa?".
 * - **Solo se pinta si hay a quién filtrar.** Con la familia y un adulto, elegir
 *   entre dos no es filtrar; son 44 px de pantalla para nada. El corte está en
 *   tres, y lo decide `CalendarView`.
 * - **El apagado no es solo color.** Lleva el tic fuera y el nombre tachado: el
 *   encendido y el apagado de un color claro se parecen demasiado como para
 *   fiarlo al fondo, y es la misma regla que el resto de la app —el color nunca
 *   es la única señal—.
 */

interface PersonFilterProps {
  personas: Assignee[]
  /** Las claves apagadas. Lo que no está aquí, se ve. */
  ocultos: Set<string>
  onToggle: (key: string) => void
  /** Vuelve a encenderlo todo. Solo se ofrece cuando hay algo apagado. */
  onTodos: () => void
}

export function PersonFilter({ personas, ocultos, onToggle, onTodos }: PersonFilterProps) {
  const hayFiltro = ocultos.size > 0

  return (
    <div
      role="group"
      aria-label="De quién se enseña"
      // Una sola fila que se desliza: con la familia, dos adultos, dos hijos y la
      // abuela son seis pastillas, y a 390 px partirlas en dos renglones mueve el
      // mes hacia abajo cada vez que entra alguien nuevo. `-mx-4 px-4` hace que
      // la primera y la última lleguen al borde de la pantalla al deslizar, en vez
      // de cortarse contra el margen.
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-2 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
    >
      {personas.map(persona => {
        const apagado = ocultos.has(persona.key)
        return (
          <button
            key={persona.key}
            type="button"
            onClick={() => onToggle(persona.key)}
            aria-pressed={!apagado}
            aria-label={`${apagado ? 'Enseñar' : 'Esconder'} lo de ${persona.name}`}
            className={`flex h-11 flex-shrink-0 items-center gap-1 rounded-2xl border px-3 text-xs font-bold transition-colors ${
              apagado
                ? 'border-line bg-transparent text-muted line-through'
                : 'border-transparent text-ink'
            }`}
            // El color de la persona solo cuando está encendida. Al 50 %, la
            // rebaja de siempre: es la que deja leer tinta encima.
            style={apagado ? undefined : { backgroundColor: fondoDePersona(persona.color) }}
          >
            {!apagado && <Check size={13} strokeWidth={3} className="flex-shrink-0" aria-hidden />}
            {persona.name}
          </button>
        )
      })}

      {/* Salir del filtro de una vez. Solo cuando hay algo apagado: es la
          contrapartida de que el filtro no se guarde —si te dejas a alguien
          escondido, la forma de volver está a un toque y no hay que acordarse de
          a quién apagaste—. */}
      {hayFiltro && (
        <button
          type="button"
          onClick={onTodos}
          className="flex h-11 flex-shrink-0 items-center rounded-2xl px-3 text-xs font-bold text-primary-strong transition-colors hover:bg-surface"
        >
          Ver todo
        </button>
      )}
    </div>
  )
}
