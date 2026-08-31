import { createClient } from '../supabase/client'
import { assertNoError, fail } from './shared'
import { pedirApi } from './api-farpi'
import type { Document, DocumentDraft } from '@/types'
import type { DocumentsRepo } from '../repos/types'

/**
 * Los documentos, con los archivos en el Google Drive de quien los sube.
 *
 * Este repo es el que más se aparta del resto: los demás hablan con PostgREST y
 * ya está, y aquí hay tres caminos distintos según la operación.
 *
 * - **Leer y editar la ficha** siguen yendo directos a Supabase con la RLS de
 *   siempre. No hay archivo de por medio, así que no hay nada que cambiar.
 * - **Subir** son tres pasos: Farpi abre hueco en el Drive de quien sube, el
 *   navegador manda los bytes **directamente a Google** y después Farpi guarda la
 *   ficha. El archivo no pasa por el servidor porque una función de Vercel corta
 *   el cuerpo de la petición muy por debajo de los 20 MB que admite un documento.
 * - **Abrir y borrar** pasan por una ruta de la app, porque necesitan el token
 *   del **dueño** del archivo, que no es quien está mirando.
 */

/** El archivo no viaja en JSON: se manda aparte y el resto del draft en el cuerpo. */
function draftSinArchivo(draft: DocumentDraft): Omit<DocumentDraft, 'file'> {
  const copia = { ...draft }
  delete copia.file
  return copia
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

    // 1. Hueco en el Drive de quien sube. Si no lo tiene conectado, esto falla
    //    con 409 y el sheet enseña el botón de conectar.
    const { urlDeSubida } = await pedirApi<{ urlDeSubida: string }>('/api/documents/upload-session', {
      familyId,
      nombre: file.name,
      mimeType: file.type,
      tamano: file.size,
    })

    // 2. Los bytes, del navegador a Google. La dirección es de un solo uso y la
    //    acaba de crear el servidor: aquí no hay ningún token.
    const subida = await fetch(urlDeSubida, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!subida.ok) fail('No se pudo subir el archivo a Google Drive. Inténtalo de nuevo.')
    const ref = (await subida.json().catch(() => null))?.id
    if (!ref) fail('Google Drive no confirmó la subida del archivo.')

    // 3. La ficha, ya con el tamaño real que diga el proveedor.
    return pedirApi<Document>('/api/documents', { familyId, ref, draft: draftSinArchivo(draft) })
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
    await pedirApi<{ ok: true }>(`/api/documents/${id}`, undefined, 'DELETE')
  },

  /**
   * El archivo lo sirve Farpi, no Google: la URL es de la propia app.
   *
   * Antes de devolverla se comprueba que el archivo siga estando, y no es un
   * lujo: el sheet abre la pestaña **antes** del await para que no la mate el
   * bloqueador de ventanas, así que un fallo posterior sería una pestaña en
   * blanco. Los dos motivos de que falle —el dueño desconectó su Drive, o borró
   * el archivo— tienen arreglos distintos y hay que poder contarlos.
   */
  async getDownloadUrl(document: Document): Promise<string> {
    const url = `/api/documents/${document.id}/file`
    await pedirApi<{ ok: true }>(`${url}?verificar=1`, undefined, 'GET')
    return url
  },
}
