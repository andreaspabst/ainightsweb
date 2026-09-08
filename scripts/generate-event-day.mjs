#!/usr/bin/env node
/**
 * „HEUTE 17:00 UHR“-Karte für den Event-Tag in zwei Zuschnitten — Nachbau
 * des Instagram-Posts: Publikumsfoto vollflächig als Magenta/Blau-Duotone,
 * das AI-Nights-Logo, groß „HEUTE“ + Uhrzeit und darunter die Zeile
 * „Für die Spontanen: Tickets sind auch an der Abendkasse erhältlich“
 * — alles in Glacial Indifference, der Schrift der AI-Nights-Postkarten.
 *
 *   instagram → Portrait 1080×1350: Text unten links über dem Foto.
 *   linkedin  → Landscape 1200×627: Headline links, das Publikum rechts
 *               sichtbar (Foto blendet nach links in den Duotone-Grund aus).
 *
 * Der Landscape-Zuschnitt ist Pflicht für LinkedIn: LinkedIn beschneidet
 * Portrait-Bilder im Feed auf ca. 1.91:1 und schneidet dabei die Headline weg.
 *
 * Das Foto kommt per Zufall aus der Galerie (kuratierte Publikumsbilder,
 * mit --any-gallery aus allen Galeriebildern in src/data/gallery.json).
 * Seed = Event-Slug, damit ein erneuter Lauf dasselbe Bild liefert; mit
 * --seed lässt sich neu würfeln, mit --image ein bestimmtes Bild setzen.
 *
 * Veroeffentlichung: am Event-Tag morgens auf Instagram und LinkedIn
 * (Terminierung siehe Skill event-social-posts).
 *
 * Ausgabe:
 *   public/media/event-day/<event-slug>-instagram.png
 *   public/media/event-day/<event-slug>-linkedin.png
 *
 * Aufruf:
 *   node scripts/generate-event-day.mjs ai-nights-nuernberg-05
 *   node scripts/generate-event-day.mjs ai-nights-nuernberg-05 --seed 2
 *   node scripts/generate-event-day.mjs ai-nights-muenchen-01 --image /wp-content/uploads/2026/01/1-34-publikum.jpg
 *   node scripts/generate-event-day.mjs ai-nights-nuernberg-05 --subline "Türen auf ab 16:30 Uhr" --no-ticket-line
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { FORMATS, PUBLIC, ROOT, esc, textImg, loadEventKit, loadLogo, logoFor } from './lib/social-kit.mjs';

const OUT_DIR = path.join(PUBLIC, 'media/event-day');
/**
 * Instagram bekommt den Portrait-Zuschnitt (nicht das quadratische
 * FORMATS.instagram), LinkedIn den Landscape-Zuschnitt aus FORMATS.
 */
const SIZE = { instagram: FORMATS.portrait, linkedin: FORMATS.linkedin };

/** Duotone-Verlauf: Schatten → Mitten → Lichter (aus der Instagram-Vorlage
 *  abgenommen: tiefes Indigo, Magenta, rosa Lichter). */
const DUOTONE = { shadow: '#1c0b52', mid: '#c4266f', light: '#ffc6d6' };

/** Kleiner deterministischer PRNG, damit --seed reproduzierbar ist. */
function rng(seed) {
  let s = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Publikumsbilder aus der Galerie — bewusst kuratiert: ein Zufallsgriff in
 *  alle Galeriebilder landet oft auf Buffet, leerem Raum oder Bühne. */
const AUDIENCE = [
  '/wp-content/uploads/2026/07/44-ai-night.25mai-44.jpg',
  '/wp-content/uploads/2026/07/33-ai-night.25mai-33.jpg',
  '/wp-content/uploads/2026/07/39-ai-night.25mai-39.jpg',
  '/wp-content/uploads/2026/04/AI-Nights-Nuernberg-03-154.jpg',
  '/wp-content/uploads/2026/04/AI-Nights-Nuernberg-03-86.jpg',
  '/wp-content/uploads/2026/04/AI-Nights-Nuernberg-03-158.jpg',
  '/wp-content/uploads/2026/01/52-ianight-52-scaled.jpg',
  '/wp-content/uploads/2026/01/37-ianight-37-scaled.jpg',
  '/wp-content/uploads/2026/01/1-34-publikum.jpg',
];

async function galleryImages(any) {
  if (!any) return AUDIENCE;
  const gallery = JSON.parse(await fs.readFile(path.join(ROOT, 'src/data/gallery.json'), 'utf8'));
  return gallery.flatMap((g) => g.images ?? []);
}

/** Zufälliges Publikumsbild — pro Event stabil (Seed = Event-Slug). Werden
 *  mehrere Events in einem Lauf gerendert, bekommt jedes ein anderes Bild
 *  (`used` sammelt die bereits vergebenen). */
async function pickGalleryImage(seed, any, used = new Set()) {
  const rand = rng(seed);
  const pool = await galleryImages(any);
  const shuffled = [...pool].sort(() => rand() - 0.5);
  const fresh = shuffled.filter((rel) => !used.has(rel));
  for (const rel of fresh.length ? fresh : shuffled) {
    try {
      await fs.access(path.join(PUBLIC, rel));
      return rel;
    } catch {}
  }
  throw new Error('Kein Publikumsbild gefunden');
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Foto als Duotone einfärben: Graustufen → Farbverlauf Schatten/Mitten/Lichter. */
async function duotone(rel, w, h) {
  const { data, info } = await sharp(path.join(PUBLIC, rel))
    .resize(w, h, { fit: 'cover', position: 'attention' })
    .greyscale()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [s, m, l] = [hex(DUOTONE.shadow), hex(DUOTONE.mid), hex(DUOTONE.light)];
  const lut = new Uint8Array(256 * 3);
  for (let v = 0; v < 256; v++) {
    const t = v / 255;
    const [a, b, f] = t < 0.5 ? [s, m, t * 2] : [m, l, (t - 0.5) * 2];
    for (let c = 0; c < 3; c++) lut[v * 3 + c] = Math.round(a[c] + (b[c] - a[c]) * f);
  }
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0, j = 0; i < data.length; i += info.channels, j += 3) {
    const v = data[i] * 3;
    out[j] = lut[v];
    out[j + 1] = lut[v + 1];
    out[j + 2] = lut[v + 2];
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}

/** Portrait: Duotone-Foto vollflächig, unten abgedunkelt für den Textblock. */
async function portraitPhoto(rel, W, H) {
  const shade = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${DUOTONE.shadow}" stop-opacity=".22"/>
        <stop offset="18%" stop-color="${DUOTONE.shadow}" stop-opacity="0"/>
        <stop offset="52%" stop-color="${DUOTONE.shadow}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${DUOTONE.shadow}" stop-opacity=".62"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#v)"/>
  </svg>`);
  return sharp(await duotone(rel, W, H)).composite([{ input: shade, top: 0, left: 0 }]).png().toBuffer();
}

/**
 * Landscape: Duotone-Foto weiterhin vollflächig (der Look bleibt), aber die
 * linke Hälfte wird zum Textfeld abgedunkelt — so bleibt das Publikum rechts
 * sichtbar und die Headline steht auf ruhigem Grund.
 */
async function landscapePhoto(rel, W, H) {
  const shade = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="side" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${DUOTONE.shadow}" stop-opacity=".9"/>
        <stop offset="34%" stop-color="${DUOTONE.shadow}" stop-opacity=".78"/>
        <stop offset="62%" stop-color="${DUOTONE.shadow}" stop-opacity=".22"/>
        <stop offset="100%" stop-color="${DUOTONE.shadow}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${DUOTONE.shadow}" stop-opacity=".3"/>
        <stop offset="40%" stop-color="${DUOTONE.shadow}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${DUOTONE.shadow}" stop-opacity=".38"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#side)"/>
    <rect width="${W}" height="${H}" fill="url(#v)"/>
  </svg>`);
  return sharp(await duotone(rel, W, H)).composite([{ input: shade, top: 0, left: 0 }]).png().toBuffer();
}

/**
 * Hinweiszeile mit gemischten Schnitten (regular / bold / kursiv /
 * unterstrichen) als eine Pango-Markup-Zeile mit Wortumbruch, in Glacial
 * Indifference. Damit Pango den Bold-Schnitt findet, werden die Schriftdateien
 * vorher einmal geladen (fontconfig merkt sie sich für den Prozess); kursiv
 * wird synthetisiert, Glacial Indifference hat keinen Italic-Schnitt.
 */
async function richText(markup, { size, maxWidth }) {
  for (const family of ['Glacial Indifference', 'Glacial Indifference Bold']) {
    await textImg('x', { family, size: 12, color: '#fff', maxWidth: 100 });
  }
  return sharp({
    text: {
      text: `<span foreground="#ffffff">${markup}</span>`,
      font: `Glacial Indifference ${size}`,
      fontfile: path.join(ROOT, 'scripts/fonts/GlacialIndifference-Regular.otf'),
      rgba: true,
      dpi: 72,
      width: maxWidth,
      wrap: 'word',
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
}

/**
 * Maße je Zuschnitt. Landscape hat nur die halbe Höhe, deshalb kleinere
 * Headline, schmalere Textspalte (rechts steht das Publikum) und ein
 * kompakterer Rand.
 */
const LAYOUT = {
  instagram: { margin: 100, head: 204, sub: 50, colFactor: 1, logoTop: 64, logoLeft: 56, bottom: 120, gapSub: 44 },
  linkedin: { margin: 68, head: 116, sub: 30, colFactor: 0.56, logoTop: 40, logoLeft: 52, bottom: 54, gapSub: 26 },
};

async function card(fmt, kit, imageRel, logo, opts) {
  const { w: W, h: H } = SIZE[fmt];
  const L = LAYOUT[fmt];
  const MARGIN = L.margin;
  const colW = Math.round((W - MARGIN * 2) * L.colFactor);
  const layers = [];
  const event = kit.event;

  // Logo oben links
  const lg = logoFor(kit, logo).landscape;
  layers.push({ input: lg, top: L.logoTop, left: L.logoLeft });

  // Text-Block unten: HEUTE / <Uhrzeit> UHR / Hinweiszeile — von unten nach
  // oben gesetzt, damit der Abstand zum unteren Rand konstant bleibt.
  const time = (opts.time ?? event.startTime ?? '17:00').replace('.', ':');
  const headline = await textImg(opts.headline ?? 'HEUTE', {
    family: 'Glacial Indifference Bold', size: L.head, color: '#ffffff', maxWidth: colW, letterSpacing: 1,
  });
  const timeline = await textImg(`${time} UHR`, {
    family: 'Glacial Indifference Bold', size: L.head, color: '#ffffff', maxWidth: colW, letterSpacing: 1,
  });

  const markup = opts.subline
    ? `<i>${esc(opts.subline)}</i>`
    : 'Für die <b>Spontanen</b>: <i>Tickets sind auch an der <b><u>Abendkasse</u></b> erhältlich</i>';
  const sub = opts.noSubline
    ? { info: { height: 0 } }
    : await richText(markup, { size: L.sub, maxWidth: colW + 20 });

  const bottom = H - L.bottom;
  const subTop = bottom - sub.info.height;
  const timeTop = subTop - (sub.info.height ? L.gapSub : 0) - timeline.info.height;
  const headTop = timeTop - 6 - headline.info.height;
  layers.push({ input: headline.data, top: headTop, left: MARGIN - 8 });
  layers.push({ input: timeline.data, top: timeTop, left: MARGIN - 8 });
  if (sub.data) layers.push({ input: sub.data, top: subTop, left: MARGIN });

  const base = fmt === 'instagram' ? await portraitPhoto(imageRel, W, H) : await landscapePhoto(imageRel, W, H);
  return sharp(base).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : null);
const optNames = ['image', 'seed', 'time', 'headline', 'subline'];
const slugs = args.filter((a, i) => !a.startsWith('--') && !optNames.includes(args[i - 1]?.replace(/^--/, '')));

if (slugs.length === 0) {
  console.error('Aufruf: node scripts/generate-event-day.mjs <event-slug> [...] [--image <pfad>] [--seed <wert>] [--any-gallery] [--time 17:00] [--headline HEUTE] [--subline "…"] [--no-subline]');
  process.exit(1);
}

await fs.mkdir(OUT_DIR, { recursive: true });
const logo = await loadLogo();
const used = new Set();
for (const slug of slugs) {
  const kit = await loadEventKit(slug);
  const imageRel = opt('image') ?? (await pickGalleryImage(opt('seed') ?? slug, flag('any-gallery'), used));
  used.add(imageRel);
  const opts = {
    time: opt('time'), headline: opt('headline'), subline: opt('subline'), noSubline: flag('no-subline'),
  };
  for (const fmt of ['instagram', 'linkedin']) {
    await fs.writeFile(path.join(OUT_DIR, `${slug}-${fmt}.png`), await card(fmt, kit, imageRel, logo, opts));
  }
  console.log(`✓ ${slug}: 2 Formate — Foto: ${imageRel}`);
}
