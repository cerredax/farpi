'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useStore } from '@/lib/store-context'

export function DataExport() {
  const { family, members, invites, kids, allEvents, tasks, lists, allListItems, meals, documents } = useStore()
  const [done, setDone] = useState(false)

  function handleExport() {
    const data = {
      exportedAt: new Date().toISOString(),
      family,
      members,
      invites,
      children: kids,
      events: allEvents,
      tasks,
      lists,
      listItems: allListItems,
      meals,
      documents, // metadata; los archivos no se incluyen
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const slug = (family?.name ?? 'familia')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'familia'
    const link = document.createElement('a')
    link.href = url
    link.download = `nido-${slug}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setDone(true)
  }

  return (
    <div className="bg-white rounded-2xl border border-surface shadow-sm px-4 py-4 space-y-3">
      <p className="text-xs leading-relaxed text-muted">
        Descarga una copia de los datos de tu familia (eventos, tareas, listas, comidas y la información de los
        documentos) en un archivo JSON. Los archivos de documentos no se incluyen.
      </p>
      <button
        onClick={handleExport}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface"
      >
        <Download size={15} strokeWidth={2.2} />
        Exportar datos (JSON)
      </button>
      {done && <p className="text-xs font-medium text-primary-strong">Copia descargada.</p>}
    </div>
  )
}
