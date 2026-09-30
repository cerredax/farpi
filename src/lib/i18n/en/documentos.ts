import type { documentos as es } from '../es/documentos'

export const documentos: typeof es = {
  vista: {
    resumen: (n: number) => (n === 1 ? '1 document saved' : `${n} documents saved`),
    buscarEn: (n: number) => `Search ${n} documents…`,
    buscarDocumentos: 'Search documents',
    anadir: 'Add document',
    driveConectado:
      'Google Drive connected. You can now save documents: they will stay in your Drive and the family will see them here.',
    driveError: 'Google Drive could not be connected. Try again from the add document button.',
    filtrarPorCategoria: 'Filter by category',
    todos: 'All',
    mas: (n: number) => `+${n} more`,
    verMenos: 'Show less',
    sinCoincidencias: 'No matches',
    sinDocumentosEnCategoria: 'No documents in this category',
    sinDocumentos: 'No documents',
    ningunoCoincide: (busqueda: string) => `No document matches “${busqueda}”`,
  },

  tarjeta: {
    caducoEl: (fecha: string) => `Expired ${fecha}`,
    caducaEl: (fecha: string) => `Expires ${fecha}`,
    formatoFecha: 'd MMM yyyy',
  },

  sheet: {
    anadir: 'Add document',
    editar: 'Edit document',
    subiendo: 'Uploading the file…',
    guardando: 'Saving…',
    guardarDocumento: 'Save document',
    guardarCambios: 'Save changes',
    eliminar: 'Delete document',
    confirmarEliminacion: 'Confirm deletion',
    nombreObligatorio: 'The name is required.',
    conectaParaSubir: 'Connect your Google Drive to upload the document.',
    seleccionaArchivo: 'Choose a file.',
    noSeAbrio: 'The document could not be opened',
    archivo: 'File',
    seleccionarArchivo: 'Choose file…',
    tiposAdmitidos: (megas: number) => `PDF, JPG or PNG. Maximum size: ${megas} MB.`,
    abriendo: 'Opening…',
    abrir: 'Open document',
    nombre: 'Name',
    nombreEjemplo: 'E.g. Vaccination record',
    categoria: 'Category',
    deQuienEs: 'Whose is it',
    opcional: '(optional)',
    descripcion: 'Description',
    descripcionEjemplo: 'E.g. 2026 check-up',
    caducaEl: 'Expires on',
  },

  conectar: {
    titulo: 'Connect your Google Drive',
    tituloRevocada: 'Reconnect your Google Drive',
    explicacion:
      'The documents you upload will be saved in your Drive. The rest of the family will see them in Farpi as usual, without connecting anything.',
    explicacionRevocada:
      'The documents you uploaded are still in your Drive, but the family cannot open them until you give permission again.',
    boton: 'Connect Google Drive',
    botonRevocada: 'Reconnect',
  },

  tipos: {
    pdf: 'PDF document',
    jpg: 'JPG image',
    png: 'PNG image',
    imagen: 'Image',
    archivo: 'File',
  },

  servidor: {
    tuCuenta: 'your account',
    quienLoSubio: 'the person who uploaded it',
    sinConexion: (dueno: string) => `This document was uploaded by ${dueno}, who has not connected their storage yet.`,
    conexionRevocada: (dueno: string) =>
      `This document was uploaded by ${dueno} and their storage is no longer connected. Ask them to go back to Documents and connect it again.`,
    sinDueno:
      'Only the record of this document is left: its file is not in anyone’s Google Drive. To have it again, it needs to be uploaded again.',
    archivoNoEsta: (dueno: string) =>
      `The file is no longer in the Google Drive of ${dueno}. The record stays, but the document cannot be opened.`,
    archivoRechazado: 'The file could not be saved: check that it is a PDF, JPG or PNG under 20 MB.',
    cuota: (dueno: string) => `The Google Drive of ${dueno} cannot take more files right now.`,
    desconocido: 'The document could not be reached. Try again in a moment.',

    configIncompleta: 'Incomplete configuration on the server',
    faltanDatosDocumento: 'Document details are missing',
    faltanDatosArchivo: 'File details are missing',
    archivoAjeno: 'That file is not from this upload',
    noPerteneces: 'You do not belong to this family',
    noEncontrado: 'Document not found',
    noSeBorro: 'The document could not be deleted',
  },
}
