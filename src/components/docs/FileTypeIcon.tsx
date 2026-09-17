import { File, FileText, ImageIcon } from 'lucide-react'

/** Icono según el tipo MIME del documento (PDF, imagen o genérico). */
export function FileTypeIcon({ mime, size = 18 }: { mime: string; size?: number }) {
  if (mime.startsWith('image/')) return <ImageIcon size={size} className="text-accent-strong" />
  if (mime === 'application/pdf') return <FileText size={size} className="text-primary-strong" />
  return <File size={size} className="text-muted" />
}
