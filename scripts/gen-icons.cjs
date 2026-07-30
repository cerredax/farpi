// Genera los PNG de la PWA a partir del icono SVG.
// Uso: node scripts/gen-icons.cjs
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')
const APP = path.join(ROOT, 'src', 'app')

// Icono base (mismo trazo que src/app/icon.svg), con la tarjeta crema.
const anySvg = `<svg width="512" height="512" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="5" y="5" width="54" height="54" rx="16" fill="#FAF7F2"/>
  <rect x="5" y="5" width="54" height="54" rx="16" stroke="#8BA888" stroke-width="3"/>
  <path d="M18 28.5L32 17L46 28.5" stroke="#D8A48F" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M22 29V42.5C22 45 24 47 26.5 47H37.5C40 47 42 45 42 42.5V29" stroke="#5C7A59" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M27 39L31 43L38.5 35.5" stroke="#8BA888" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M28 29H36" stroke="#E9C46A" stroke-width="2.5" stroke-linecap="round"/>
</svg>`

// Maskable: fondo a sangre (sin esquinas redondeadas) y la casa dentro de la
// zona segura (~60%) para que sobreviva al recorte circular del sistema.
const maskableSvg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#FAF7F2"/>
  <g transform="translate(96,96) scale(5)">
    <path d="M18 28.5L32 17L46 28.5" stroke="#D8A48F" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M22 29V42.5C22 45 24 47 26.5 47H37.5C40 47 42 45 42 42.5V29" stroke="#5C7A59" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M27 39L31 43L38.5 35.5" stroke="#8BA888" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M28 29H36" stroke="#E9C46A" stroke-width="2.5" stroke-linecap="round"/>
  </g>
</svg>`

async function render(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath)
  console.log('✓', path.relative(ROOT, outPath))
}

async function main() {
  fs.mkdirSync(PUBLIC, { recursive: true })
  await render(anySvg, 192, path.join(PUBLIC, 'icon-192.png'))
  await render(anySvg, 512, path.join(PUBLIC, 'icon-512.png'))
  await render(maskableSvg, 192, path.join(PUBLIC, 'icon-192-maskable.png'))
  await render(maskableSvg, 512, path.join(PUBLIC, 'icon-512-maskable.png'))
  // Apple touch icon: sin transparencia, App Router lo sirve desde src/app.
  await render(maskableSvg, 180, path.join(APP, 'apple-icon.png'))
}

main().catch(err => { console.error(err); process.exit(1) })
