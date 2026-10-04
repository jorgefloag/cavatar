// Generates the PWA icon set (manifest icons, maskable, apple-touch-icon,
// favicon) from the CAVATAR monogram: a white "C" in Archivo Black on a
// carbón (#0B1220) background, with a red (#CE1126) accent dot.
//
// Deliberately avoids rendering text at rasterize time (no canvas/satori
// font-shaping engine, whose woff/woff2 support varies by platform).
// Instead: opentype.js (pure JS, no native deps) extracts the "C" glyph's
// vector outline once from the real font file, which gets embedded as a
// plain SVG <path> alongside a background <rect> and accent <circle>.
// sharp then rasterizes that pure-vector SVG to each target PNG size —
// by the time sharp touches it, there is no text and no font involved,
// just shapes, so there's nothing left to fail to load.
//
// Run with: node scripts/generate-pwa-icons.mjs

import { readFileSync } from "fs"
import { mkdir } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import opentype from "opentype.js"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const PUBLIC_DIR = path.join(ROOT, "public")

const CARBON = "#0B1220"
const WHITE = "#FFFFFF"
const RED = "#CE1126"

const FONT_PATH = path.join(
  ROOT,
  "node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff",
)

// Builds the "C" glyph's path data centered within a `size`x`size` box,
// scaled so its bounding box height is `glyphHeightRatio` of `size`.
function buildGlyphPathData(font, size, glyphHeightRatio) {
  const glyph = font.charToGlyph("C")

  // First pass at an arbitrary font size just to measure the bounding box
  // (opentype.js has no "measure without drawing" shortcut — draw once,
  // inspect, then redraw at the offset that centers it).
  const probeSize = 1000
  const probePath = glyph.getPath(0, 0, probeSize)
  const probeBox = probePath.getBoundingBox()
  const probeHeight = probeBox.y2 - probeBox.y1

  const targetHeight = size * glyphHeightRatio
  const fontSize = probeSize * (targetHeight / probeHeight)

  const measuredPath = glyph.getPath(0, 0, fontSize)
  const box = measuredPath.getBoundingBox()
  const glyphCenterX = (box.x1 + box.x2) / 2
  const glyphCenterY = (box.y1 + box.y2) / 2

  const offsetX = size / 2 - glyphCenterX
  const offsetY = size / 2 - glyphCenterY

  const finalPath = glyph.getPath(offsetX, offsetY, fontSize)
  return finalPath.toPathData(2)
}

function buildSvg({ size, glyphPathData, dotRadius, dotInset }) {
  const dotCx = size - dotInset
  const dotCy = size - dotInset
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${CARBON}" />
  <path d="${glyphPathData}" fill="${WHITE}" />
  <circle cx="${dotCx}" cy="${dotCy}" r="${dotRadius}" fill="${RED}" />
</svg>`
}

async function renderPng(svg, outputPath, outputSize) {
  await sharp(Buffer.from(svg)).resize(outputSize, outputSize).png().toFile(outputPath)
  console.log(`Wrote ${path.relative(ROOT, outputPath)} (${outputSize}x${outputSize})`)
}

async function main() {
  await mkdir(PUBLIC_DIR, { recursive: true })

  const fontBuffer = readFileSync(FONT_PATH)
  const font = opentype.parse(
    fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength),
  )

  // "any"-purpose composition: fills the full canvas, no safe-zone margin
  // needed since nothing masks these — used for 192, 512, apple-touch, favicon.
  const ANY_SIZE = 512
  const anyGlyphPath = buildGlyphPathData(font, ANY_SIZE, 0.58)
  const anySvg = buildSvg({
    size: ANY_SIZE,
    glyphPathData: anyGlyphPath,
    dotRadius: ANY_SIZE * 0.078,
    dotInset: ANY_SIZE * 0.19,
  })

  // Maskable: OS launchers crop anything outside a centered circle 80% of
  // the icon's diameter. Shrinking the whole composition (glyph + dot) and
  // keeping the background full-bleed to the edge is the standard way to
  // guarantee nothing important gets clipped by an arbitrary mask shape.
  // Both the glyph (via its height ratio) and the dot (via its own radius/
  // inset) are shrunk by the same 0.8 factor relative to the "any" version
  // — no separate transform group, so there's only one place scale happens.
  const MASKABLE_SIZE = 512
  const MASKABLE_SAFE_ZONE_SCALE = 0.8
  const maskableGlyphPath = buildGlyphPathData(font, MASKABLE_SIZE, 0.58 * MASKABLE_SAFE_ZONE_SCALE)
  const maskableSvg = buildSvg({
    size: MASKABLE_SIZE,
    glyphPathData: maskableGlyphPath,
    dotRadius: MASKABLE_SIZE * 0.078 * MASKABLE_SAFE_ZONE_SCALE,
    dotInset: MASKABLE_SIZE * 0.19 + (MASKABLE_SIZE * (1 - MASKABLE_SAFE_ZONE_SCALE)) / 2,
  })

  await renderPng(anySvg, path.join(PUBLIC_DIR, "icon-192.png"), 192)
  await renderPng(anySvg, path.join(PUBLIC_DIR, "icon-512.png"), 512)
  await renderPng(maskableSvg, path.join(PUBLIC_DIR, "icon-512-maskable.png"), 512)
  await renderPng(anySvg, path.join(PUBLIC_DIR, "apple-icon.png"), 180)
  await renderPng(anySvg, path.join(PUBLIC_DIR, "favicon.png"), 48)

  console.log("Done.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
