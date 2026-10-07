'use client'

import { useState } from 'react'
import { FolderInput, Mic, Square } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { Suggestions } from '@/components/ui/Suggestions'
import { useDictado } from '@/hooks/useDictado'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { separarItems } from '@/lib/dictado'
import { selectSuggestions } from '@/lib/selectors'
import { validateListItemDraft } from '@/lib/validators'
import { useT } from '@/lib/i18n/contexto'
import type { ListItem, ListItemDraft } from '@/types'

interface ItemSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: ListItem | null
  /** Ítems ya apuntados por la familia; de aquí salen las sugerencias. */
  historial?: string[]
  /**
   * El título del sheet, cuando hay que decir **en qué lista** cae lo que se
   * apunta. Dentro de una lista sobra —ya se está mirando—, pero desde Inicio
   * el sheet aparece encima de la pantalla de hoy y "Añadir ítem" no dice a
   * dónde va.
   */
  titulo?: string
  /**
   * Mandar el ítem a otra lista. **Sin él no hay botón**: con una sola lista no
   * hay a dónde mover, y desde Inicio esto se abre solo para apuntar.
   *
   * Vive aquí desde el 09-09-2026. Estaba en la propia fila, junto a la papelera
   * y a los dos botones de las unidades: cuatro objetivos de 28 px a 2 px unos
   * de otros en el borde por donde pasa el pulgar. Aquí cabe con su nombre
   * escrito, que además dice lo que hace.
   */
  onMove?: () => void
  onClose: () => void
  onCreate: (draft: ListItemDraft) => void
  onUpdate: (id: string, draft: ListItemDraft) => void
  onDelete: (id: string) => void
}

// Sin `list_id`: aquí solo se renombra. Mover es cosa del MoveItemSheet, y
// mandar la lista en cada edición obligaría a este formulario a saber en cuál
// está el ítem para no moverlo a ninguna parte.
function initDraft(mode: 'create' | 'edit', initial: ListItem | null | undefined): ListItemDraft {
  return { text: mode === 'edit' && initial ? initial.text : '' }
}

export function ItemSheet({ open, mode, initial, historial = [], titulo, onMove, onClose, onCreate, onUpdate, onDelete }: ItemSheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<ListItemDraft>({
    open,
    initialDraft: () => initDraft(mode, initial),
    validate: validateListItemDraft,
  })
  const { confirming, handleDelete } = useSheetDelete({ initial, onDelete, onClose })
  const t = useT().listas.itemSheet

  const sugerencias = selectSuggestions(historial, draft.text)

  // Lo dictado puede ser varios ítems en una frase («leche, pan y huevos»). Solo
  // entonces se parte: un ítem escrito a mano, «sal y pimienta», es uno. Se
  // rearma en cada apertura con el mismo ajuste en render que usa `useSheetForm`.
  const [porVoz, setPorVoz] = useState(false)
  const [abiertoAntes, setAbiertoAntes] = useState(open)
  if (open !== abiertoAntes) {
    setAbiertoAntes(open)
    if (open) setPorVoz(false)
  }
  const dictado = useDictado(texto => {
    patch({ text: separarItems(texto).join(', ') || texto })
    setPorVoz(true)
  })
  const aAnadir = mode === 'create' && porVoz ? separarItems(draft.text) : []

  const handleSubmit = submitHandler(valid => {
    if (mode === 'create') {
      // Lo que se enseña en la lista de «se añadirán» es lo que se guarda.
      if (aAnadir.length > 1) aAnadir.forEach(text => onCreate({ ...valid, text }))
      else onCreate(aAnadir.length === 1 ? { ...valid, text: aAnadir[0] } : valid)
    } else if (initial) onUpdate(initial.id, valid)
    onClose()
  })

  return (
    <BottomSheet
      open={open}
      title={titulo ?? (mode === 'create' ? t.anadirItem : t.editarItem)}
      onClose={onClose}
      footer={
        <SheetFooter
          form="item-form"
          submitLabel={mode === 'create' ? (aAnadir.length > 1 ? t.anadirN(aAnadir.length) : t.anadir) : t.guardar}
          error={formError}
          onDelete={mode === 'edit'
            ? { confirming, onClick: handleDelete, idleLabel: t.eliminarItem, confirmLabel: t.confirmar }
            : undefined}
        />
      }
    >
      <form id="item-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-4">
        <Field label={t.item} htmlFor="item-text">
          <input
            id="item-text"
            ref={firstFieldRef}
            type="text"
            value={draft.text}
            onChange={e => patch({ text: e.target.value })}
            placeholder={t.ejemplo}
            required
            className="field-input"
          />
          <Suggestions
            values={sugerencias}
            onPick={text => patch({ text })}
            label={draft.text.trim() ? t.coincidencias : t.losQueMasApuntais}
          />
        </Field>

        {/* Dictar solo al apuntar algo nuevo, y solo si el navegador sabe: sin
            soporte no se enseña un botón que no puede hacer nada. */}
        {mode === 'create' && dictado.soportado && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={dictado.escuchando ? dictado.parar : dictado.iniciar}
              aria-pressed={dictado.escuchando}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-sm font-semibold text-ink transition-colors hover:bg-surface"
            >
              {dictado.escuchando
                ? <Square size={15} strokeWidth={2.2} aria-hidden />
                : <Mic size={15} strokeWidth={2.2} aria-hidden />}
              {dictado.escuchando ? t.escuchando : t.dictar}
            </button>
            {dictado.error && (
              <p className="text-xs font-medium text-danger-strong">
                {dictado.error === 'permiso' ? t.dictadoPermiso : dictado.error === 'nada' ? t.dictadoNada : t.dictadoOtro}
              </p>
            )}
            {aAnadir.length > 1 && (
              <div className="text-xs text-muted">
                <p className="font-semibold text-ink">{t.seAnadiran(aAnadir.length)}</p>
                <ul className="mt-1 list-disc pl-5">
                  {aAnadir.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Fuera del `SheetFooter`, que es solo para guardar y borrar: mover no
            es ninguna de las dos: es llevarse el ítem a otro sitio tal cual. */}
        {mode === 'edit' && onMove && (
          <button
            type="button"
            onClick={onMove}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-sm font-semibold text-ink transition-colors hover:bg-surface"
          >
            <FolderInput size={15} strokeWidth={2.2} aria-hidden />
            {t.moverAOtraLista}
          </button>
        )}
      </form>
    </BottomSheet>
  )
}
