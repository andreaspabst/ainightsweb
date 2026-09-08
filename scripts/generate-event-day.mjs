#!/usr/bin/env node
/**
 * „HEUTE 17:00 UHR“-Karte für den Event-Tag (Portrait 1080×1350) — Nachbau
 * des Instagram-Posts: Publikumsfoto vollflächig als Magenta/Blau-Duotone,
 * oben links das AI-Nights-Logo, unten groß „HEUTE“ + Uhrzeit und darunter
 * die Zeile „Für die Spontanen: Tickets sind auch an der Abendkasse erhältlich“.
 *
 * Das Foto kommt per Zufall aus der Galerie (kuratierte Publikumsbilder,
 * mit --any-gallery aus allen Galeriebildern in src/data/gallery.json).
 * Seed = Event-Slug, damit ein erneuter Lauf dasselbe Bild liefert; mit
 * --seed lässt sich neu würfeln, mit --image ein bestimmtes Bild setzen.
 *
 * Veroeffentlichung: am Event-Tag morgens auf Instagram und LinkedIn
 * (Terminierung siehe Skill event-social-posts).
 *
 * Ausgabe: public/media/event-day/<event-slug>.png
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
import { PUBLIC, ROOT, esc, textImg, loadEventKit, loadLogo, logoFor } from './lib/social-kit.mjs';

const OUT_DIR = path.join(PUBLIC, 'media/event-day');
const W = 1080;
const H = 1350;
const MARGIN = 100;

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
  '/wp-content/uploads/2026/04/AI-Nights-Nuernberg-03-167.jpg',
  '/wp-content/uploads/2026/01/37-ianight-37-scaled.jpg',
  '/wp-content/uploads/2026/01/1-34-publikum.jpg',
];

async function galleryImages(any) {
  if (!any) return AUDIENCE;
  const gallery = JSON.parse(await fs.readFile(path.join(ROOT, 'src/data/gallery.json'), 'utf8'));
  return gallery.flatMap((g) => g.images ?? []);
}

/** Zufälliges Publikumsbild — pro Event stabil (Seed = Event-Slug). */
async function pickGalleryImage(seed, any) {
  const rand = rng(seed);
  const pool = await galleryImages(any);
  const shuffled = [...pool].sort(() => rand() - 0.5);
  for (const rel of shuffled) {
    try {
      await fs.access(path.join(PUBLIC, rel));
      return rel;
    } catch {}
  }
  throw new Error('Kein Publikumsbild gefunden');
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Foto vollflächig als Duotone: Graustufen → Farbverlauf Schatten/Mitten/Lichter,
 *  unten leicht abgedunkelt, damit der Text sicher lesbar bleibt. */
async function photoLayer(rel) {
  const { data, info } = await sharp(path.join(PUBLIC, rel))
    .resize(W, H, { fit: 'cover', position: 'attention' })
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
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .composite([{ input: shade, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

/**
 * Hinweiszeile mit gemischten Schnitten (regular / semibold / kursiv /
 * unterstrichen) als eine Pango-Markup-Zeile mit Wortumbruch. Damit Pango die
 * Schnitte findet, werden die Schriftdateien vorher einmal geladen
 * (fontconfig merkt sie sich für den Prozess).
 */
async function richText(markup, { size, maxWidth }) {
  for (const family of ['Inter', 'Inter SemiBold', 'Inter Italic', 'Inter Bold Italic']) {
    await textImg('x', { family, size: 12, color: '#fff', maxWidth: 100 });
  }
  return sharp({
    text: {
      text: `<span foreground="#ffffff">${markup}</span>`,
      font: `Inter ${size}`,
      fontfile: path.join(ROOT, 'scripts/fonts/Inter-Regular.ttf'),
      rgba: true,
      dpi: 72,
      width: maxWidth,
      wrap: 'word',
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function card(kit, imageRel, logo, opts) {
  const layers = [];
  const event = kit.event;

  // Logo oben links
  const lg = logoFor(kit, logo).landscape;
  layers.push({ input: lg, top: 64, left: 56 });

  // Text-Block unten: HEUTE / <Uhrzeit> UHR / Hinweiszeile — von unten nach
  // oben gesetzt, damit der Abstand zum unteren Rand konstant bleibt.
  const time = (opts.time ?? event.startTime ?? '17:00').replace('.', ':');
  const headline = await textImg(opts.headline ?? 'HEUTE', {
    family: 'Inter Black', size: 196, color: '#ffffff', maxWidth: W - MARGIN * 2, letterSpacing: 2,
  });
  const timeline = await textImg(`${time} UHR`, {
    family: 'Inter Black', size: 196, color: '#ffffff', maxWidth: W - MARGIN * 2, letterSpacing: 2,
  });

  const markup = opts.subline
    ? `<i>${esc(opts.subline)}</i>`
    : 'Für die <span weight="600">Spontanen</span>: <i>Tickets sind auch an der <b><u>Abendkasse</u></b> erhältlich</i>';
  const sub = opts.noSubline
    ? { info: { height: 0 } }
    : await richText(markup, { size: 50, maxWidth: W - MARGIN * 2 + 20 });

  const bottom = H - 120;
  const subTop = bottom - sub.info.height;
  const timeTop = subTop - (sub.info.height ? 44 : 0) - timeline.info.height;
  const headTop = timeTop - 6 - headline.info.height;
  layers.push({ input: headline.data, top: headTop, left: MARGIN - 8 });
  layers.push({ input: timeline.data, top: timeTop, left: MARGIN - 8 });
  if (sub.data) layers.push({ input: sub.data, top: subTop, left: MARGIN });

  return sharp(await photoLayer(imageRel)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
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
for (const slug of slugs) {
  const kit = await loadEventKit(slug);
  const imageRel = opt('image') ?? (await pickGalleryImage(opt('seed') ?? slug, flag('any-gallery')));
  const png = await card(kit, imageRel, logo, {
    time: opt('time'), headline: opt('headline'), subline: opt('subline'), noSubline: flag('no-subline'),
  });
  await fs.writeFile(path.join(OUT_DIR, `${slug}.png`), png);
  console.log(`✓ ${slug} — Foto: ${imageRel}`);
}
