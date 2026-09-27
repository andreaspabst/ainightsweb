#!/usr/bin/env node
/**
 * „Save the Date“-Karten in zwei Zuschnitten — Nachbau der Instagram-Vorlage:
 * Publikumsfoto vollflächig, das Datum mit pinkem Stift-Kringel eingekreist,
 * darunter der Zeitraum bis zum Event („IN EINEM MONAT“, aus --publish
 * berechnet oder per --label gesetzt) auf Magenta-Block, das Logo unten —
 * dazu der gedrehte „SAVE THE DATE“-Stempel.
 * Schrift: Glacial Indifference Bold (Display-Schrift der AI-Nights-Postkarten).
 *
 *   instagram → Portrait 1080×1350: Text mittig, Logo mittig unten.
 *   linkedin  → Landscape 1200×627: Text links, Publikum rechts sichtbar,
 *               Stempel oben rechts, Logo unten rechts.
 *
 * Der Landscape-Zuschnitt ist Pflicht für LinkedIn: LinkedIn beschneidet
 * Portrait-Bilder im Feed auf ca. 1.91:1 und schneidet dabei die Headline weg.
 *
 * Das Foto kommt per Zufall aus der Galerie (src/data/gallery.json), damit
 * jedes Event ein anderes Publikumsbild bekommt; mit --image lässt sich ein
 * bestimmtes Bild setzen, mit --seed die Auswahl reproduzieren.
 *
 * Veroeffentlichung: rund zwei Monate vor dem Event auf LinkedIn und Instagram
 * (Terminierung siehe Skill event-social-posts).
 *
 * Ausgabe:
 *   public/media/save-the-date/<event-slug>-instagram.png
 *   public/media/save-the-date/<event-slug>-linkedin.png
 *
 * Aufruf:
 *   node scripts/generate-save-the-date.mjs ai-nights-nuernberg-06
 *   node scripts/generate-save-the-date.mjs ai-nights-muenchen-01 --image /wp-content/uploads/2026/01/1-34-publikum.jpg
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { C, FORMATS, PUBLIC, ROOT, textImg, solidRect, loadEventKit, loadLogo, logoFor } from './lib/social-kit.mjs';

const OUT_DIR = path.join(PUBLIC, 'media/save-the-date');
/**
 * Instagram bekommt den Portrait-Zuschnitt (nicht das quadratische
 * FORMATS.instagram), LinkedIn den Landscape-Zuschnitt aus FORMATS.
 */
const SIZE = { instagram: FORMATS.portrait, linkedin: FORMATS.linkedin };
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

/** Foto vollflächig, leicht abgedunkelt — Text muss lesbar bleiben. Im
 *  Landscape-Zuschnitt zusätzlich links abgedunkelt, damit der Textblock
 *  auf ruhigem Grund steht und das Publikum rechts sichtbar bleibt. */
async function photoLayer(rel, W, H, wide = false) {
  const side = wide
    ? `<linearGradient id="s" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0f0122" stop-opacity=".72"/>
        <stop offset="38%" stop-color="#0f0122" stop-opacity=".58"/>
        <stop offset="70%" stop-color="#0f0122" stop-opacity=".1"/>
        <stop offset="100%" stop-color="#0f0122" stop-opacity="0"/>
      </linearGradient>`
    : '';
  const overlay = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0f0122" stop-opacity=".34"/>
        <stop offset="45%" stop-color="#0f0122" stop-opacity=".18"/>
        <stop offset="100%" stop-color="#0f0122" stop-opacity=".55"/>
      </linearGradient>
      ${side}
    </defs>
    <rect width="${W}" height="${H}" fill="url(#v)"/>
    ${wide ? `<rect width="${W}" height="${H}" fill="url(#s)"/>` : ''}
  </svg>`);
  return sharp(path.join(PUBLIC, rel))
    // Landscape schneidet ein Hochformat-Foto stark zu — 'attention' landet
    // dann gern auf Beinen/Taschen. Oben ansetzen hält die Gesichter im Bild.
    .resize(W, H, { fit: 'cover', position: wide ? 'north' : 'attention' })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

/** Handgezeichneter Kringel um das Datum (wie in der Canva-Vorlage): eine
 *  leicht gekippte Ellipse, die oben links über den Startpunkt hinaus
 *  weitergezogen wird — dadurch wirkt sie mit dem Stift eingekreist.
 *  Ganzflächiger Layer, weil sharp keine Layer über den Rand hinaus erlaubt. */
function scribble(W, H, { cx, cy, rx, ry, stroke, angle = -4 }) {
  const pts = [];
  // Start oben links, eine volle Runde plus Überlauf (~1.18 Umdrehungen),
  // Radius wächst minimal, damit die zweite Linie neben der ersten liegt.
  const turns = 1.18;
  const steps = 160;
  for (let i = 0; i <= steps; i++) {
    const t = Math.PI * 1.12 + (i / steps) * turns * Math.PI * 2;
    const grow = 1 + (i / steps) * 0.07;
    pts.push([cx + Math.cos(t) * rx * grow, cy + Math.sin(t) * ry * (1 + (i / steps) * 0.16)]);
  }
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="${d}" fill="none" stroke="${PINK}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"
          transform="rotate(${angle} ${cx} ${cy})"/>
  </svg>`);
}

/** Zeitraum bis zum Event, vom Veröffentlichungstag aus („IN EINEM MONAT“). */
function countdownLabel(eventDate, publishDate) {
  const day = (iso) => Date.UTC(...String(iso).slice(0, 10).split('-').map((v, i) => Number(v) - (i === 1 ? 1 : 0)));
  const days = Math.round((day(eventDate) - day(publishDate)) / 86400000);
  if (days <= 1) return 'MORGEN';
  if (days < 12) return `IN ${days} TAGEN`;
  if (days < 18) return 'IN ZWEI WOCHEN';
  if (days < 25) return 'IN DREI WOCHEN';
  if (days < 45) return 'IN EINEM MONAT';
  if (days < 75) return 'IN ZWEI MONATEN';
  return 'AFTERWORK & NETWORKING';
}

/** „SAVE THE DATE“-Stempel: das Original-Asset (weiße Platte mit ausgesparter
 *  Schrift, weiß auf transparent). Es liegt nur in 300×100 px vor — beim
 *  Hochskalieren wird der Alphakanal deshalb gehärtet, sonst franst die
 *  Grafik aus. Fehlt das Asset, wird der Schriftzug gesetzt statt gezeichnet. */
const STAMP_ASSET = path.join(PUBLIC, 'img/social/save-the-date-stamp.png');

async function stamp({ width = 620, angle = -9 } = {}) {
  let flat;
  try {
    await fs.access(STAMP_ASSET);
    const up = await sharp(STAMP_ASSET)
      .trim({ threshold: 5 })
      .resize({ width, kernel: 'lanczos3' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const px = Buffer.from(up.data);
    for (let i = 0; i < px.length; i += 4) {
      const on = px[i + 3] > 102; // ab ~40 % Deckung: volles Weiß, sonst transparent
      px[i] = px[i + 1] = px[i + 2] = px[i + 3] = on ? 255 : 0;
    }
    flat = await sharp(px, { raw: { width: up.info.width, height: up.info.height, channels: 4 } })
      .png()
      .toBuffer();
  } catch {
    const label = await textImg('SAVE THE DATE', {
      family: 'Glacial Indifference Bold', size: 58, color: '#151019', maxWidth: 900, letterSpacing: 2,
    });
    const padX = 40;
    const padY = 20;
    const w = label.info.width + padX * 2;
    const h = label.info.height + padY * 2;
    const bend = 16;
    const banner = Buffer.from(`<svg width="${w}" height="${h + bend * 2}" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 ${bend} Q ${w / 2} 0 ${w} ${bend} L ${w} ${bend + h} Q ${w / 2} ${bend * 2 + h} 0 ${bend + h} Z" fill="#ffffff"/>
    </svg>`);
    flat = await sharp(banner).composite([{ input: label.data, top: bend + padY, left: padX }]).png().toBuffer();
  }
  // Zweiter Durchgang: sharp wendet .rotate() auf das Eingangsbild an, also vor
  // dem Composite — erst fertig zusammensetzen, dann drehen.
  const rotated = await sharp(flat)
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  // Plattenfläche in identischer Drehung: dient als Maske für die Abdunklung
  // unter den ausgesparten Buchstaben.
  const meta = await sharp(flat).metadata();
  const plate = await sharp({
    create: { width: meta.width, height: meta.height, channels: 4, background: { r: 15, g: 1, b: 34, alpha: 0.55 } },
  })
    .png()
    .toBuffer();
  const plateRotated = await sharp(plate)
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return { stamp: rotated, plate: plateRotated };
}

/**
 * Maße je Zuschnitt. Landscape: Datum + Kringel + Block links, Stempel oben
 * rechts, Logo unten rechts — das Publikum bleibt rechts sichtbar.
 */
const LAYOUT = {
  instagram: {
    margin: 82, dateTop: 470, dateSize: 136, blockSize: 82, blockGap: 230, padX: 16, padY: 8,
    stroke: 9, ringX: 48, ringY: 110, stampWidth: 640, stampAngle: 13, stampTop: 205, stampRight: 20,
    logoBottom: 70, colRight: 20,
  },
  linkedin: {
    margin: 64, dateTop: 200, dateSize: 80, blockSize: 46, blockGap: 110, padX: 12, padY: 6,
    stroke: 6, ringX: 34, ringY: 64, stampWidth: 380, stampAngle: 11, stampTop: 36, stampRight: 30,
    logoBottom: 34, colRight: 520,
  },
};

async function card(fmt, kit, imageRel, logo, label) {
  const { w: W, h: H } = SIZE[fmt];
  const L = LAYOUT[fmt];
  const M = L.margin;
  const wide = fmt === 'linkedin';
  const colW = W - M * 2 - L.colRight;
  const layers = [];
  const event = kit.event;

  // Datum, handgezeichnet eingekreist
  const date = await textImg(dateLabel(event.eventDate) ?? event.title, {
    family: 'Glacial Indifference Bold', size: L.dateSize, color: '#ffffff', maxWidth: colW,
  });
  const dateY = L.dateTop;
  const cx = M + date.info.width / 2;
  const cy = dateY + date.info.height / 2;
  layers.push({
    input: scribble(W, H, { cx, cy, rx: date.info.width / 2 + L.ringX, ry: date.info.height / 2 + L.ringY, stroke: L.stroke }),
    top: 0, left: 0,
  });
  layers.push({ input: date.data, top: dateY, left: M });

  // Zeitraum auf Magenta-Block
  const { padX, padY } = L;
  const a = await textImg(label, { family: 'Glacial Indifference Bold', size: L.blockSize, color: '#ffffff', maxWidth: colW - padX * 2 });
  const aY = dateY + date.info.height + L.blockGap;
  layers.push({ input: solidRect(a.info.width + padX * 2, a.info.height + padY * 2, PINK), top: aY, left: M });
  layers.push({ input: a.data, top: aY + padY, left: M + padX });

  // Logo: Portrait mittig unten, Landscape unten rechts
  const lg = wide ? logoFor(kit, logo).landscape : logoFor(kit, logo).big;
  const logoMeta = await sharp(lg).metadata();
  layers.push({
    input: lg,
    top: H - logoMeta.height - L.logoBottom,
    left: wide ? W - M - logoMeta.width : Math.round((W - logoMeta.width) / 2),
  });

  // Stempel, im Uhrzeigersinn gekippt, oben rechts über dem Kringel. Die
  // Buchstaben sind ausgespart — darunter liegt die abgedunkelte Platte.
  const st = await stamp({ width: L.stampWidth, angle: L.stampAngle });
  const stMeta = await sharp(st.stamp).metadata();
  const stLeft = Math.max(0, W - stMeta.width - L.stampRight);
  layers.push({ input: st.plate, top: L.stampTop, left: stLeft });
  layers.push({ input: st.stamp, top: L.stampTop, left: stLeft });

  return sharp(await photoLayer(imageRel, W, H, wide)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

const args = process.argv.slice(2);
const valueOf = new Set(['--image', '--seed', '--label', '--publish'].map((f) => args.indexOf(f) + 1).filter((i) => i > 0));
const slugs = args.filter((a, i) => !a.startsWith('--') && !valueOf.has(i));
const imageArg = args.includes('--image') ? args[args.indexOf('--image') + 1] : null;
const seedArg = args.includes('--seed') ? args[args.indexOf('--seed') + 1] : null;
const labelArg = args.includes('--label') ? args[args.indexOf('--label') + 1] : null;
// Veröffentlichungstag (Standard: heute) — daraus entsteht „IN EINEM MONAT“ o. Ä.
const publishArg = args.includes('--publish') ? args[args.indexOf('--publish') + 1] : new Date().toISOString().slice(0, 10);

if (slugs.length === 0) {
  console.error('Aufruf: node scripts/generate-save-the-date.mjs <event-slug> [...] [--image <pfad>] [--seed <wert>] [--publish YYYY-MM-DD] [--label TEXT]');
  process.exit(1);
}

await fs.mkdir(OUT_DIR, { recursive: true });
const logo = await loadLogo();
for (const slug of slugs) {
  const kit = await loadEventKit(slug);
  const imageRel = imageArg ?? (await pickGalleryImage(seedArg ?? slug));
  for (const fmt of ['instagram', 'linkedin']) {
    await fs.writeFile(path.join(OUT_DIR, `${slug}-${fmt}.png`), await card(fmt, kit, imageRel, logo, labelArg ?? countdownLabel(kit.event.eventDate, publishArg)));
  }
  console.log(`✓ ${slug}: 2 Formate — Foto: ${imageRel}`);
}
