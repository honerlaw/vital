/**
 * Regenerates every app-icon PNG from the master assets/images/vital-icon.svg.
 *
 * LOCAL-ONLY, one-time manual generation. The committed PNGs are the artifacts;
 * CI and deploy never run this script. The rasterizer is installed without
 * touching package.json or package-lock.json (this repo was bitten by
 * npm/cli#4828 — see commit d16484e):
 *
 *   npm ci
 *   npm install --no-save @resvg/resvg-js@2.6.2
 *   node scripts/generate-icons.mjs
 *
 * Extraction contract with the master SVG: <g id="bg"> (gradient defs + rect)
 * and <g id="pulse"> (white trace + dot) as direct children of
 * <svg viewBox="0 0 1024 1024">. The script fails loudly if either is missing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { Resvg } = await import('@resvg/resvg-js');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imagesDir = join(root, 'assets', 'images');
const master = readFileSync(join(imagesDir, 'vital-icon.svg'), 'utf8');

function extract(id) {
  const match = master.match(new RegExp(`<g id="${id}"[\\s\\S]*?</g>`));
  if (!match) {
    throw new Error(`vital-icon.svg violates the extraction contract: missing <g id="${id}">`);
  }
  return match[0];
}

const bg = extract('bg');
const pulse = extract('pulse');

// Drawn extents of the pulse glyph in the master 1024-canvas, including stroke
// (stroke-width 76 → 38px half-extent) and the endpoint dot (cx 916 + r 36).
const GLYPH = { x: 72, y: 242, w: 880, h: 486 };

const wrap = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${inner}</svg>`;

// Scale the glyph uniformly into a centered box of the given size.
function glyphInBox(boxSize) {
  const s = boxSize / Math.max(GLYPH.w, GLYPH.h);
  const tx = 512 - s * (GLYPH.x + GLYPH.w / 2);
  const ty = 512 - s * (GLYPH.y + GLYPH.h / 2);
  return wrap(`<g transform="translate(${tx} ${ty}) scale(${s})">${pulse}</g>`);
}

function render(svg, size, file) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(join(imagesDir, file), png);
  console.log(`wrote ${file} (${size}x${size})`);
}

render(master, 1024, 'icon.png'); // full composition: iOS + default
render(master, 48, 'favicon.png'); // full composition, web tab size
render(wrap(bg), 1024, 'android-icon-background.png'); // gradient only
render(glyphInBox(676), 1024, 'android-icon-foreground.png'); // central 66% safe zone
render(glyphInBox(676), 1024, 'android-icon-monochrome.png'); // white silhouette, same fit
render(glyphInBox(940), 512, 'splash-icon.png'); // near-full-bleed glyph, transparent
