'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { signOut } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/contexto'

/**
 * Borrar cuenta, al final de la pestaña Cuenta y separada de `AccountActions`.
 *
 * Estuvo un tiempo en Legal para que no se confundiera con cerrar sesión, que
 * era la fila de justo encima. Desde que cerrar sesión vive en el menú de la
 * cuenta (28-08-2026) no hay con qué confundirla, y buscarla en Legal no se le
 * ocurre a nadie. Lo que se mantiene es la separación visual: tarjeta aparte, en
 * rojo y con confirmación, porque no es una acción más de una lista de ajustes.
 */
export function DeleteAccountCard() {
  const router = useRouter()
  const b = useT().ajustes.borrarCuenta

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? b.noSeBorro)
      }
      await signOut()
      router.replace('/auth/login')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : b.noSeBorro)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="rounded-2xl border border-danger-line bg-danger-tint px-4 py-4">
      <p className="text-sm font-black text-ink">{b.titulo}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        {b.explicacion}
      </p>
      <button
        onClick={handleDelete}
        onBlur={() => setConfirmDelete(false)}
        disabled={deleting}
        className={`mt-3 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${confirmDelete ? 'bg-danger-strong text-white' : 'border border-danger-line text-danger-strong hover:bg-danger-soft'}`}
      >
        {deleting ? (
          <span className="inline-flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> {b.borrando}</span>
        ) : confirmDelete ? (
          b.confirmar
        ) : (
          <span className="inline-flex items-center justify-center gap-2"><Trash2 size={15} /> {b.boton}</span>
        )}
      </button>
      {deleteError && <p className="mt-2 text-xs font-medium text-danger-strong">{deleteError}</p>}
    </div>
  )
}
