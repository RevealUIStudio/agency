#!/usr/bin/env node
/**
 * Rasterize public Circuit-R files from the transparent master (public/favicon.svg).
 *
 * Default site marks stay true-alpha:
 *   public/favicon.png  64×64 RGBA
 *   public/favicon.ico  16, 32, 48 RGBA
 *
 * public/apple-touch-icon.png is the only opaque navy-plate adapter (#060d1a).
 * iOS home-screen icons require an opaque square. Do not point favicon, nav,
 * schema logo, or the Open Graph mark at that plate.
 *
 * Usage (sharp resolvable via node_modules, /tmp/raster/node_modules, or SHARP_PATH):
 *   node scripts/gen-circuit-r-rasters.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PLATE = '#060d1a';

function resolveSharp() {
  const require = createRequire(import.meta.url);
  const search = [
    path.join(ROOT, 'node_modules'),
    '/tmp/raster/node_modules',
    process.env.SHARP_PATH,
  ].filter(Boolean);
  try {
    return require(require.resolve('sharp', { paths: search }));
  } catch {
    throw new Error(
      'sharp is required to rasterize Circuit-R. Install it locally or set SHARP_PATH.',
    );
  }
}

function icoFromPngs(pngs) {
  const count = pngs.length;
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(count, 4);
  const entries = [];
  let offset = 6 + count * 16;
  for (const { width, height, png } of pngs) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }
  return Buffer.concat([dir, ...entries, ...pngs.map((item) => item.png)]);
}

async function pngFromSvg(sharp, svg, size) {
  return sharp(svg).resize(size, size, { fit: 'fill' }).png().toBuffer();
}

async function main() {
  const sharp = resolveSharp();
  const svg = readFileSync(path.join(ROOT, 'public/favicon.svg'));
  const publicDir = path.join(ROOT, 'public');

  const faviconPng = await pngFromSvg(sharp, svg, 64);
  writeFileSync(path.join(publicDir, 'favicon.png'), faviconPng);

  const icoSizes = [16, 32, 48];
  const icoPngs = [];
  for (const size of icoSizes) {
    icoPngs.push({ width: size, height: size, png: await pngFromSvg(sharp, svg, size) });
  }
  writeFileSync(path.join(publicDir, 'favicon.ico'), icoFromPngs(icoPngs));

  const mark = await pngFromSvg(sharp, svg, 180);
  const apple = await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: PLATE,
    },
  })
    .composite([{ input: mark }])
    .removeAlpha()
    .png()
    .toBuffer();
  writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), apple);

  console.log(`favicon.png ${faviconPng.length} bytes`);
  console.log(`favicon.ico sizes ${icoSizes.join(', ')}`);
  console.log(`apple-touch-icon.png adapter plate ${PLATE} ${apple.length} bytes`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
