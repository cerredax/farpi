'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, LogOut, Loader2, Trash2 } from 'lucide-react'
import { createClient, signOut } from '@/lib/supabase/client'

const PASSWORD_MIN = 8

export function AccountActions() {
  const router = useRouter()

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [password, setPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwDone, setPwDone] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < PASSWORD_MIN) {
      setPwError(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`)
      return
    }
    setPwBusy(true)
    setPwError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setPwBusy(false)
    if (error) {
      setPwError(error.message)
      return
    }
    setPassword('')
    setShowPasswordForm(false)
    setPwDone(true)
  }

  async function handleLogout() {
    await signOut()
    router.replace('/auth/login')
  }

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
    <div className="space-y-3">
      {/* Las dos acciones normales en una sola tarjeta, como filas: eran dos
          tarjetas de una línea cada una, con un botón enmarcado dentro de un
          marco. Aquí se leen como lo que son, dos cosas que se pueden hacer con
          la cuenta, y ocupan la mitad. */}
      <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm">
        {showPasswordForm ? (
          <form onSubmit={handleChangePassword} className="space-y-3 p-4">
            <label htmlFor="new-password" className="field-label">Nueva contraseña</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPwError(null) }}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className="field-input"
            />
            {pwError && <p className="text-xs font-medium text-danger">{pwError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={pwBusy} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60">
                {pwBusy ? <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Guardando…</span> : 'Guardar'}
              </button>
              <button type="button" onClick={() => { setShowPasswordForm(false); setPassword(''); setPwError(null) }} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => { setShowPasswordForm(true); setPwDone(false) }} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-canvas">
            <KeyRound size={16} strokeWidth={2} className="flex-shrink-0 text-muted" />
            Cambiar contraseña
          </button>
        )}
        {pwDone && !showPasswordForm && (
          <p className="px-4 pb-3 text-xs font-medium text-primary-strong">Contraseña actualizada.</p>
        )}
        <button onClick={handleLogout} className="flex w-full items-center gap-3 border-t border-hairline px-4 py-3.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-canvas">
          <LogOut size={16} strokeWidth={2} className="flex-shrink-0 text-muted" />
          Cerrar sesión
        </button>
      </div>

      {/* Borrar cuenta. Va aparte y en rojo a propósito: no es una acción más de
          la lista de arriba, y tiene que costar confundirla con cerrar sesión. */}
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
    </div>
  )
}
