'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { CardSection } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Task } from '@/types'

interface HomeTasksProps {
  tasks: Task[]
  onToggle: (id: string) => void
}

export function HomeTasks({ tasks, onToggle }: HomeTasksProps) {
  const pending = tasks.filter(t => !t.completed).slice(0, 5)

  return (
    <CardSection label="Tareas pendientes">
      <div className="bg-white rounded-2xl border border-[#F0EDE8] shadow-sm overflow-hidden">
        {pending.length === 0 ? (
          <EmptyState emoji="✅" title="Sin tareas pendientes" description="" />
        ) : (
          <ul className="divide-y divide-[#F5F2EE]">
            {pending.map(task => (
              <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => onToggle(task.id)}
                  aria-label="Marcar como completada"
                  className="flex-shrink-0 group"
                >
                  <span className="w-5 h-5 rounded-full border-2 border-[#C4BFB9] flex items-center justify-center transition-all group-hover:border-[#5C7A59]">
                    <Check size={10} strokeWidth={3} className="text-transparent group-hover:text-[#5C7A59]" />
                  </span>
                </button>
                <p className="flex-1 text-sm font-medium text-[#252525] leading-snug">{task.title}</p>
                {task.due_date && (
                  <span className="text-[10px] font-semibold text-[#77716A] flex-shrink-0">{task.due_date.slice(5).replace('-', '/')}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-[#F5F2EE] px-4 py-2.5">
          <Link href="/tasks" className="text-xs font-semibold text-[#5C7A59] hover:underline">
            Ver todas las tareas →
          </Link>
        </div>
      </div>
    </CardSection>
  )
}
