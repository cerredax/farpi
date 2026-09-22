/**
 * Las líneas de un fichero de la Norma 43, construidas campo a campo con las
 * longitudes de la norma (AEB, cuaderno 43, junio de 2012).
 *
 * Viven aquí y no dentro de un `.spec` porque las usan dos: los unitarios del
 * lector, que comprueban cada posición, y el de navegador, que sube un fichero
 * de verdad a la pantalla de importar. Un fichero de ejemplo copiado de un banco
 * no valdría para lo primero —no se sabría qué campo es cuál— y dos copias de
 * esto se desviarían en cuanto alguien tocara una.
 */

/** Un número a la izquierda con ceros, como lo escribe el banco. */
const num = (valor: number | string, largo: number) => String(valor).padStart(largo, '0')
/** Un texto a la derecha con espacios, cortado a su hueco. */
const txt = (valor: string, largo: number) => valor.padEnd(largo, ' ').slice(0, largo)

export function cabecera(opciones: {
  cuenta?: string
  desde?: string
  hasta?: string
  signoSaldo?: '1' | '2'
  saldo?: number
  divisa?: string
  titular?: string
} = {}) {
  const { cuenta = '018200010012345678', desde = '260901', hasta = '260930', signoSaldo = '2', saldo = 150000, divisa = '978', titular = 'GARCIA FAMILIA' } = opciones
  return '11' + cuenta + desde + hasta + signoSaldo + num(saldo, 14) + divisa + '1' + txt(titular, 26) + '   '
}

export function movimiento(opciones: {
  fecha?: string
  valor?: string
  comun?: string
  signo?: '1' | '2'
  importe?: number
  documento?: string
  ref1?: string
  ref2?: string
} = {}) {
  const { fecha = '260903', valor = '260903', comun = '12', signo = '1', importe = 4235, documento = '0000000000', ref1 = '000000000000', ref2 = '' } = opciones
  return '22' + '    ' + '0001' + fecha + valor + comun + '001' + signo + num(importe, 14) + txt(documento, 10) + txt(ref1, 12) + txt(ref2, 16)
}

export function concepto(texto: string) {
  return '23' + '01' + txt(texto.slice(0, 38), 38) + txt(texto.slice(38), 38)
}

export function final(opciones: {
  cuenta?: string
  apuntesDebe?: number
  totalDebe?: number
  apuntesHaber?: number
  totalHaber?: number
  signoSaldo?: '1' | '2'
  saldo?: number
} = {}) {
  const { cuenta = '018200010012345678', apuntesDebe = 0, totalDebe = 0, apuntesHaber = 0, totalHaber = 0, signoSaldo = '2', saldo = 150000 } = opciones
  return '33' + cuenta + num(apuntesDebe, 5) + num(totalDebe, 14) + num(apuntesHaber, 5) + num(totalHaber, 14) + signoSaldo + num(saldo, 14) + '978' + '    '
}

export const finFichero = '88' + '9'.repeat(18) + num(4, 6) + ' '.repeat(54)
