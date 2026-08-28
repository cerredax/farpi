'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { signOut } from '@/lib/supabase/client'

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
        throw new Error(body.error ?? 'No se pudo borrar la cuenta.')
      }
      await signOut()
      router.replace('/auth/login')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo borrar la cuenta.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="rounded-2xl border border-danger-line bg-danger-tint px-4 py-4">
      <p className="text-sm font-black text-ink">Borrar cuenta</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Elimina tu cuenta y tus datos. Las familias donde eres el único miembro se borran por completo. Si eres el único administrador de una familia compartida, tendrás que nombrar a otro administrador antes.
      </p>
      <button
        onClick={handleDelete}
        onBlur={() => setConfirmDelete(false)}
        disabled={deleting}
        className={`mt-3 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${confirmDelete ? 'bg-danger text-white' : 'border border-danger-line text-danger hover:bg-danger-soft'}`}
      >
        {deleting ? (
          <span className="inline-flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> Borrando…</span>
        ) : confirmDelete ? (
          'Confirmar borrado definitivo'
        ) : (
          <span className="inline-flex items-center justify-center gap-2"><Trash2 size={15} /> Borrar mi cuenta</span>
        )}
      </button>
      {deleteError && <p className="mt-2 text-xs font-medium text-danger">{deleteError}</p>}
    </div>
  )
}
