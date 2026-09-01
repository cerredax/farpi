// Genera los iconos de Farpi.
// Uso: node scripts/gen-icons.cjs
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')
const APP = path.join(ROOT, 'src', 'app')

// Icono de app/PWA: casa clara sobre verde salvia, con abrazo/familia abstracta.
const anySvg = `<svg width="512" height="512" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="5" y="5" width="54" height="54" rx="16" fill="#8BA888"/>
  <path d="M14.3 30.9C13.4 30.1 13.3 28.7 14.1 27.8L29 15.4C30.7 14 33.3 14 35 15.4L49.9 27.8C50.8 28.7 50.7 30.1 49.7 30.9C48.9 31.7 47.6 31.7 46.7 31L45.5 30V44.2C45.5 47.4 42.9 50 39.7 50H24.3C21.1 50 18.5 47.4 18.5 44.2V30L17.3 31C16.4 31.7 15.1 31.7 14.3 30.9Z" fill="#FAF7F2"/>
  <circle cx="28.2" cy="31.2" r="4.2" fill="#5C7A59"/>
  <path d="M20.8 44.2C20.8 38 24.8 34 29.4 34C33.5 34 36.5 37 37.2 41.1C34.3 42.4 31.8 45 30.6 48C25.2 47.6 20.8 46 20.8 44.2Z" fill="#5C7A59"/>
  <circle cx="39.5" cy="34.6" r="3.6" fill="#E9C46A"/>
  <path d="M32.7 47.4C34 42.9 37.9 39.6 42 39.6C45.2 39.6 47.2 42 47.2 44.8C47.2 46.6 43.7 48.4 39.1 48.7C36.7 48.9 34.5 48.5 32.7 47.4Z" fill="#E9C46A"/>
</svg>`

// Maskable: fondo a sangre para que sobreviva al recorte circular del sistema.
const maskableSvg = `<svg width="512" height="512" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" fill="#8BA888"/>
  <path d="M14.3 30.9C13.4 30.1 13.3 28.7 14.1 27.8L29 15.4C30.7 14 33.3 14 35 15.4L49.9 27.8C50.8 28.7 50.7 30.1 49.7 30.9C48.9 31.7 47.6 31.7 46.7 31L45.5 30V44.2C45.5 47.4 42.9 50 39.7 50H24.3C21.1 50 18.5 47.4 18.5 44.2V30L17.3 31C16.4 31.7 15.1 31.7 14.3 30.9Z" fill="#FAF7F2"/>
  <circle cx="28.2" cy="31.2" r="4.2" fill="#5C7A59"/>
  <path d="M20.8 44.2C20.8 38 24.8 34 29.4 34C33.5 34 36.5 37 37.2 41.1C34.3 42.4 31.8 45 30.6 48C25.2 47.6 20.8 46 20.8 44.2Z" fill="#5C7A59"/>
  <circle cx="39.5" cy="34.6" r="3.6" fill="#E9C46A"/>
  <path d="M32.7 47.4C34 42.9 37.9 39.6 42 39.6C45.2 39.6 47.2 42 47.2 44.8C47.2 46.6 43.7 48.4 39.1 48.7C36.7 48.9 34.5 48.5 32.7 47.4Z" fill="#E9C46A"/>
</svg>`

// Favicon: la misma casa del icono de app, en silueta. A 16 px las figuras de
// dentro se emborronan, así que se quedan fuera y la casa sube un 10% para
// llenar más el cuadrado.
const faviconSvg = `<svg width="256" height="256" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="4" width="56" height="56" rx="14" fill="#8BA888"/>
  <path transform="translate(32 32.2) scale(1.1) translate(-32 -32.2)" d="M14.3 30.9C13.4 30.1 13.3 28.7 14.1 27.8L29 15.4C30.7 14 33.3 14 35 15.4L49.9 27.8C50.8 28.7 50.7 30.1 49.7 30.9C48.9 31.7 47.6 31.7 46.7 31L45.5 30V44.2C45.5 47.4 42.9 50 39.7 50H24.3C21.1 50 18.5 47.4 18.5 44.2V30L17.3 31C16.4 31.7 15.1 31.7 14.3 30.9Z" fill="#FAF7F2"/>
</svg>`

async function render(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath)
  console.log('✓', path.relative(ROOT, outPath))
}

async function pngBuffer(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
}

function buildIco(images) {
  const headerSize = 6
  const directorySize = images.length * 16
  let offset = headerSize + directorySize
  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  const entries = []
  for (const image of images) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0)
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(image.buffer.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += image.buffer.length
  }

  return Buffer.concat([header, ...entries, ...images.map(image => image.buffer)])
}

async function renderFavicon() {
  const images = await Promise.all([16, 32, 48].map(async size => ({
    size,
    buffer: await pngBuffer(faviconSvg, size),
  })))
  const outPath = path.join(APP, 'favicon.ico')
  fs.writeFileSync(outPath, buildIco(images))
  console.log('✓', path.relative(ROOT, outPath))
}

async function main() {
  fs.mkdirSync(PUBLIC, { recursive: true })
  fs.writeFileSync(path.join(PUBLIC, 'app-icon.svg'), anySvg)
  await render(anySvg, 192, path.join(PUBLIC, 'icon-192.png'))
  await render(anySvg, 512, path.join(PUBLIC, 'icon-512.png'))
  await render(maskableSvg, 192, path.join(PUBLIC, 'icon-192-maskable.png'))
  await render(maskableSvg, 512, path.join(PUBLIC, 'icon-512-maskable.png'))
  // Apple touch icon: sin transparencia, App Router lo sirve desde src/app.
  await render(maskableSvg, 180, path.join(APP, 'apple-icon.png'))
  fs.writeFileSync(path.join(APP, 'icon.svg'), faviconSvg)
  console.log('✓', path.relative(ROOT, path.join(APP, 'icon.svg')))
  await renderFavicon()
}

main().catch(err => { console.error(err); process.exit(1) })

