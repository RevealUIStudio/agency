#!/usr/bin/env node
/**
 * Rasterize public/og-card.png from the live catalog fixture (app/lib/og-card.ts)
 * plus the Circuit-R tile already on this branch.
 *
 * This repo never had an OG generator — only a static PNG. Do not invent a
 * second headline here. Copy is owned by app/lib/og-card.ts.
 *
 * Usage (after pnpm install, with sharp resolvable):
 *   node scripts/gen-og-card.mjs
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const HEADLINE =
  'A product studio for runtime, receipts, a focused hour, an architecture artifact bundle and review, and a live launch.';
const SKU_LINE = 'Hour $300. Architecture artifact bundle and review $3,500. Launch $7,500.';
const BOOKING_LINE = 'Book a 30-minute intro on Google Calendar.';
const URL_LINE = 'revealuistudio.com';
const PLATE = '#060d1a';
const AMBER = '#eeb300';

function assertLiveCopy() {
  const fixture = readFileSync(path.join(ROOT, 'app/lib/og-card.ts'), 'utf8');
  const hero = readFileSync(path.join(ROOT, 'app/components/agency/Hero.tsx'), 'utf8');
  if (!fixture.includes(HEADLINE) || !hero.replace(/\s+/g, ' ').includes(HEADLINE)) {
    throw new Error('og-card headline drifted from Hero.tsx');
  }
  if (!fixture.includes(SKU_LINE)) {
    throw new Error('app/lib/og-card.ts is missing the locked SKU line');
  }
  if (!fixture.includes(BOOKING_LINE) || !fixture.includes(URL_LINE)) {
    throw new Error('app/lib/og-card.ts is missing booking or URL line');
  }
}

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
      'sharp is required to rasterize og-card.png. Install it locally or set SHARP_PATH.',
    );
  }
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return ~crc >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function injectTextChunks(png, fields) {
  const iend = png.lastIndexOf(Buffer.from('IEND'));
  if (iend < 4) throw new Error('PNG missing IEND');
  const before = png.subarray(0, iend - 4);
  const end = png.subarray(iend - 4);
  const extras = Object.entries(fields).map(([key, value]) =>
    pngChunk('tEXt', Buffer.from(`${key}\0${value}`, 'latin1')),
  );
  return Buffer.concat([before, ...extras, end]);
}

async function main() {
  assertLiveCopy();
  const sharp = resolveSharp();

  // Keep the Circuit-R tile already on this branch (88x88 at 72,64).
  const tileRounded = await sharp(path.join(ROOT, 'public/og-card.png'))
    .extract({ left: 72, top: 64, width: 88, height: 88 })
    .png()
    .toBuffer();

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a2c5a"/>
      <stop offset="1" stop-color="${PLATE}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="72" y="248" width="96" height="6" rx="3" fill="${AMBER}"/>
  <text x="72" y="318" fill="#ffffff" font-family="Inter, Liberation Sans, DejaVu Sans, sans-serif" font-size="40" font-weight="700">A product studio for runtime, receipts, a focused hour,</text>
  <text x="72" y="368" fill="#ffffff" font-family="Inter, Liberation Sans, DejaVu Sans, sans-serif" font-size="40" font-weight="700">an architecture artifact bundle and review,</text>
  <text x="72" y="418" fill="#ffffff" font-family="Inter, Liberation Sans, DejaVu Sans, sans-serif" font-size="40" font-weight="700">and a live launch.</text>
  <text x="72" y="468" fill="#c5d4e8" font-family="Inter, Liberation Sans, DejaVu Sans, sans-serif" font-size="22" font-weight="500">${SKU_LINE}</text>
  <text x="72" y="500" fill="#c5d4e8" font-family="Inter, Liberation Sans, DejaVu Sans, sans-serif" font-size="22" font-weight="500">${BOOKING_LINE}</text>
  <text x="72" y="588" fill="#8aa0bd" font-family="Inter, Liberation Sans, DejaVu Sans, sans-serif" font-size="18" font-weight="400">${URL_LINE}</text>
</svg>`;

  const card = await sharp(Buffer.from(svg))
    .png()
    .composite([{ input: tileRounded, left: 72, top: 64 }])
    .removeAlpha()
    .png()
    .toBuffer();

  const out = injectTextChunks(card, {
    Headline: HEADLINE,
    SkuLine: SKU_LINE,
    BookingLine: BOOKING_LINE,
    Url: URL_LINE,
    Plate: PLATE,
    Source: 'app/lib/og-card.ts + public/favicon.svg',
  });

  const dest = path.join(ROOT, 'public/og-card.png');
  writeFileSync(dest, out);
  const sha = createHash('sha256').update(out).digest('hex');
  console.log(`og-card.png ${out.length} bytes sha256=${sha}`);
  console.log(`headline: ${HEADLINE}`);
  console.log(`sku: ${SKU_LINE}`);
  console.log(`booking: ${BOOKING_LINE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
