'use client'

import Link from 'next/link'
import { memo, useMemo } from 'react'
import { HomeSection } from '@/components/ui/HomeSection'
import { CircleCheck } from '@/components/ui/CircleCheck'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Task } from '@/types'

interface HomeTasksProps {
  pendingTasks: Task[]
  onToggle: (id: string) => void
}

export const HomeTasks = memo(function HomeTasks({ pendingTasks, onToggle }: HomeTasksProps) {
  const visible = useMemo(() => pendingTasks.slice(0, 5), [pendingTasks])

  return (
    <HomeSection
      label="Cosas por hacer"
      isEmpty={visible.length === 0}
      emptyState={<EmptyState emoji="✓" title="La casa esta al dia" />}
      footer={
        <Link href="/tasks" className="text-xs font-semibold text-[#5C7A59] hover:underline">
          Ver todas las tareas
        </Link>
      }
    >
      <ul className="divide-y divide-[#F5F2EE]">
        {visible.map(task => (
          <li key={task.id} className="flex items-center gap-3 px-4 py-3">
            <CircleCheck
              checked={false}
              onClick={() => onToggle(task.id)}
              ariaLabel="Marcar como completada"
              size="sm"
              className="w-auto"
            />
            <p className="flex-1 text-sm font-medium text-[#252525] leading-snug">{task.title}</p>
            {task.due_date && (
              <span className="text-[10px] font-semibold text-[#77716A] flex-shrink-0">
                {task.due_date.slice(5).replace('-', '/')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </HomeSection>
  )
})
