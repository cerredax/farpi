import { test, expect } from '@playwright/test'
import { selectNoteMatches, selectSortedNotes } from '@/lib/selectors'
import { validateNoteDraft } from '@/lib/validators'
import type { Note } from '@/types'

// Las notas no tienen fecha, ni persona, ni estado: todo lo que la pantalla sabe
// hacer con ellas es ordenarlas y buscarlas, así que es aquí donde se prueba.

function nota(extra: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    family_id: 'f1',
    title: 'Wifi de casa',
    body: null,
    emoji: null,
    pinned: false,
    created_by: 'u1',
    created_at: '2026-06-01T10:00:00',
    updated_at: '2026-06-01T10:00:00',
    ...extra,
  }
}

test.describe('selectSortedNotes', () => {
  // La razón de ser de `pinned`: la clave del wifi no se edita nunca, así que
  // ordenar solo por fecha la hunde bajo cualquier nota escrita ayer.
  test('las fijadas van primero aunque sean las más antiguas', () => {
    const r = selectSortedNotes([
      nota({ id: 'reciente', pinned: false, updated_at: '2026-08-30T10:00:00' }),
      nota({ id: 'wifi',     pinned: true,  updated_at: '2026-06-01T10:00:00' }),
    ])
    expect(r.map(n => n.id)).toEqual(['wifi', 'reciente'])
  })

  test('dentro de cada grupo, lo tocado hace menos va antes', () => {
    const r = selectSortedNotes([
      nota({ id: 'vieja',   updated_at: '2026-06-01T10:00:00' }),
      nota({ id: 'nueva',   updated_at: '2026-08-30T10:00:00' }),
      nota({ id: 'enmedio', updated_at: '2026-07-15T10:00:00' }),
    ])
    expect(r.map(n => n.id)).toEqual(['nueva', 'enmedio', 'vieja'])
  })

  test('no toca el array que recibe', () => {
    const original = [
      nota({ id: 'a', updated_at: '2026-06-01T10:00:00' }),
      nota({ id: 'b', updated_at: '2026-08-01T10:00:00' }),
    ]
    selectSortedNotes(original)
    expect(original.map(n => n.id)).toEqual(['a', 'b'])
  })
})

test.describe('selectNoteMatches', () => {
  test('sin consulta devuelve todas', () => {
    const todas = [nota({ id: 'a' }), nota({ id: 'b' })]
    expect(selectNoteMatches(todas, '   ')).toHaveLength(2)
  })

  test('busca en el título y en el cuerpo', () => {
    const notas = [
      nota({ id: 'wifi',  title: 'Wifi de casa', body: 'Clave: casa-de-ana' }),
      nota({ id: 'tel',   title: 'Teléfonos',    body: 'Pediatra: 985 12 34 56' }),
    ]
    expect(selectNoteMatches(notas, 'wifi').map(n => n.id)).toEqual(['wifi'])
    expect(selectNoteMatches(notas, 'pediatra').map(n => n.id)).toEqual(['tel'])
  })

  // Lo mismo que en el resto de buscadores de la app: quien busca en el móvil no
  // pone la tilde, y "telefono" tiene que encontrar "Teléfonos".
  test('ignora tildes y mayúsculas', () => {
    const notas = [nota({ id: 'tel', title: 'Teléfonos útiles' })]
    expect(selectNoteMatches(notas, 'TELEFONOS').map(n => n.id)).toEqual(['tel'])
  })

  test('una nota sin cuerpo no rompe la búsqueda', () => {
    const notas = [nota({ id: 'sola', title: 'Contador', body: null })]
    expect(selectNoteMatches(notas, 'contador')).toHaveLength(1)
    expect(selectNoteMatches(notas, 'rellano')).toHaveLength(0)
  })
})

test.describe('validateNoteDraft', () => {
  test('exige título', () => {
    expect(validateNoteDraft({ title: '  ', body: 'algo', emoji: '📝', pinned: false })).toBeTruthy()
  })

  // Una nota entera puede caber en el título: "Wifi: casa-garcia / 1234".
  test('el cuerpo es opcional', () => {
    expect(validateNoteDraft({ title: 'Wifi', body: '', emoji: '📝', pinned: false })).toBeNull()
  })
})
