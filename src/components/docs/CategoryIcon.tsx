import {
  Backpack,
  Car,
  CreditCard,
  File,
  HeartPulse,
  House,
  IdCard,
  PawPrint,
  Plane,
  Receipt,
  ShieldCheck,
} from 'lucide-react'
import type { DocCategory } from '@/types'

/**
 * El icono de cada categoría de documento.
 *
 * Son iconos y no emoji porque el chip donde viven mide 10 px de texto: a ese
 * tamaño un emoji de color se lee como una mancha, y encima cada sistema lo
 * dibuja a su manera. El resto de la app ya es lucide.
 *
 * Vive aquí y no en `constants.ts` porque ese archivo lo importa el servidor.
 */
const ICONOS: Record<DocCategory, typeof File> = {
  salud:    HeartPulse,
  colegio:  Backpack,
  personal: IdCard,
  vivienda: House,
  vehiculo: Car,
  seguros:  ShieldCheck,
  finanzas: CreditCard,
  facturas: Receipt,
  mascotas: PawPrint,
  viajes:   Plane,
  otros:    File,
}

/** Icono de la categoría del documento. Decorativo: el nombre va al lado. */
export function CategoryIcon({ category, size = 12 }: { category: DocCategory; size?: number }) {
  const Icono = ICONOS[category] ?? File
  return <Icono size={size} strokeWidth={2.4} aria-hidden />
}
