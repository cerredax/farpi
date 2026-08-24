'use client'

import { memo, useMemo } from 'react'
import { HomeSection } from '@/components/ui/HomeSection'
import { SectionLink } from '@/components/ui/SectionLink'
import { CircleCheck } from '@/components/ui/CircleCheck'
import type { Task } from '@/types'

interface HomeTasksProps {
  /** Solo lo que no es de hoy: lo de hoy vive en la tarjeta del día. */
  pendingTasks: Task[]
  onToggle: (id: string) => void
}

export const HomeTasks = memo(function HomeTasks({ pendingTasks, onToggle }: HomeTasksProps) {
  const visible = useMemo(() => pendingTasks.slice(0, 5), [pendingTasks])

  // Sin nada pendiente, la sección entera desaparece en vez de enseñar "La casa
  // está al día". Inicio contesta "¿qué hay que saber hoy?", y una tarjeta que
  // ocupa lo mismo que tres tareas para decir que no hay ninguna es ruido en la
  // única pantalla donde el sitio se paga caro. Los demás vacíos de Inicio sí se
  // quedan: el del menú y el de la compra dicen algo que se hace ("improvisar
  // también cuenta"), no solo que no hay nada.
  if (visible.length === 0) return null

  return (
    <HomeSection
      label="Lo demás por hacer"
      footer={
        <SectionLink href="/tasks">Ver todas las tareas</SectionLink>
      }
    >
      <ul className="divide-y divide-hairline">
        {visible.map(task => (
          <li key={task.id} className="flex items-center gap-3 px-4 py-3">
            <CircleCheck
              checked={false}
              onClick={() => onToggle(task.id)}
              ariaLabel="Marcar como completada"
              size="sm"
              className="w-10"
            />
            <p className="flex-1 text-sm font-medium text-ink leading-snug">{task.title}</p>
            {task.due_date && (
              <span className="text-[10px] font-semibold text-muted flex-shrink-0">
                {task.due_date.slice(5).replace('-', '/')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </HomeSection>
  )
})
