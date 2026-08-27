import type { Document, DocumentDraft } from '@/types'
import { db } from './db'

export function getDocuments(familyId: string): Document[] {
  return db.documents.filter(d => d.family_id === familyId)
}

export function createDocument(familyId: string, draft: DocumentDraft): Document {
  const now     = new Date().toISOString()
  const safeName = draft.name.trim().toLowerCase().replace(/\s+/g, '-')
  const ext      = draft.mime_type === 'image/jpeg' ? 'jpg' : draft.mime_type === 'image/png' ? 'png' : 'pdf'
  const doc: Document = {
    id: crypto.randomUUID(),
    family_id: familyId,
    child_id: draft.child_id,
    member_id: draft.member_id,
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    category: draft.category || null,
    storage_path: `mock/${Date.now()}_${safeName}.${ext}`,
    // En modo demo no se habla con ningún proveedor: el archivo no sale del
    // navegador y nunca llega a Drive. Los dos campos se rellenan igual para que
    // la forma del documento sea la misma a los dos lados de la frontera, que es
    // la regla del mock — si aquí faltaran, un componente podría dar por hecho
    // que existen y romper solo con credenciales reales.
    storage_provider: 'google_drive',
    storage_owner: 'u1',
    mime_type: draft.mime_type,
    size_bytes: draft.size_bytes,
    expires_on: draft.expires_on || null,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
  db.documents = [...db.documents, doc]
  return doc
}

export function updateDocument(id: string, draft: DocumentDraft): void {
  db.documents = db.documents.map(d =>
    d.id !== id ? d : {
      ...d,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      category: draft.category || null,
      child_id: draft.child_id,
      member_id: draft.member_id,
      expires_on: draft.expires_on || null,
      updated_at: new Date().toISOString(),
    }
  )
}

export function deleteDocument(id: string): void {
  db.documents = db.documents.filter(d => d.id !== id)
}
