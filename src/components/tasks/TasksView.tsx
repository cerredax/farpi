'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { isToday, parseISO } from 'date-fns'
import { useStore } from '@/lib/store-context'
import { selectTaskGroups, selectTaskMatches } from '@/lib/selectors'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import { ViewHeader } from '@/components/ui/ViewHeader'
import { OffDayConfirmDialog } from './OffDayConfirmDialog'
import { TaskItem } from './TaskItem'
import { TaskSheet } from './TaskSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Task, TaskDraft } from '@/types'

export function TasksView() {
  const { tasks, kids, members, createTask, updateTask, deleteTask, toggleTask } = useStore()

  const [sheetOpen, setSheetOpen]             = useState(false)
  const [editingTask, setEditingTask]         = useState<Task | null>(null)
  const [showCompleted, setShowCompleted]     = useState(false)
  const [confirmTask, setConfirmTask]         = useState<Task | null>(null)
  const [busqueda, setBusqueda]               = useState('')

  // Con cuatro tareas no hay nada que buscar: se ven de un vistazo.
  const puedeBuscar = tasks.length >= MINIMO_PARA_BUSCAR
  const buscando = busqueda.trim().length > 0
  const { pending, completed } = selectTaskGroups(selectTaskMatches(tasks, busqueda))

  // Buscando se enseña todo, lo mismo que hace el catálogo de una lista: si lo
  // único que coincide es una tarea ya hecha, dejarla debajo del pliegue sería
  // contestar "sin coincidencias" a una búsqueda que sí encontró algo. Y
  // mientras se busca no se ofrece plegar, que volvería a esconderla.
  const hechasVisibles = showCompleted || buscando

  function openCreate() { setEditingTask(null); setSheetOpen(true) }
  function openEdit(task: Task) { setEditingTask(task); setSheetOpen(true) }

  function handleToggle(task: Task) {
    const needsConfirm = !task.completed && task.due_date && !isToday(parseISO(task.due_date))
    if (needsConfirm) { setConfirmTask(task); return }
    toggleTask(task.id)
  }

  const sheetKey = editingTask ? `edit-${editingTask.id}` : 'create'

  const tituloCompletadas = (
    <>
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Completadas</h2>
      <span className="text-xs font-bold text-muted bg-line rounded-full px-2 py-0.5">{completed.length}</span>
    </>
  )

  return (
    <>
      <OffDayConfirmDialog
        open={!!confirmTask}
        task={confirmTask}
        onConfirm={() => { if (confirmTask) toggleTask(confirmTask.id); setConfirmTask(null) }}
        onCancel={() => setConfirmTask(null)}
      />
      {/* En escritorio se suelta la columna de móvil y las tareas van en dos
          columnas. La rejilla se pone en la propia `section` y la cabecera ocupa
          las dos, así no hace falta envolver la lista en un div nuevo: por
          debajo de `lg` el DOM es exactamente el de antes. */}
      <div className="max-w-lg mx-auto px-4 py-4 lg:max-w-5xl lg:px-6 lg:py-6">
        {/* La misma cabecera que Listas, Comidas y Documentos. El `+` estuvo
            flotando abajo a la derecha y era la única pantalla que lo ponía en
            otro sitio: se alcanzaba mejor con el pulgar, sí, pero a cambio
            había dos sitios distintos que aprenderse para lo mismo según en qué
            pantalla estuvieras. Con él se fue el `pb-28` que le hacía hueco
            para que no tapara la última tarea; el de la barra de abajo ya lo
            pone `AppShell`. */}
        <div className="mb-4">
          <ViewHeader
            resumen={`${tasks.length} tarea${tasks.length !== 1 ? 's' : ''} de la familia`}
            buscador={puedeBuscar ? {
              value: busqueda,
              onChange: setBusqueda,
              placeholder: `Buscar en ${tasks.length} tareas…`,
              ariaLabel: 'Buscar tareas',
            } : null}
            onAdd={openCreate}
            addLabel="Nueva tarea"
          />
        </div>

        <section className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">
          <div className="flex items-center justify-between px-1 mb-3 lg:col-span-2 lg:mb-0">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Pendientes</h2>
            {pending.length > 0 && (
              <span className="text-xs font-bold text-muted bg-line rounded-full px-2 py-0.5">{pending.length}</span>
            )}
          </div>
          {pending.length === 0 ? (
            /* Tres estados y no dos: "no queda nada por hacer" y "aquí no ha
               habido nunca nada" no son lo mismo, y una familia que estrena la
               app se encontraba un "Todo al día" felicitándola por lo que no
               había hecho. La diferencia la lleva el título; la explicación de
               para qué sirve la pantalla se fue con las demás el 09-09-2026. */
            <div className="bg-white rounded-2xl border border-surface shadow-sm lg:col-span-2">
              {buscando ? (
                <EmptyState emoji="🔍" title="Sin coincidencias" description={`Ninguna tarea pendiente con «${busqueda.trim()}»`} />
              ) : tasks.length === 0 ? (
                <EmptyState emoji="🗒️" title="Sin tareas todavía" />
              ) : (
                <EmptyState emoji="✅" title="Todo al día" />
              )}
            </div>
          ) : (
            pending.map(task => <TaskItem key={task.id} task={task} kids={kids} members={members} onToggle={() => handleToggle(task)} onEdit={openEdit} onDelete={deleteTask} />)
          )}
        </section>

        {completed.length > 0 && (
          <section className="mt-6 space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">
            {buscando ? (
              <div className="flex items-center gap-2 px-1 py-1.5 mb-2 lg:col-span-2 lg:mb-0">
                {tituloCompletadas}
              </div>
            ) : (
              <button onClick={() => setShowCompleted(v => !v)} aria-expanded={showCompleted} className="flex min-h-11 items-center gap-2 px-1 mb-2 w-full text-left rounded-xl hover:bg-surface transition-colors lg:col-span-2 lg:mb-0">
                {tituloCompletadas}
                <span className="ml-auto text-muted">{showCompleted ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
              </button>
            )}
            {hechasVisibles && completed.map(task => <TaskItem key={task.id} task={task} kids={kids} members={members} onToggle={() => handleToggle(task)} onEdit={openEdit} onDelete={deleteTask} />)}
          </section>
        )}
      </div>

      <TaskSheet
        key={sheetKey}
        open={sheetOpen}
        mode={editingTask ? 'edit' : 'create'}
        initial={editingTask}
        kids={kids}
        members={members}
        onClose={() => setSheetOpen(false)}
        onCreate={(draft: TaskDraft) => createTask(draft)}
        onUpdate={updateTask}
        onDelete={deleteTask}
      />
    </>
  )
}
