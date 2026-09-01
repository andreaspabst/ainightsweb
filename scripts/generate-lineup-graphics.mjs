#!/usr/bin/env node
/**
 * Line-up-Grafik ("alle Speaker-Slots eines Abends auf einem Bild").
 *
 * Erzeugt pro Event zwei Bilder im gleichen Look wie
 * scripts/generate-speaker-announcements.mjs:
 *   public/media/lineup/<event-slug>-instagram.png   1080 × 1080
 *   public/media/lineup/<event-slug>-linkedin.png    1200 × 627
 *
 * Zeigt alle Speaker aus `speakerIds` des Events (Platzhalter wie
 * "AI Nights Speaker #02" werden übersprungen) mit Foto, Name, Jobtitel und
 * Talk-Titel — automatisch verkleinert, damit sich nichts überlappt.
 *
 * Aufruf:
 *   node scripts/generate-lineup-graphics.mjs <event-slug>
 *   node scripts/generate-lineup-graphics.mjs ai-nights-nuernberg-05
 *
 * Voraussetzung: Inter muss als Systemschrift installiert sein (Pango
 * rendert den Text, wie bei generate-speaker-announcements.mjs).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const OUT_DIR = path.join(PUBLIC, 'media/lineup');
const LOGO = path.join(PUBLIC, 'wp-content/uploads/2026/07/AI-Nights-Logo-wAXDN.svg');

const C = {
  bg0: '#0f0122',
  bg1: '#1b0838',
  magenta: '#ff2d7a',
  blue: '#326bff',
  text: '#f7f4fb',
  muted: '#b7addd',
};

const FORMATS = {
  instagram: { w: 1080, h: 1080 },
  linkedin: { w: 1200, h: 627 },
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Text als transparentes PNG; verkleinert die Schrift, bis er in den Platz passt. */
async function textImg(text, { family, size, color, maxWidth, maxHeight, letterSpacing = 0, wrap = false, align = 'left', minSize = 12 }) {
  let px = size;
  for (;;) {
    const spacing = letterSpacing ? ` letter_spacing="${Math.round(letterSpacing * 1024)}"` : '';
    const markup = `<span foreground="${color}"${spacing}>${esc(text)}</span>`;
    const { data, info } = await sharp({
      text: { text: markup, font: `${family} ${px}`, rgba: true, dpi: 72, align, width: Math.round(wrap ? maxWidth : maxWidth * 4) },
    })
      .png()
      .toBuffer({ resolveWithObject: true });
    const fits = info.width <= maxWidth && (!maxHeight || info.height <= maxHeight);
    if (fits || px <= minSize) return { data, info };
    px -= 1;
  }
}

/** Rundes Portrait; ohne Foto ein Kreis mit Initialen. */
async function circlePhoto(speaker, size) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  const src = speaker.image?.src ? path.join(PUBLIC, speaker.image.src) : null;
  if (src) {
    try {
      return await sharp(src)
        .resize(size, size, { fit: 'cover', position: 'attention' })
        .composite([{ input: mask, blend: 'dest-in' }])
        .png()
        .toBuffer();
    } catch {
      console.warn(`⚠️  Foto nicht lesbar: ${speaker.slug}`);
    }
  }
  const initials = speaker.title
    .replace(/[„“"()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return sharp(
    Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${C.blue}"/><stop offset="100%" stop-color="${C.magenta}"/>
      </linearGradient></defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#a)" opacity=".85"/>
      <text x="50%" y="50%" dy=".34em" text-anchor="middle" font-family="Inter" font-weight="900"
        font-size="${Math.round(size * 0.34)}" fill="#ffffff">${esc(initials)}</text>
    </svg>`),
  )
    .png()
    .toBuffer();
}

function ring(w, h, cx, cy, r, width) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.blue}"/><stop offset="50%" stop-color="#8b2fd8"/><stop offset="100%" stop-color="${C.magenta}"/>
  </linearGradient></defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#ring)" stroke-width="${width}"/>
</svg>`);
}

function background(w, h) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.bg1}"/><stop offset="55%" stop-color="${C.bg0}"/><stop offset="100%" stop-color="#12002b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.blue}"/><stop offset="55%" stop-color="#8b2fd8"/><stop offset="100%" stop-color="${C.magenta}"/>
    </linearGradient>
    <radialGradient id="glowA" cx="50%" cy="50%">
      <stop offset="0%" stop-color="${C.magenta}" stop-opacity=".32"/><stop offset="100%" stop-color="${C.magenta}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="50%" cy="50%">
      <stop offset="0%" stop-color="${C.blue}" stop-opacity=".3"/><stop offset="100%" stop-color="${C.blue}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="45" height="45" patternUnits="userSpaceOnUse">
      <path d="M45 0 L0 0 0 45" fill="none" stroke="#ffffff" stroke-opacity=".045" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  <circle cx="${Math.round(w * 0.1)}" cy="${Math.round(h * 0.9)}" r="${Math.round(h * 0.4)}" fill="url(#glowA)"/>
  <circle cx="${Math.round(w * 0.9)}" cy="${Math.round(h * 0.1)}" r="${Math.round(h * 0.38)}" fill="url(#glowB)"/>
  <rect x="0" y="0" width="${w}" height="8" fill="url(#accent)"/>
</svg>`);
}

function divider(w, h, x, y, len) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="d" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${C.blue}" stop-opacity=".85"/><stop offset="100%" stop-color="${C.magenta}" stop-opacity=".85"/>
  </linearGradient></defs>
  <rect x="${x}" y="${y}" width="${len}" height="2" fill="url(#d)"/>
</svg>`);
}

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const fmtDate = (iso) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** Talk-Titel ohne Zeitfenster-Präfix („18:00 - 18:45 | …“). */
function cleanTalkTitle(title) {
  if (!title) return null;
  const t = String(title)
    .replace(/^\s*\d{1,2}[:.]\d{2}\s*[–-]\s*\d{1,2}[:.]\d{2}\s*(\||·|-)?\s*/, '')
    .replace(/^\(inkl\.[^)]*\)\s*(\||:)?\s*/i, '')
    .trim();
  return t || null;
}

async function loadJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function readJsonDir(dir) {
  const files = await fs.readdir(dir);
  return Promise.all(files.filter((f) => f.endsWith('.json')).map((f) => loadJson(path.join(dir, f))));
}

/** Liste der echten (nicht platzhalter) Speaker-Slots eines Events, in
 * Line-up-Reihenfolge, jeweils mit ihrem Talk-Titel (falls vorhanden). */
async function slotsFor(event) {
  const speakers = await readJsonDir(path.join(ROOT, 'src/content/speaker'));
  const sessions = await readJsonDir(path.join(ROOT, 'src/content/sessions'));
  const speakerById = new Map(speakers.map((s) => [s.id, s]));

  return (event.speakerIds ?? [])
    .map((id) => speakerById.get(id))
    .filter((s) => s && !s.slug.startsWith('ai-nights-speaker'))
    .map((s) => {
      const session = sessions.find((se) => (event.sessionIds ?? []).includes(se.id) && (se.speakerIds ?? []).includes(s.id));
      return { speaker: s, talkTitle: cleanTalkTitle(session?.title) };
    });
}

/** Quadratisch (Instagram): Slots als Reihen untereinander. */
async function square(event, slots, logo) {
  const { w: W, h: H } = FORMATS.instagram;
  const layers = [];

  layers.push({ input: logo.square, top: 56, left: 72 });

  const kicker = await textImg('LINE-UP KOMPLETT', { family: 'Inter ExtraBold', size: 24, color: C.blue, maxWidth: W - 500, letterSpacing: 1.4 });
  const kickerY = 168;
  layers.push({ input: kicker.data, top: kickerY, left: 72 });
  const title = await textImg(event.title, { family: 'Inter Black', size: 44, color: C.text, maxWidth: W - 144, maxHeight: 110, wrap: true });
  layers.push({ input: title.data, top: kickerY + kicker.info.height + 10, left: 72 });

  const rowsTop = 340;
  const rowsBottom = H - 150;
  const rowH = (rowsBottom - rowsTop) / slots.length;
  const R = Math.min(96, Math.round(rowH * 0.36));
  const textColX = 72 + R * 2 + 44;
  const textColW = W - textColX - 72;

  for (const [i, { speaker, talkTitle }] of slots.entries()) {
    const rowCy = rowsTop + rowH * i + rowH / 2;
    const cx = 72 + R;
    layers.push({ input: ring(W, H, cx, rowCy, R + 5, 6), top: 0, left: 0 });
    layers.push({ input: await circlePhoto(speaker, R * 2), top: Math.round(rowCy - R), left: Math.round(cx - R) });

    const availH = rowH - 16;
    const name = await textImg(speaker.title, { family: 'Inter Black', size: 34, color: C.text, maxWidth: textColW, maxHeight: Math.round(availH * 0.42), wrap: true, minSize: 20 });
    const job = speaker.jobTitle
      ? await textImg(speaker.jobTitle, { family: 'Inter', size: 20, color: C.muted, maxWidth: textColW, maxHeight: Math.round(availH * 0.28), wrap: true, minSize: 14 })
      : null;
    const talk = talkTitle
      ? await textImg(talkTitle, { family: 'Inter SemiBold', size: 19, color: '#cdbef2', maxWidth: textColW, maxHeight: Math.round(availH * 0.3), wrap: true, minSize: 14 })
      : null;

    const blockH = name.info.height + (job ? job.info.height + 6 : 0) + (talk ? talk.info.height + 6 : 0);
    let y = Math.round(rowCy - blockH / 2);
    layers.push({ input: name.data, top: y, left: textColX });
    y += name.info.height + 6;
    if (job) {
      layers.push({ input: job.data, top: y, left: textColX });
      y += job.info.height + 6;
    }
    if (talk) {
      layers.push({ input: talk.data, top: y, left: textColX });
    }

    if (i < slots.length - 1) {
      layers.push({ input: divider(W, H, 72, Math.round(rowsTop + rowH * (i + 1)), W - 144), top: 0, left: 0 });
    }
  }

  const lineY = H - 100;
  layers.push({ input: divider(W, H, 72, lineY, W - 144), top: 0, left: 0 });
  const footY = lineY + 28;
  const dateStr = fmtDate(event.eventDate);
  const left = await textImg(
    [dateStr, event.city].filter(Boolean).join(' · ').toUpperCase(),
    { family: 'Inter ExtraBold', size: 20, color: C.muted, maxWidth: 420, letterSpacing: 0.8 },
  );
  const mid = await textImg('ainights.ai', { family: 'Inter SemiBold', size: 20, color: C.text, maxWidth: 200 });
  const right = await textImg('#AINIGHTS', { family: 'Inter ExtraBold', size: 20, color: C.magenta, maxWidth: 200, letterSpacing: 0.8 });
  layers.push({ input: left.data, top: footY, left: 72 });
  layers.push({ input: mid.data, top: footY, left: Math.round((W - mid.info.width) / 2) });
  layers.push({ input: right.data, top: footY, left: W - 72 - right.info.width });

  return sharp(background(W, H)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

/** Quer (LinkedIn): Slots als Spalten nebeneinander. */
async function landscape(event, slots, logo) {
  const { w: W, h: H } = FORMATS.linkedin;
  const layers = [];

  layers.push({ input: logo.landscape, top: 40, left: 56 });

  const kicker = await textImg('LINE-UP KOMPLETT', { family: 'Inter ExtraBold', size: 18, color: C.blue, maxWidth: 420, letterSpacing: 1.2 });
  const title = await textImg(event.title, { family: 'Inter Black', size: 26, color: C.text, maxWidth: 480, maxHeight: 60, wrap: true });
  layers.push({ input: kicker.data, top: 46, left: W - 56 - Math.max(kicker.info.width, title.info.width) });
  layers.push({ input: title.data, top: 46 + kicker.info.height + 6, left: W - 56 - title.info.width });

  const colsTop = 150;
  const colsBottom = H - 96;
  const colW = (W - 112) / slots.length;
  const R = Math.min(74, Math.round(colW * 0.24));

  for (const [i, { speaker, talkTitle }] of slots.entries()) {
    const colX = 56 + colW * i;
    const cx = colX + colW / 2;
    const cy = colsTop + R;
    layers.push({ input: ring(W, H, cx, cy, R + 5, 6), top: 0, left: 0 });
    layers.push({ input: await circlePhoto(speaker, R * 2), top: Math.round(cy - R), left: Math.round(cx - R) });

    const textW = colW - 24;
    const textX = Math.round(cx - textW / 2);
    const availH = colsBottom - (cy + R + 20);

    const name = await textImg(speaker.title, { family: 'Inter Black', size: 25, color: C.text, maxWidth: textW, maxHeight: Math.round(availH * 0.32), wrap: true, align: 'center', minSize: 16 });
    const job = speaker.jobTitle
      ? await textImg(speaker.jobTitle, { family: 'Inter', size: 16, color: C.muted, maxWidth: textW, maxHeight: Math.round(availH * 0.26), wrap: true, align: 'center', minSize: 12 })
      : null;
    const talk = talkTitle
      ? await textImg(talkTitle, { family: 'Inter SemiBold', size: 15, color: '#cdbef2', maxWidth: textW, maxHeight: Math.round(availH * 0.34), wrap: true, align: 'center', minSize: 11 })
      : null;

    let y = cy + R + 20;
    layers.push({ input: name.data, top: y, left: Math.round(cx - name.info.width / 2) });
    y += name.info.height + 6;
    if (job) {
      layers.push({ input: job.data, top: y, left: Math.round(cx - job.info.width / 2) });
      y += job.info.height + 6;
    }
    if (talk) {
      layers.push({ input: talk.data, top: y, left: Math.round(cx - talk.info.width / 2) });
    }

    if (i > 0) {
      layers.push({ input: divider(W, H, colX, colsTop, 1), top: 0, left: 0 });
    }
  }

  const lineY = H - 62;
  layers.push({ input: divider(W, H, 56, lineY, W - 112), top: 0, left: 0 });
  const footY = lineY + 20;
  const dateStr = fmtDate(event.eventDate);
  const left = await textImg(
    [dateStr, event.city].filter(Boolean).join(' · ').toUpperCase(),
    { family: 'Inter ExtraBold', size: 16, color: C.muted, maxWidth: 360, letterSpacing: 0.6 },
  );
  const mid = await textImg('ainights.ai', { family: 'Inter SemiBold', size: 16, color: C.text, maxWidth: 200 });
  const right = await textImg('#AINIGHTS', { family: 'Inter ExtraBold', size: 16, color: C.magenta, maxWidth: 200, letterSpacing: 0.6 });
  layers.push({ input: left.data, top: footY, left: 56 });
  layers.push({ input: mid.data, top: footY, left: Math.round((W - mid.info.width) / 2) });
  layers.push({ input: right.data, top: footY, left: W - 56 - right.info.width });

  return sharp(background(W, H)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

async function main() {
  const [eventSlug] = process.argv.slice(2);
  if (!eventSlug) {
    console.error('Aufruf: node scripts/generate-lineup-graphics.mjs <event-slug>');
    process.exit(1);
  }

  const event = await loadJson(path.join(ROOT, `src/content/events/${eventSlug}.json`));
  const slots = await slotsFor(event);
  if (slots.length === 0) {
    console.error(`Keine echten Speaker-Slots für ${eventSlug} gefunden (nur Platzhalter oder leer).`);
    process.exit(1);
  }

  const logoSvg = await fs.readFile(LOGO);
  const logo = {
    square: await sharp(logoSvg, { density: 600 }).resize({ width: 300 }).png().toBuffer(),
    landscape: await sharp(logoSvg, { density: 600 }).resize({ width: 240 }).png().toBuffer(),
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, `${eventSlug}-instagram.png`), await square(event, slots, logo));
  await fs.writeFile(path.join(OUT_DIR, `${eventSlug}-linkedin.png`), await landscape(event, slots, logo));
  console.log(`Fertig: ${slots.length} Speaker-Slots — ${eventSlug}-instagram.png, ${eventSlug}-linkedin.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
