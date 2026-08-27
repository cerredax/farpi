'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import { CircleCheck } from '@/components/ui/CircleCheck'
import { TAREAS_PARA_PLEGAR } from '@/lib/constants'
import { fondoDePersona, resolveAssignee } from '@/lib/assignees'
import type { Child, FamilyMember, Task } from '@/types'

/**
 * Las tareas que vencen un día, para el calendario. Las comparten la agenda por
 * horas —donde van en la franja de "todo el día", porque una tarea vence pero no
 * ocurre a una hora— y la lista de próximos eventos.
 */

/**
 * Una tarea. Lleva el círculo de marcar y no el punto de color de los eventos:
 * una tarea se hace, un evento pasa. Se marca desde aquí porque el día ya se
 * está mirando, y bajar a Tareas para tachar lo de hoy es el viaje que nadie
 * hace.
 */
function TaskRow({ task, kids, members, atrasada, onToggle, mostrarPersona }: {
  task: Task
  kids: Child[]
  members: FamilyMember[]
  atrasada: boolean
  onToggle: (id: string) => void
  mostrarPersona: boolean
}) {
  const asignado = resolveAssignee(task, members, kids)

  return (
    <div className="flex items-center gap-1.5 px-1.5">
      <CircleCheck
        checked={false}
        onClick={() => onToggle(task.id)}
        ariaLabel={`Marcar "${task.title}" como completada`}
        size="sm"
        // w-8 y no el w-12 por defecto: la fila ya va sangrada, y esos 16 px de
        // más salían del título. Sigue midiendo 32×44, muy por encima de 24×24.
        className="w-8"
      />
      <span className="min-w-0 flex-1 truncate text-sm text-ink" title={task.title}>{task.title}</span>
      {/* Tope de ancho: el nombre no cedía nunca y el título cedía siempre, así
          que "Pedir cita tarjeta sanitaria" se quedaba en "Pedir cita tarjeta
          san…" para dejar sitio a un nombre entero. */}
      {/* El nombre sobre su color, como en la fila de al lado y en la celda del
          mes: dentro de la misma tarjeta no pueden hablar de dos maneras. */}
      {mostrarPersona && asignado && (
        <span
          className="etiqueta-persona max-w-[4.5rem] flex-shrink-0 px-1 py-px text-[11px]"
          style={{ backgroundColor: fondoDePersona(asignado.color) }}
        >
          {asignado.name}
        </span>
      )}
      {/* Icono y no la palabra "Atrasada": en un móvil de 390 px, la etiqueta se
          comía media fila. El nombre completo va en la etiqueta accesible. */}
      {atrasada && (
        <AlertTriangle size={13} strokeWidth={2.6} className="flex-shrink-0 text-danger" aria-label="Atrasada" />
      )}
    </div>
  )
}

/**
 * La línea que resume el montón: cuántas hay y cuántas van tarde. Resume, no
 * esconde —el recuento va en el texto y se abre de un toque—, que es lo que
 * pide "desaparecer no es lo que le pasa a una tarea sin hacer".
 */
function TaskSummary({ total, atrasadas, abierto, onToggle }: {
  total: number
  atrasadas: number
  abierto: boolean
  onToggle: () => void
}) {
  // Cuando todas van tarde —el caso normal en el día de hoy, que es donde cae
  // todo lo arrastrado— el número va una sola vez y dentro de la frase. Decir
  // "6 tareas pendientes" y al lado "6 atrasadas" repetía el seis y no cabía a
  // 390 px: el propio resumen salía cortado en "6 tareas pendie…".
  const todasTarde = atrasadas === total
  const etiqueta = todasTarde ? `${total} tareas atrasadas` : `${total} tareas`
  const insignia = !todasTarde && atrasadas > 0 ? `${atrasadas} atrasada${atrasadas === 1 ? '' : 's'}` : null
  const enRojo = !abierto && todasTarde && atrasadas > 0

  return (
    <button
      onClick={onToggle}
      aria-expanded={abierto}
      className="flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-canvas"
    >
      <span className="flex w-8 flex-shrink-0 justify-center">
        <ChevronDown
          size={16}
          strokeWidth={2.6}
          className={`text-muted transition-transform ${abierto ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </span>
      {enRojo && <AlertTriangle size={13} strokeWidth={2.6} className="flex-shrink-0 text-danger" aria-hidden />}
      <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${enRojo ? 'text-danger' : 'text-muted'}`}>
        {abierto ? 'Ocultar las tareas' : etiqueta}
      </span>
      {!abierto && insignia && (
        <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-bold text-danger">
          <AlertTriangle size={13} strokeWidth={2.6} aria-hidden />
          {insignia}
        </span>
      )}
    </button>
  )
}

export function DayTasks({ tasks, kids, members, hoy, onToggle, mostrarPersona = true }: {
  tasks: Task[]
  kids: Child[]
  members: FamilyMember[]
  /** Fecha de hoy en yyyy-MM-dd, para saber qué va tarde. */
  hoy: string
  onToggle: (id: string) => void
  /**
   * El nombre de quien la lleva. Se apaga cuando la lista va agrupada por
   * persona y el rótulo de arriba ya lo dice, igual que en la fila del evento
   * de al lado: dentro de la misma tarjeta las dos filas hablan igual.
   */
  mostrarPersona?: boolean
}) {
  const [abierto, setAbierto] = useState(false)

  if (tasks.length === 0) return null

  const plegar = tasks.length >= TAREAS_PARA_PLEGAR
  const atrasadas = tasks.filter(t => !!t.due_date && t.due_date < hoy).length

  return (
    <>
      {plegar && (
        <TaskSummary
          total={tasks.length}
          atrasadas={atrasadas}
          abierto={abierto}
          onToggle={() => setAbierto(v => !v)}
        />
      )}
      {(!plegar || abierto) && tasks.map(task => (
        <TaskRow
          key={task.id}
          task={task}
          kids={kids}
          members={members}
          atrasada={!!task.due_date && task.due_date < hoy}
          onToggle={onToggle}
          mostrarPersona={mostrarPersona}
        />
      ))}
    </>
  )
}
