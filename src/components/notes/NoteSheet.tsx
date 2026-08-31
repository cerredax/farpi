'use client'

import { Pin } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Field } from '@/components/ui/Field'
import { SelectChip } from '@/components/ui/SelectChip'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { validateNoteDraft } from '@/lib/validators'
import type { Note, NoteDraft } from '@/types'

// Veinticuatro iconos, tres filas de ocho, igual que en `ListSheet` y por la
// misma razón: nombran la nota de un vistazo en un índice donde todo lo demás
// es texto. Los de aquí son los de la casa y sus recados —el wifi, los
// teléfonos, la llave, el coche, el banco, el colegio—, no los de la compra.
// El 📝 va al final por ser el que viene puesto.
const EMOJIS = [
  '📶', '☎️', '🔑', '🏠', '💡', '🔌', '🚿', '🔢',
  '🏦', '💳', '🚗', '🅿️', '🏥', '💊', '🎒', '🏫',
  '🐾', '✈️', '📦', '🛠️', '👕', '🍽️', '📅', '📝',
]

interface NoteSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Note | null
  onClose: () => void
  onSave: (draft: NoteDraft) => void
  onDelete: (id: string) => void
}

function initDraft(mode: 'create' | 'edit', initial: Note | null | undefined): NoteDraft {
  if (mode === 'edit' && initial) {
    return {
      title:  initial.title,
      body:   initial.body ?? '',
      emoji:  initial.emoji ?? '📝',
      pinned: initial.pinned,
    }
  }
  return { title: '', body: '', emoji: '📝', pinned: false }
}

export function NoteSheet({ open, mode, initial, onClose, onSave, onDelete }: NoteSheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<NoteDraft>({
    open,
    initialDraft: () => initDraft(mode, initial),
    validate: validateNoteDraft,
  })
  const { confirming, handleDelete } = useSheetDelete({ initial, onDelete, onClose })

  const handleSubmit = submitHandler(valid => {
    onSave(valid)
    onClose()
  })

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? 'Nueva nota' : 'Editar nota'}
      onClose={onClose}
      footer={
        <SheetFooter
          form="note-form"
          submitLabel={mode === 'create' ? 'Crear nota' : 'Guardar'}
          disabled={!draft.title.trim()}
          error={formError}
          onDelete={mode === 'edit'
            ? { confirming, onClick: handleDelete, idleLabel: 'Eliminar nota', confirmLabel: 'Confirmar eliminación' }
            : undefined}
        />
      }
    >
      <form id="note-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        <Field label="Título" htmlFor="note-title">
          <input
            id="note-title"
            ref={firstFieldRef}
            type="text"
            value={draft.title}
            onChange={e => patch({ title: e.target.value })}
            placeholder="Ej: Wifi de casa"
            required
            className="field-input"
          />
        </Field>

        {/* El cuerpo es texto libre y nada más: sin campos, sin formato y sin
            tipos de nota. Lo que hace falta apuntar en una casa no cabe en un
            formulario —"el contador está en el rellano, llave pequeña del
            llavero azul" no es un campo—, y en cuanto hubiera que elegir entre
            "teléfono" y "contraseña" habría que decidir dónde cae el código de
            la alarma, que es las dos cosas. */}
        <Field label="Contenido" htmlFor="note-body" hint="(opcional)">
          <textarea
            id="note-body"
            value={draft.body}
            onChange={e => patch({ body: e.target.value })}
            rows={6}
            placeholder={'Red: FARPI_2G\nClave: …'}
            className="field-input resize-none"
          />
          {/* Dicho aquí y no en la letra pequeña de `/privacidad`: quien va a
              escribir una contraseña la escribe en este campo, no leyendo la
              política. Es texto plano en la base, protegido por la RLS y por
              nada más. */}
          <p className="text-[10px] leading-relaxed text-faint">
            Solo lo ve tu familia. Farpi no es un gestor de contraseñas: no guardes
            aquí las claves del banco o del correo.
          </p>
        </Field>

        <Field label="Icono" spacing="group">
          <div className="grid grid-cols-8 gap-2">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => patch({ emoji })}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-colors ${draft.emoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : 'bg-canvas hover:bg-surface'}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Field>

        {/* Fijar se marca aquí y no en la tarjeta: es un gesto que se hace una
            vez, al escribir la nota, y ponerlo en el índice obligaría a partir
            la tarjeta en dos zonas pulsables. */}
        <Field label="Fijar" spacing="group">
          <SelectChip selected={draft.pinned} onClick={() => patch({ pinned: !draft.pinned })}>
            <Pin size={13} strokeWidth={2.4} aria-hidden />
            Arriba del todo
          </SelectChip>
          <p className="text-[10px] leading-relaxed text-faint">
            Las fijadas se quedan las primeras. Para lo que se consulta siempre y
            no se toca nunca, como la clave del wifi.
          </p>
        </Field>
      </form>
    </BottomSheet>
  )
}
