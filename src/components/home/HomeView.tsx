'use client'

import { format, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store-context'
import { selectTodayEvents, selectTodayTasks, selectUpcomingEvents } from '@/lib/selectors'
import { cumplesDeLaCasa } from '@/lib/birthdays'
import { TodayEvents } from './TodayEvents'
import { TodayBirthdays } from './TodayBirthdays'
import { UpcomingBirthdays } from './UpcomingBirthdays'
import { TodayTasks } from './TodayTasks'
import { TodayMeals } from './TodayMeals'
import { PendingItems } from './PendingItems'
import { HomeTasks } from './HomeTasks'
import { UpcomingEvents } from './UpcomingEvents'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import type { Task } from '@/types'

function OffDayConfirmSheet({ open, task, onConfirm, onCancel }: { open: boolean; task: Task | null; onConfirm: () => void; onCancel: () => void }) {
  const dueLabel = task?.due_date ? format(parseISO(task.due_date), "d 'de' MMMM", { locale: es }) : ''
  return (
    <BottomSheet
      open={open}
      title="Confirmar tarea"
      onClose={onCancel}
      footer={
        <div className="px-5 py-4 space-y-2">
          <button
            onClick={onConfirm}
            className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
          >
            Sí, marcar como hecha
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-muted hover:bg-surface transition-colors"
          >
            Cancelar
          </button>
        </div>
      }
    >
      <div className="px-5 pb-4">
        <p className="text-sm text-muted mb-1">
          Esta tarea es para el <strong>{dueLabel}</strong>, no para hoy.
        </p>
        <p className="text-sm text-muted">¿Marcarla como hecha hoy igualmente?</p>
      </div>
    </BottomSheet>
  )
}

export function HomeView() {
  const { kids, members, allEvents, pendingTasks, todayMeals, pendingItems, toggleTask, toggleListItem } = useStore()
  const [confirmTask, setConfirmTask] = useState<Task | null>(null)

  function handleTaskToggle(id: string) {
    const task = pendingTasks.find(t => t.id === id)
    if (task && task.due_date && !isToday(parseISO(task.due_date))) {
      setConfirmTask(task)
    } else {
      toggleTask(id)
    }
  }

  const todayEvents = useMemo(() => selectTodayEvents(allEvents), [allEvents])
  const upcoming    = useMemo(() => selectUpcomingEvents(allEvents), [allEvents])

  // Los cumpleaños de casa no se guardan: salen de la fecha de nacimiento que ya
  // está en Ajustes. Los de fuera —la abuela, el amigo del cole— sí están
  // apuntados, como evento del calendario. Aquí se juntan, porque en la tarjeta
  // de hoy son lo mismo: alguien de quien hay que acordarse. Se parten en dos
  // porque el de hoy y los que vienen no se leen igual: uno se felicita y los
  // otros se preparan.
  const cumples     = useMemo(() => cumplesDeLaCasa(kids, allEvents), [kids, allEvents])
  const cumplesHoy  = cumples.filter(c => c.dias === 0)
  const cumplesProximos = cumples.filter(c => c.dias > 0)

  // Lo de hoy sube a la tarjeta; lo demás baja a "Cosas por hacer". Antes esa
  // lista mezclaba lo de esta tarde con lo de dentro de tres semanas, y hoy no
  // aparecía por ningún lado pese a que la tarjeta lo prometía.
  const { hoy: tareasHoy, resto: tareasResto } = useMemo(
    () => selectTodayTasks(pendingTasks),
    [pendingTasks],
  )

  // El mensaje de calma solo cuando el día está vacío de verdad: si hay tareas
  // para hoy, la tarjeta ya tiene algo que enseñar.
  const diaVacio = todayEvents.length === 0 && tareasHoy.length === 0 && cumplesHoy.length === 0
  const calmMessage = !diaVacio
    ? null
    : pendingTasks.length === 0 && pendingItems.length === 0
      ? 'Hoy pinta tranquilo. La casa respira un poco.'
      : 'Hoy no hay nada señalado. Lo demás puede esperar.'

  return (
    // En escritorio Inicio deja de ser una columna larga: la tarjeta de hoy
    // ocupa el ancho —es el titular de la pantalla— y debajo las cuatro
    // secciones se reparten en dos columnas, para que "qué hay que saber hoy"
    // entre de una vez sin bajar. La rejilla va en este mismo div y cada hijo
    // dice si ocupa una o dos, así que por debajo de `lg` el DOM no cambia.
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6 lg:max-w-5xl lg:px-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
      {/* El saludo y la fecha viven en la cabecera: aquí ocupaban media pantalla
          de móvil para decir algo que no se toca. */}
      <div className="relative overflow-hidden rounded-[2rem] border border-line bg-warm p-4 shadow-sm lg:col-span-2 lg:p-6">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-accent/25" />
        <div className="absolute -bottom-14 left-10 h-28 w-28 rounded-full bg-primary/20" />
        <div className="relative space-y-3">
          <p className="field-label">Lo que hay que hacer hoy</p>

          {/* Las etiquetas de los hijos vivían aquí debajo: ocupaban una fila
              entera para repetir nombres que ya salen en cada plan. */}
          <TodayBirthdays cumples={cumplesHoy} />
          <TodayEvents events={todayEvents} kids={kids} members={members} calmMessage={calmMessage} />
          <TodayTasks tasks={tareasHoy} onToggle={handleTaskToggle} />
        </div>
      </div>

      {/* Después de hoy, lo que se toca a diario: la compra pendiente y las
          tareas. Lo que viene y el menú cierran. */}
      <PendingItems items={pendingItems} onToggle={toggleListItem} />
      <HomeTasks pendingTasks={tareasResto} onToggle={handleTaskToggle} />
      <UpcomingEvents events={upcoming} kids={kids} members={members} />
      <UpcomingBirthdays cumples={cumplesProximos} />
      <TodayMeals meals={todayMeals} />

      {/* Ajustes, al final del recorrido y solo en móvil (26-08-2026). Sale de la
          esquina de arriba a la derecha de la cabecera, que es el sitio más
          alcanzable del pulgar y estaba ocupado por algo que se toca dos veces al
          año. En escritorio no se pinta: `SideNav` lo lleva desde siempre y aquí
          sería decirlo dos veces. */}
      <Link
        href="/settings"
        className="flex min-h-11 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-muted transition-colors hover:bg-surface hover:text-ink lg:hidden"
      >
        <Settings size={16} strokeWidth={2.2} aria-hidden />
        Ajustes
      </Link>

      <OffDayConfirmSheet
        open={!!confirmTask}
        task={confirmTask}
        onConfirm={() => { if (confirmTask) toggleTask(confirmTask.id); setConfirmTask(null) }}
        onCancel={() => setConfirmTask(null)}
      />
    </div>
  )
}
