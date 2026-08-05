import { createClient } from '../supabase/client'
import { assertNoError, currentUserId, fail } from './shared'
import type { Document, DocumentDraft } from '@/types'
import type { DocumentsRepo } from '../repos/types'

function safeFileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'documento'
}

export const documentsRepo: DocumentsRepo = {
  async getDocuments(familyId: string): Promise<Document[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
    assertNoError(error)
    return data ?? []
  },

  async createDocument(familyId: string, draft: DocumentDraft): Promise<Document> {
    const file = draft.file ?? fail('Selecciona un archivo para subirlo')
    const supabase = createClient()
    const userId = await currentUserId()
    const id = crypto.randomUUID()
    const storagePath = `${familyId}/${id}/${safeFileName(file.name)}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })
    assertNoError(uploadError)

    const { data, error } = await supabase
      .from('documents')
      .insert({
        id,
        family_id: familyId,
        child_id: draft.child_id,
        member_id: draft.member_id,
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        category: draft.category || null,
        storage_path: storagePath,
        mime_type: draft.mime_type,
        size_bytes: draft.size_bytes,
        expires_on: draft.expires_on || null,
        created_by: userId,
      })
      .select('*')
      .single()

    // Si la fila no entra, el archivo ya subido se retira: sin esto Storage se
    // llenaría de archivos que no aparecen en ninguna pantalla.
    if (error) {
      await supabase.storage.from('documents').remove([storagePath])
      fail(error.message)
    }
    return data
  },

  async updateDocument(id: string, draft: DocumentDraft): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('documents')
      .update({
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        category: draft.category || null,
        child_id: draft.child_id,
        member_id: draft.member_id,
        expires_on: draft.expires_on || null,
      })
      .eq('id', id)
    assertNoError(error)
  },

  async deleteDocument(id: string): Promise<void> {
    const supabase = createClient()
    const { data: doc, error: getError } = await supabase.from('documents').select('storage_path').eq('id', id).single()
    assertNoError(getError)
    const { error: deleteError } = await supabase.from('documents').delete().eq('id', id)
    assertNoError(deleteError)
    if (doc?.storage_path) {
      const { error: storageError } = await supabase.storage.from('documents').remove([doc.storage_path])
      assertNoError(storageError)
    }
  },

  // El bucket es privado: cada descarga necesita una URL firmada de un minuto.
  async getDownloadUrl(document: Document): Promise<string> {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.storage_path, 60)
    assertNoError(error)
    return data?.signedUrl ?? fail('No se pudo generar el enlace del documento')
  },
}
