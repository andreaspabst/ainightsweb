#!/usr/bin/env node
/**
 * Line-up-Grafik pro Event ("Alle Speaker auf einen Blick").
 *
 * Erzeugt pro Event zwei Bilder im AI-Nights-Look (gleiche Bausteine wie
 * scripts/generate-speaker-announcements.mjs — Logo, Verlaufsring, Footer):
 *   public/media/event-lineups/<event-slug>-instagram.png   1080 × 1080
 *   public/media/event-lineups/<event-slug>-linkedin.png    1200 × 627
 *
 * Zeigt alle bestätigten Speaker (event.speakerIds, ohne Platzhalter — wie
 * die "N Speaker"-Zählung auf der Event-Seite) nebeneinander mit Foto, Name
 * und Jobtitel. Spaltenbreite richtet sich nach der Anzahl Speaker, jeder
 * Text schrumpft automatisch in seine Spalte hinein — verhindert
 * Überlappungen bei langen Namen/Jobtiteln oder mehr als 3 Speakern.
 *
 * Aufruf:
 *   node scripts/generate-event-lineup.mjs <event-slug>
 *   node scripts/generate-event-lineup.mjs ai-nights-nuernberg-05
 *
 * Voraussetzung: Inter muss als Systemschrift installiert sein (Pango
 * rendert den Text, wie bei generate-speaker-announcements.mjs).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Platzhalter-Speaker ("AI Nights Speaker #01–#04") wie in
// generate-speaker-announcements.mjs und src/lib/speakers.ts ausschließen.
const isPlaceholderSpeaker = (s) => s.slug.startsWith('ai-nights-speaker');

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const OUT_DIR = path.join(PUBLIC, 'media/event-lineups');
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

/** Text als transparentes PNG; verkleinert die Schrift, bis er in den Platz passt
 * (identisches Verhalten wie generate-speaker-announcements.mjs — garantiert,
 * dass Namen/Jobtitel nie über ihre Spalte hinausragen und sich überlappen). */
async function textImg(text, { family, size, color, maxWidth, maxHeight, letterSpacing = 0, wrap = false, align = 'left', minSize = 13 }) {
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
    px -= 2;
  }
}

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
      <stop offset="0%" stop-color="${C.magenta}" stop-opacity=".38"/><stop offset="100%" stop-color="${C.magenta}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="50%" cy="50%">
      <stop offset="0%" stop-color="${C.blue}" stop-opacity=".34"/><stop offset="100%" stop-color="${C.blue}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="45" height="45" patternUnits="userSpaceOnUse">
      <path d="M45 0 L0 0 0 45" fill="none" stroke="#ffffff" stroke-opacity=".045" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  <circle cx="${Math.round(w * 0.12)}" cy="${Math.round(h * 0.82)}" r="${Math.round(h * 0.36)}" fill="url(#glowA)"/>
  <circle cx="${Math.round(w * 0.87)}" cy="${Math.round(h * 0.2)}" r="${Math.round(h * 0.34)}" fill="url(#glowB)"/>
  <rect x="0" y="0" width="${w}" height="8" fill="url(#accent)"/>
</svg>`);
}

function ring(w, h, cx, cy, r, width) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.blue}"/><stop offset="50%" stop-color="#8b2fd8"/><stop offset="100%" stop-color="${C.magenta}"/>
  </linearGradient></defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#ring)" stroke-width="${width}"/>
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
const footLeft = (event) =>
  (event?.eventDate ? `${fmtDate(event.eventDate)} · ${event.city ?? ''}`.replace(/ ·\s*$/, '') : 'AI Nights · KI zum Anfassen').toUpperCase();

/** Reihe aus Foto + Name + Jobtitel je Speaker, Spaltenbreite = verfügbare
 * Breite / Anzahl Speaker — Text schrumpft automatisch in seine Spalte,
 * dadurch keine Überlappung zwischen Nachbar-Spalten möglich. */
async function speakerRow(layers, { w: W, h: H }, speakers, { marginX, rowTop, rowBottom, nameSize, jobSize, maxR }) {
  const n = speakers.length;
  const colW = (W - marginX * 2) / n;
  const R = Math.min(maxR, Math.floor(colW * 0.36));
  const availableHeight = rowBottom - rowTop;

  for (let i = 0; i < n; i++) {
    const s = speakers[i];
    const cx = marginX + colW * i + colW / 2;
    const photoTop = rowTop;
    layers.push({ input: ring(W, H, cx, photoTop + R, R + 6, 7), top: 0, left: 0 });
    layers.push({ input: await circlePhoto(s, R * 2), top: photoTop, left: Math.round(cx - R) });

    const name = await textImg(s.title, {
      family: 'Inter Black', size: nameSize, color: C.text, maxWidth: colW - 20, maxHeight: nameSize * 2.4, wrap: true, align: 'center', minSize: 16,
    });
    const nameY = photoTop + R * 2 + 16;
    layers.push({ input: name.data, top: nameY, left: Math.round(cx - name.info.width / 2) });

    if (s.jobTitle) {
      const jobMaxH = Math.max(0, availableHeight - (R * 2 + 16 + name.info.height + 10));
      if (jobMaxH > jobSize) {
        const job = await textImg(s.jobTitle, {
          family: 'Inter', size: jobSize, color: C.muted, maxWidth: colW - 20, maxHeight: jobMaxH, wrap: true, align: 'center', minSize: 12,
        });
        layers.push({ input: job.data, top: nameY + name.info.height + 10, left: Math.round(cx - job.info.width / 2) });
      }
    }
  }
}

async function lineupSquare(event, speakers, logo) {
  const F = FORMATS.instagram;
  const { w: W, h: H } = F;
  const layers = [];
  layers.push({ input: logo.square, top: 62, left: 72 });

  const title = await textImg(event.title.replace(/\s*\|\s*/g, ' — '), {
    family: 'Inter Black', size: 44, color: C.text, maxWidth: W - 160, maxHeight: 140, wrap: true, align: 'center', minSize: 28,
  });
  const titleY = 210;
  layers.push({ input: title.data, top: titleY, left: Math.round((W - title.info.width) / 2) });

  const lineY = 958;
  const rowTop = titleY + title.info.height + 44;
  await speakerRow(layers, F, speakers, { marginX: 72, rowTop, rowBottom: lineY - 30, nameSize: 30, jobSize: 20, maxR: 150 });

  layers.push({ input: divider(W, H, 72, lineY, W - 144), top: 0, left: 0 });
  const footY = lineY + 32;
  const l = await textImg(footLeft(event), { family: 'Inter ExtraBold', size: 20, color: C.muted, maxWidth: 330, letterSpacing: 0.8 });
  const m = await textImg('ainights.ai', { family: 'Inter SemiBold', size: 20, color: C.text, maxWidth: 200 });
  const r = await textImg('#AINIGHTS', { family: 'Inter ExtraBold', size: 20, color: C.magenta, maxWidth: 200, letterSpacing: 0.8 });
  layers.push({ input: l.data, top: footY, left: 72 });
  layers.push({ input: m.data, top: footY, left: Math.round((W - m.info.width) / 2) });
  layers.push({ input: r.data, top: footY, left: W - 72 - r.info.width });

  return sharp(background(W, H)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

async function lineupLandscape(event, speakers, logo) {
  const F = FORMATS.linkedin;
  const { w: W, h: H } = F;
  const layers = [];
  layers.push({ input: logo.landscape, top: 40, left: 56 });

  const title = await textImg(event.title.replace(/\s*\|\s*/g, ' — '), {
    family: 'Inter Black', size: 26, color: C.text, maxWidth: W - 300, maxHeight: 36, minSize: 18,
  });
  layers.push({ input: title.data, top: 54, left: W - 56 - title.info.width });

  const lineY = H - 66;
  const rowTop = 130;
  await speakerRow(layers, F, speakers, { marginX: 56, rowTop, rowBottom: lineY - 20, nameSize: 24, jobSize: 15, maxR: 85 });

  layers.push({ input: divider(W, H, 56, lineY, W - 112), top: 0, left: 0 });
  const footY = lineY + 22;
  const l = await textImg(footLeft(event), { family: 'Inter ExtraBold', size: 17, color: C.muted, maxWidth: 380, letterSpacing: 0.8 });
  const m = await textImg('ainights.ai', { family: 'Inter SemiBold', size: 17, color: C.text, maxWidth: 200 });
  const r = await textImg('#AINIGHTS', { family: 'Inter ExtraBold', size: 17, color: C.magenta, maxWidth: 200, letterSpacing: 0.8 });
  layers.push({ input: l.data, top: footY, left: 56 });
  layers.push({ input: m.data, top: footY, left: Math.round((W - m.info.width) / 2) });
  layers.push({ input: r.data, top: footY, left: W - 56 - r.info.width });

  return sharp(background(W, H)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

async function loadJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

const [eventSlug] = process.argv.slice(2);
if (!eventSlug) {
  console.error('Aufruf: node scripts/generate-event-lineup.mjs <event-slug>');
  process.exit(1);
}

const event = await loadJson(path.join(ROOT, `src/content/events/${eventSlug}.json`));
const speakerFiles = await fs.readdir(path.join(ROOT, 'src/content/speaker'));
const speakerById = new Map();
for (const f of speakerFiles) {
  const s = await loadJson(path.join(ROOT, 'src/content/speaker', f));
  if (s.id) speakerById.set(s.id, s);
}

const speakers = (event.speakerIds ?? [])
  .map((id) => speakerById.get(id))
  .filter(Boolean)
  .filter((s) => !isPlaceholderSpeaker(s));

if (speakers.length === 0) {
  console.error(`Keine bestätigten Speaker für "${eventSlug}" — nichts zu generieren.`);
  process.exit(1);
}

await fs.mkdir(OUT_DIR, { recursive: true });
const logoSvg = await fs.readFile(LOGO);
const logo = {
  square: await sharp(logoSvg, { density: 600 }).resize({ width: 300 }).png().toBuffer(),
  landscape: await sharp(logoSvg, { density: 600 }).resize({ width: 220 }).png().toBuffer(),
};

console.log(`Line-up für "${event.title}": ${speakers.map((s) => s.title).join(', ')}`);
await fs.writeFile(path.join(OUT_DIR, `${eventSlug}-instagram.png`), await lineupSquare(event, speakers, logo));
await fs.writeFile(path.join(OUT_DIR, `${eventSlug}-linkedin.png`), await lineupLandscape(event, speakers, logo));
console.log(`Fertig: 2 Grafiken in ${path.relative(ROOT, OUT_DIR)}`);
