import { File, FileText, ImageIcon } from 'lucide-react'

/** Icono según el tipo MIME del documento (PDF, imagen o genérico). */
export function FileTypeIcon({ mime, size = 18 }: { mime: string; size?: number }) {
  if (mime.startsWith('image/')) return <ImageIcon size={size} className="text-accent-strong" />
  if (mime === 'application/pdf') return <FileText size={size} className="text-primary-strong" />
  return <File size={size} className="text-muted" />
}

/**
 * Cómo se llama ese tipo de archivo en una frase.
 *
 * Es lo que se enseña al editar un documento, donde antes iba el nombre del
 * archivo. Ese nombre ya no existe: vive en el Drive de quien lo subió y en la
 * base solo queda el del documento, que lo pone la familia. Decir «Documento
 * PDF · 350 KB» es lo que de verdad se sabe del archivo, y lo demás —cómo se
 * llama el papel— está en el campo de al lado.
 */
export function etiquetaDeTipo(mime: string): string {
  if (mime === 'application/pdf') return 'Documento PDF'
  if (mime === 'image/jpeg') return 'Imagen JPG'
  if (mime === 'image/png') return 'Imagen PNG'
  if (mime.startsWith('image/')) return 'Imagen'
  return 'Archivo'
}
