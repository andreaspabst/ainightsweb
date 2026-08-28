#!/usr/bin/env node
/**
 * Speaker-Announcement-Grafiken ("Ich spreche bei den AI Nights").
 *
 * Erzeugt pro Speaker zwei Bilder im AI-Nights-Look:
 *   public/media/speaker-announcements/<slug>-instagram.png   1080 × 1080
 *   public/media/speaker-announcements/<slug>-linkedin.png    1200 × 627
 *
 * Aufbau: Logo „AI Nights by AXDN“, rundes Portrait mit Verlaufsring,
 * Sprech-Pill, Name, Rolle und eine Fußzeile mit Termin, ainights.ai und
 * Hashtag. Speaker ohne kommendes Event bekommen die neutrale Pill-Variante.
 *
 * Aufruf:
 *   node scripts/generate-speaker-announcements.mjs             # alle
 *   node scripts/generate-speaker-announcements.mjs tom-fischer # einzelne Slugs
 *
 * Voraussetzung: Inter und Space Grotesk müssen als Systemschriften
 * installiert sein — Pango rendert den Text (Auto-Shrink für lange Namen).
 * Ergebnisse gehören mit ins Repo (statischer Build, kein Rendern am Server).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const OUT_DIR = path.join(PUBLIC, 'media/speaker-announcements');
const LOGO = path.join(PUBLIC, 'wp-content/uploads/2026/07/AI-Nights-Logo-wAXDN.svg');
const TODAY = new Date();

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
async function textImg(text, { family, size, color, maxWidth, maxHeight, letterSpacing = 0, wrap = false, align = 'left', minSize = 13 }) {
  let px = size;
  for (;;) {
    const spacing = letterSpacing ? ` letter_spacing="${Math.round(letterSpacing * 1024)}"` : '';
    const markup = `<span foreground="${color}"${spacing}>${esc(text)}</span>`;
    const { data, info } = await sharp({
      text: { text: markup, font: `${family} ${px}`, rgba: true, dpi: 72, align, width: wrap ? maxWidth : maxWidth * 4 },
    })
      .png()
      .toBuffer({ resolveWithObject: true });
    const fits = info.width <= maxWidth && (!maxHeight || info.height <= maxHeight);
    if (fits || px <= minSize) return { data, info };
    px -= 2;
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

function pillBg(w, h) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${C.blue}"/><stop offset="100%" stop-color="${C.magenta}"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" rx="${h / 2}" fill="url(#p)"/>
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

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const fmtDate = (iso) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const pillLabel = (event, upcoming) =>
  (upcoming ? `Ich spreche bei den AI Nights ${event?.city ?? ''}` : 'Speaker bei den AI Nights').trim().toUpperCase();

const footLeft = (event, upcoming) =>
  (upcoming && event?.eventDate
    ? `${fmtDate(event.eventDate)} · ${event.city ?? ''}`.replace(/ ·\s*$/, '')
    : 'AI Nights · KI zum Anfassen'
  ).toUpperCase();

/** Quadratisch (Instagram): Portrait mittig, Text darunter — wie die Vorlage. */
async function square(speaker, event, logo) {
  const { w: W, h: H } = FORMATS.instagram;
  const upcoming = event && new Date(event.eventDate) >= TODAY;
  const layers = [];
  const R = 200;
  const CX = W / 2;
  const CY = 424;

  layers.push({ input: ring(W, H, CX, CY, R + 7, 10), top: 0, left: 0 });
  layers.push({ input: await circlePhoto(speaker, R * 2), top: CY - R, left: CX - R });
  layers.push({ input: logo.square, top: 62, left: 72 });

  const pill = await textImg(pillLabel(event, upcoming), {
    family: 'Inter ExtraBold', size: 30, color: '#ffffff', maxWidth: W - 300, letterSpacing: 1.2,
  });
  const pillW = pill.info.width + 92;
  const pillH = 72;
  const pillY = 690;
  layers.push({ input: pillBg(pillW, pillH), top: pillY, left: Math.round((W - pillW) / 2) });
  layers.push({ input: pill.data, top: pillY + Math.round((pillH - pill.info.height) / 2), left: Math.round((W - pill.info.width) / 2) });

  const name = await textImg(speaker.title, { family: 'Inter Black', size: 72, color: C.text, maxWidth: W - 160 });
  const nameY = pillY + pillH + 30;
  layers.push({ input: name.data, top: nameY, left: Math.round((W - name.info.width) / 2) });

  if (speaker.jobTitle) {
    const role = await textImg(speaker.jobTitle, { family: 'Inter', size: 28, color: C.muted, maxWidth: W - 280 });
    layers.push({ input: role.data, top: nameY + name.info.height + 16, left: Math.round((W - role.info.width) / 2) });
  }

  const lineY = 958;
  layers.push({ input: divider(W, H, 72, lineY, W - 144), top: 0, left: 0 });
  const footY = lineY + 32;
  const l = await textImg(footLeft(event, upcoming), { family: 'Inter ExtraBold', size: 20, color: C.muted, maxWidth: 330, letterSpacing: 0.8 });
  const m = await textImg('ainights.ai', { family: 'Inter SemiBold', size: 20, color: C.text, maxWidth: 200 });
  const r = await textImg('#AINIGHTS', { family: 'Inter ExtraBold', size: 20, color: C.magenta, maxWidth: 200, letterSpacing: 0.8 });
  layers.push({ input: l.data, top: footY, left: 72 });
  layers.push({ input: m.data, top: footY, left: Math.round((W - m.info.width) / 2) });
  layers.push({ input: r.data, top: footY, left: W - 72 - r.info.width });

  return sharp(background(W, H)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

/** Quer (LinkedIn): Portrait links, Text rechts — gleiche Bausteine. */
async function landscape(speaker, event, talkTitle, logo) {
  const { w: W, h: H } = FORMATS.linkedin;
  const upcoming = event && new Date(event.eventDate) >= TODAY;
  const layers = [];
  const R = 158;
  const CX = 260;
  const CY = 330;
  const colX = 500;
  const colW = W - colX - 64;

  layers.push({ input: ring(W, H, CX, CY, R + 6, 9), top: 0, left: 0 });
  layers.push({ input: await circlePhoto(speaker, R * 2), top: CY - R, left: CX - R });
  layers.push({ input: logo.landscape, top: 46, left: 64 });

  const pill = await textImg(pillLabel(event, upcoming), {
    family: 'Inter ExtraBold', size: 22, color: '#ffffff', maxWidth: colW - 60, letterSpacing: 1,
  });
  const pillW = pill.info.width + 64;
  const pillH = 54;
  const pillY = 96;
  layers.push({ input: pillBg(pillW, pillH), top: pillY, left: colX });
  layers.push({ input: pill.data, top: pillY + Math.round((pillH - pill.info.height) / 2), left: colX + 32 });

  const name = await textImg(speaker.title, { family: 'Inter Black', size: 56, color: C.text, maxWidth: colW, maxHeight: 150, wrap: true });
  const nameY = pillY + pillH + 26;
  layers.push({ input: name.data, top: nameY, left: colX });
  let y = nameY + name.info.height + 12;

  if (speaker.jobTitle) {
    const role = await textImg(speaker.jobTitle, { family: 'Inter', size: 24, color: C.muted, maxWidth: colW, maxHeight: 70, wrap: true });
    layers.push({ input: role.data, top: y, left: colX });
    y += role.info.height + 18;
  }

  if (talkTitle) {
    const label = await textImg('TALK', { family: 'Inter ExtraBold', size: 17, color: '#2ea3f2', maxWidth: 120, letterSpacing: 1.6 });
    layers.push({ input: label.data, top: y, left: colX });
    const talk = await textImg(talkTitle, { family: 'Inter SemiBold', size: 25, color: C.text, maxWidth: colW, maxHeight: 76, wrap: true });
    layers.push({ input: talk.data, top: y + label.info.height + 8, left: colX });
  }

  const lineY = H - 78;
  layers.push({ input: divider(W, H, 64, lineY, W - 128), top: 0, left: 0 });
  const footY = lineY + 26;
  const l = await textImg(footLeft(event, upcoming), { family: 'Inter ExtraBold', size: 19, color: C.muted, maxWidth: 380, letterSpacing: 0.8 });
  const m = await textImg('ainights.ai', { family: 'Inter SemiBold', size: 19, color: C.text, maxWidth: 200 });
  const r = await textImg('#AINIGHTS', { family: 'Inter ExtraBold', size: 19, color: C.magenta, maxWidth: 200, letterSpacing: 0.8 });
  layers.push({ input: l.data, top: footY, left: 64 });
  layers.push({ input: m.data, top: footY, left: Math.round((W - m.info.width) / 2) });
  layers.push({ input: r.data, top: footY, left: W - 64 - r.info.width });

  return sharp(background(W, H)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

async function readJsonDir(dir) {
  const files = await fs.readdir(dir);
  return Promise.all(
    files.filter((f) => f.endsWith('.json')).map(async (f) => JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'))),
  );
}

/** Talk-Titel ohne Zeitfenster-Präfix („18:00 - 18:45 | …“). */
function cleanTalkTitle(title) {
  if (!title) return null;
  const t = String(title)
    .replace(/^\s*\d{1,2}[:.]\d{2}\s*[–-]\s*\d{1,2}[:.]\d{2}\s*(\||·|-)?\s*/, '')
    .replace(/^\(inkl\.[^)]*\)\s*(\||:)?\s*/i, '')
    .trim();
  return t || null;
}

const only = process.argv.slice(2);
await fs.mkdir(OUT_DIR, { recursive: true });

const speakers = (await readJsonDir(path.join(ROOT, 'src/content/speaker')))
  .filter((s) => !s.slug.startsWith('ai-nights-speaker'))
  .filter((s) => only.length === 0 || only.includes(s.slug))
  .sort((a, b) => a.slug.localeCompare(b.slug));
const sessions = await readJsonDir(path.join(ROOT, 'src/content/sessions'));
const events = await readJsonDir(path.join(ROOT, 'src/content/events'));

/** Nächstes kommendes Event des Speakers, sonst das zuletzt vergangene. */
function eventFor(id) {
  const mine = events
    .filter((e) => (e.speakerIds ?? []).includes(id) || (e.moderatorIds ?? []).includes(id))
    .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
  return mine.find((e) => new Date(e.eventDate) >= TODAY) ?? mine[mine.length - 1] ?? null;
}

function talkFor(speaker) {
  const s = sessions.find(
    (se) => se.speakerSlugs?.includes(speaker.slug) || (speaker.id && se.speakerIds?.includes(speaker.id)),
  );
  return cleanTalkTitle(s?.title);
}

const logoSvg = await fs.readFile(LOGO);
const logo = {
  square: await sharp(logoSvg, { density: 600 }).resize({ width: 330 }).png().toBuffer(),
  landscape: await sharp(logoSvg, { density: 600 }).resize({ width: 270 }).png().toBuffer(),
};

let count = 0;
for (const s of speakers) {
  const event = eventFor(s.id);
  await fs.writeFile(path.join(OUT_DIR, `${s.slug}-instagram.png`), await square(s, event, logo));
  await fs.writeFile(path.join(OUT_DIR, `${s.slug}-linkedin.png`), await landscape(s, event, talkFor(s), logo));
  count += 2;
  console.log('✓', s.slug);
}
console.log(`Fertig: ${count} Grafiken in ${path.relative(ROOT, OUT_DIR)}`);
