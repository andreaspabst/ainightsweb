#!/usr/bin/env node
/**
 * „Save the Date“-Karten (Portrait 1080×1350) — Nachbau der Instagram-Vorlage:
 * Publikumsfoto vollflächig, geschwungene Magenta-Bänder oben und unten,
 * darauf das Datum, „AFTERWORK“ auf Magenta-Block, „& NETWORKING“ in Magenta,
 * unten mittig das AI-Nights-Logo — dazu der gedrehte „SAVE THE DATE“-Stempel.
 *
 * Das Foto kommt per Zufall aus der Galerie (src/data/gallery.json), damit
 * jedes Event ein anderes Publikumsbild bekommt; mit --image lässt sich ein
 * bestimmtes Bild setzen, mit --seed die Auswahl reproduzieren.
 *
 * Ausgabe: public/media/save-the-date/<event-slug>.png
 *
 * Aufruf:
 *   node scripts/generate-save-the-date.mjs ai-nights-nuernberg-06
 *   node scripts/generate-save-the-date.mjs ai-nights-muenchen-01 --image /wp-content/uploads/2026/01/1-34-publikum.jpg
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { C, PUBLIC, ROOT, textImg, solidRect, loadEventKit, loadLogo, logoFor } from './lib/social-kit.mjs';

const OUT_DIR = path.join(PUBLIC, 'media/save-the-date');
const W = 1080;
const H = 1350;
const MARGIN = 76;
const PINK = C.magentaDeep;

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const dateLabel = (iso) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : `${d.getDate()}. ${MONTHS[d.getMonth()]}`;
};

/** Kleiner deterministischer PRNG, damit --seed reproduzierbar ist. */
function rng(seed) {
  let s = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Publikumsbilder aus der Galerie — bewusst kuratiert: ein Zufallsgriff in
 *  die 454 Galeriebilder landet oft auf Buffet, leerem Raum oder Bühne. */
const AUDIENCE = [
  '/wp-content/uploads/2026/07/44-ai-night.25mai-44.jpg',
  '/wp-content/uploads/2026/07/33-ai-night.25mai-33.jpg',
  '/wp-content/uploads/2026/07/39-ai-night.25mai-39.jpg',
  '/wp-content/uploads/2026/04/AI-Nights-Nuernberg-03-154.jpg',
  '/wp-content/uploads/2026/04/AI-Nights-Nuernberg-03-86.jpg',
  '/wp-content/uploads/2026/04/AI-Nights-Nuernberg-03-158.jpg',
  '/wp-content/uploads/2026/04/AI-Nights-Nuernberg-03-167.jpg',
  '/wp-content/uploads/2026/01/37-ianight-37-scaled.jpg',
  '/wp-content/uploads/2026/01/1-34-publikum.jpg',
];

/** Zufälliges Publikumsbild — pro Event stabil, damit ein erneuter Lauf
 *  dasselbe Bild liefert (Seed = Event-Slug, per --seed überschreibbar). */
async function pickGalleryImage(seed) {
  const rand = rng(seed);
  const shuffled = [...AUDIENCE].sort(() => rand() - 0.5);
  for (const rel of shuffled) {
    try {
      await fs.access(path.join(PUBLIC, rel));
      return rel;
    } catch {}
  }
  throw new Error('Kein Publikumsbild gefunden');
}

/** Foto vollflächig, leicht abgedunkelt — Text muss lesbar bleiben. */
async function photoLayer(rel) {
  const overlay = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0f0122" stop-opacity=".34"/>
        <stop offset="45%" stop-color="#0f0122" stop-opacity=".18"/>
        <stop offset="100%" stop-color="#0f0122" stop-opacity=".55"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#v)"/>
  </svg>`);
  return sharp(path.join(PUBLIC, rel))
    .resize(W, H, { fit: 'cover', position: 'attention' })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

/** Geschwungenes Magenta-Band über die volle Breite, als ganzflächiger Layer
 *  (sharp erlaubt keine Composite-Layer, die über den Rand hinausragen). */
function swoosh(y, height, bend, flip = false) {
  const b = flip ? -bend : bend;
  const x0 = -40;
  const x1 = W + 40;
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="M${x0} ${y + b} Q ${W / 2} ${y - b * 2} ${x1} ${y + b}
             L ${x1} ${y + b + height} Q ${W / 2} ${y - b * 2 + height} ${x0} ${y + b + height} Z"
          fill="${PINK}"/>
  </svg>`);
}

/** „SAVE THE DATE“-Stempel: weißes Band mit dunkler Schrift, leicht gedreht. */
async function stamp(text, { angle = -9, fontSize = 58 } = {}) {
  const label = await textImg(text.toUpperCase(), {
    family: 'Inter Black',
    size: fontSize,
    color: '#151019',
    maxWidth: 900,
    letterSpacing: 2,
  });
  const padX = 40;
  const padY = 20;
  const w = label.info.width + padX * 2;
  const h = label.info.height + padY * 2;
  const bend = 16;
  // Wölbung nach AUSSEN, damit die Textfläche an jeder Stelle im Weiß liegt —
  // an den Enden sitzen die Kanten exakt auf bend bzw. bend+h.
  const banner = Buffer.from(`<svg width="${w}" height="${h + bend * 2}" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 ${bend} Q ${w / 2} 0 ${w} ${bend}
             L ${w} ${bend + h} Q ${w / 2} ${bend * 2 + h} 0 ${bend + h} Z"
          fill="#ffffff"/>
  </svg>`);
  // Zwei Durchgänge: sharp wendet .rotate() auf das EINGANGSBILD an, also vor
  // dem Composite — Band und Text müssen erst fertig sein, dann gedreht werden.
  const flat = await sharp(banner)
    .composite([{ input: label.data, top: bend + padY, left: padX }])
    .png()
    .toBuffer();
  return sharp(flat)
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function card(kit, imageRel, logo) {
  const layers = [];
  const event = kit.event;

  // Datum-Band + Datum
  const bandY = 336;
  const bandH = 34;
  const bandBend = 26;
  layers.push({ input: swoosh(bandY, bandH, bandBend), top: 0, left: 0 });

  const date = await textImg(dateLabel(event.eventDate) ?? event.title, {
    family: 'Inter Black',
    size: 118,
    color: '#ffffff',
    maxWidth: W - MARGIN * 2 - 60,
  });
  const dateY = bandY + bandH + bandBend + 26;
  layers.push({ input: date.data, top: dateY, left: MARGIN });

  // AFTERWORK auf Magenta-Block
  const padX = 30;
  const padY = 16;
  const a = await textImg('AFTERWORK', { family: 'Inter Black', size: 88, color: '#ffffff', maxWidth: W - MARGIN * 2 - padX * 2 });
  const aY = dateY + date.info.height + 64;
  layers.push({ input: solidRect(a.info.width + padX * 2, a.info.height + padY * 2, PINK), top: aY, left: MARGIN });
  layers.push({ input: a.data, top: aY + padY, left: MARGIN + padX });

  // & NETWORKING in Magenta darunter
  const n = await textImg('& NETWORKING', { family: 'Inter Black', size: 88, color: C.magenta, maxWidth: W - MARGIN * 2 });
  layers.push({ input: n.data, top: aY + a.info.height + padY * 2 + 12, left: MARGIN });

  // Unteres Band + Logo
  const lowerY = H - 300;
  layers.push({ input: swoosh(lowerY, 30, 24, true), top: 0, left: 0 });

  const lg = logoFor(kit, logo).portrait;
  const logoMeta = await sharp(lg).metadata();
  layers.push({
    input: lg,
    top: Math.min(lowerY + 96, H - logoMeta.height - 40),
    left: Math.round((W - logoMeta.width) / 2),
  });

  // Stempel oben rechts, über das Datum-Band hinweg
  const st = await stamp('Save the Date');
  const stMeta = await sharp(st).metadata();
  layers.push({ input: st, top: 118, left: Math.max(0, W - stMeta.width - 34) });

  return sharp(await photoLayer(imageRel)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

const args = process.argv.slice(2);
const slugs = args.filter((a) => !a.startsWith('--') && !/^\/wp-content|^\/img/.test(a));
const imageArg = args.includes('--image') ? args[args.indexOf('--image') + 1] : null;
const seedArg = args.includes('--seed') ? args[args.indexOf('--seed') + 1] : null;

if (slugs.length === 0) {
  console.error('Aufruf: node scripts/generate-save-the-date.mjs <event-slug> [...] [--image <pfad>] [--seed <wert>]');
  process.exit(1);
}

await fs.mkdir(OUT_DIR, { recursive: true });
const logo = await loadLogo();
for (const slug of slugs) {
  const kit = await loadEventKit(slug);
  const imageRel = imageArg ?? (await pickGalleryImage(seedArg ?? slug));
  await fs.writeFile(path.join(OUT_DIR, `${slug}.png`), await card(kit, imageRel, logo));
  console.log(`✓ ${slug} — Foto: ${imageRel}`);
}
