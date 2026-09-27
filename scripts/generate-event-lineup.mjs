#!/usr/bin/env node
/**
 * Line-up-Grafik pro Event — Nachbau der bisherigen Canva-Line-up-Posts:
 * links oben Logo, „Line up“ und Datum, rechts die Stichpunkte mit pinken
 * Pfeilen, darunter pro Speaker eine pinke Karte mit rundem Foto, Name und
 * Jobtitel, unten Wochentag/Uhrzeit/Location, Claim und der Ticket-Button.
 *
 *   instagram → Portrait 1080×1350
 *   linkedin  → Landscape 1200×627: Kopf + Termin + Ticket-Button links,
 *               Speaker-Karten rechts (LinkedIn beschneidet Portrait-Bilder
 *               im Feed auf ~1.91:1 — daher ein eigener Zuschnitt).
 *
 * Ausgabe:
 *   public/media/event-lineups/<event-slug>-instagram.png
 *   public/media/event-lineups/<event-slug>-linkedin.png
 *
 * Zeigt alle bestätigten Speaker (event.speakerIds, ohne Platzhalter).
 * Bei AI-Woman-Nights-Events wird das Woman-Lockup gesetzt.
 *
 * Aufruf:
 *   node scripts/generate-event-lineup.mjs <event-slug>
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { C, PUBLIC, ROOT, textImg, circlePhoto, loadEventKit, loadLogo, logoFor } from './lib/social-kit.mjs';

const OUT_DIR = path.join(PUBLIC, 'media/event-lineups');
const SIZE = { instagram: { w: 1080, h: 1350 }, linkedin: { w: 1200, h: 627 } };
const PINK = C.magenta;
const INK = '#07030f';
const DISPLAY = 'Glacial Indifference';
const DISPLAY_BOLD = 'Glacial Indifference Bold';
const CLAIM = 'KI gemeinsam einordnen und weiterdenken – live vor Ort';
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

const svg = (w, h, body) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);

function eventDateParts(event) {
  const [y, m, d] = String(event.eventDate ?? '').slice(0, 10).split('-').map(Number);
  if (!y) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return { short: `${dd}.${mm}.${String(y).slice(2)}`, day: `${WEEKDAYS[date.getUTCDay()]} ${dd}.${mm}.` };
}

function bullets(kit) {
  const n = kit.speakers.length;
  return [
    kit.isWoman ? `${n} Expertinnen` : `${n} Expert Speaker`,
    'Praxisnahe KI-Themen',
    'Live Talks & Q&A',
    'Netzwerken & Austausch',
    'Drinks & Snacks inkl.',
  ];
}

/** Schwarzer Grund, unten ein Violett-Magenta-Verlauf und seitliche Neon-Linien. */
function background(W, H, { bandTop, neonY, neonH }) {
  const lines = (side) => {
    const color = side === 'left' ? C.blue : PINK;
    return [0, 1, 2]
      .map((i) => {
        const off = i * 22;
        const [x1, x2] = side === 'left' ? [-40 + off, 90 + off] : [W + 40 - off, W - 90 - off];
        return `<line x1="${x1}" y1="${neonY + off}" x2="${x2}" y2="${neonY + neonH + off}" stroke="${color}" stroke-width="5" stroke-opacity="${0.9 - i * 0.2}"/>`;
      })
      .join('');
  };
  return svg(W, H, `
    <defs>
      <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${INK}"/><stop offset="35%" stop-color="#1c0c4f"/><stop offset="100%" stop-color="#3d0a4f"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="100%" r="70%">
        <stop offset="0%" stop-color="${PINK}" stop-opacity=".35"/><stop offset="100%" stop-color="${PINK}" stop-opacity="0"/>
      </radialGradient>
      <filter id="neon" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>
    <rect width="${W}" height="${H}" fill="${INK}"/>
    <rect y="${bandTop}" width="${W}" height="${H - bandTop}" fill="url(#band)"/>
    <rect y="${bandTop}" width="${W}" height="${H - bandTop}" fill="url(#glow)"/>
    <g filter="url(#neon)">${lines('left')}${lines('right')}</g>
    ${lines('left')}${lines('right')}`);
}

/** Pinker Pfeil (nach links zeigendes Dreieck). */
const arrow = (s) => svg(s, s, `<polygon points="${s},0 ${s},${s} 0,${s / 2}" fill="${PINK}" rx="2"/>`);

/** Kalender-Icon mit Uhr, weiße Linien. */
function calendarIcon(s) {
  const st = Math.max(3, Math.round(s * 0.05));
  const cells = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++)
      if (!(r === 2 && c === 3)) cells.push(`<rect x="${s * 0.12 + c * s * 0.14}" y="${s * 0.34 + r * s * 0.14}" width="${s * 0.09}" height="${s * 0.09}" fill="none" stroke="#fff" stroke-width="${st * 0.6}"/>`);
  return svg(s, s, `
    <rect x="${st}" y="${s * 0.12}" width="${s * 0.72}" height="${s * 0.66}" rx="${s * 0.06}" fill="none" stroke="#fff" stroke-width="${st}"/>
    <line x1="${st}" y1="${s * 0.26}" x2="${s * 0.72 + st}" y2="${s * 0.26}" stroke="#fff" stroke-width="${st}"/>
    <line x1="${s * 0.2}" y1="${s * 0.04}" x2="${s * 0.2}" y2="${s * 0.18}" stroke="#fff" stroke-width="${st}"/>
    <line x1="${s * 0.56}" y1="${s * 0.04}" x2="${s * 0.56}" y2="${s * 0.18}" stroke="#fff" stroke-width="${st}"/>
    ${cells.join('')}
    <circle cx="${s * 0.76}" cy="${s * 0.76}" r="${s * 0.21}" fill="${INK}" stroke="#fff" stroke-width="${st}"/>
    <polyline points="${s * 0.76},${s * 0.64} ${s * 0.76},${s * 0.77} ${s * 0.85},${s * 0.82}" fill="none" stroke="#fff" stroke-width="${st}"/>`);
}

/** Ticket-Button: links Verlauf mit „TICKETS“, rechts weiß mit „ainights.ai“. */
async function ticketPill(w, h, fontSize) {
  const split = Math.round(w * 0.46);
  const r = h / 2;
  const base = svg(w, h, `
    <defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${PINK}"/><stop offset="100%" stop-color="${C.violet}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" rx="${r}" fill="#ffffff"/>
    <path d="M${r},0 H${split} Q${split + r * 0.6},0 ${split + r * 0.6},${r} Q${split + r * 0.6},${h} ${split},${h} H${r} A${r},${r} 0 0 1 ${r},0 Z" fill="url(#t)"/>`);
  const t = await textImg('TICKETS', { family: DISPLAY, size: fontSize, color: '#ffffff', maxWidth: split - r, letterSpacing: fontSize * 0.12 });
  const u = await textImg('ainights.ai', { family: DISPLAY, size: fontSize, color: INK, maxWidth: w - split - r });
  const rightMid = split + r * 0.6 + (w - split - r * 0.6) / 2;
  return sharp(base)
    .composite([
      { input: t.data, top: Math.round((h - t.info.height) / 2), left: Math.round((split + r * 0.3 - t.info.width) / 2) },
      { input: u.data, top: Math.round((h - u.info.height) / 2), left: Math.round(rightMid - u.info.width / 2) },
    ])
    .png()
    .toBuffer();
}

/**
 * Speaker-Karten nebeneinander: rundes Foto mit grauem Rand, das oben aus
 * der pinken Karte ragt, darunter Name (fett) und Jobtitel.
 */
async function speakerCards(layers, speakers, { x0, width, top, gap, R, nameSize, jobSize, radius, pad }) {
  const n = speakers.length;
  const cardW = Math.floor((width - gap * (n - 1)) / n);
  const photoR = Math.min(R, Math.floor(cardW * 0.42));
  const border = Math.max(4, Math.round(photoR * 0.05));
  const cardTop = top + photoR;
  // Erst alle Texte setzen, dann zeichnen: alle Karten bekommen die Höhe der
  // längsten, damit die Reihe auch mit fehlendem Jobtitel ruhig aussieht.
  const cards = [];
  for (let i = 0; i < n; i++) {
    const s = speakers[i];
    const name = await textImg(s.title, {
      family: DISPLAY_BOLD, size: nameSize, color: '#ffffff', maxWidth: cardW - pad * 2, maxHeight: nameSize * 2.6, wrap: true, align: 'center', minSize: 14,
    });
    const job = s.jobTitle
      ? await textImg(String(s.jobTitle).split('|')[0].trim(), {
          family: DISPLAY, size: jobSize, color: '#ffffff', maxWidth: cardW - pad * 2, maxHeight: jobSize * 5.2, wrap: true, align: 'center', minSize: 11,
        })
      : null;
    const nameY = top + photoR * 2 + border + Math.round(pad * 0.7);
    const jobY = nameY + name.info.height + Math.round(pad * 0.25);
    cards.push({ s, name, job, nameY, jobY, bottom: (job ? jobY + job.info.height : nameY + name.info.height) + pad });
  }
  const maxBottom = Math.max(...cards.map((c) => c.bottom));
  for (let i = 0; i < n; i++) {
    const { s, name, job, nameY, jobY } = cards[i];
    const x = x0 + i * (cardW + gap);
    const cx = x + cardW / 2;
    layers.push({ input: svg(cardW, maxBottom - cardTop, `<rect width="${cardW}" height="${maxBottom - cardTop}" rx="${radius}" fill="${PINK}"/>`), top: cardTop, left: x });
    const ring = svg(photoR * 2 + border * 2, photoR * 2 + border * 2, `<circle cx="${photoR + border}" cy="${photoR + border}" r="${photoR + border}" fill="#c9c9cf"/>`);
    layers.push({ input: ring, top: top - border, left: Math.round(cx - photoR - border) });
    layers.push({ input: await circlePhoto(s, photoR * 2), top, left: Math.round(cx - photoR) });
    layers.push({ input: name.data, top: nameY, left: Math.round(cx - name.info.width / 2) });
    if (job) layers.push({ input: job.data, top: jobY, left: Math.round(cx - job.info.width / 2) });
  }
  return maxBottom;
}

/** Wochentag/Uhrzeit/Location mit Kalender-Icon. Gibt die Unterkante zurück. */
async function eventInfo(layers, event, { x, top, icon, size, maxWidth }) {
  const d = eventDateParts(event);
  layers.push({ input: calendarIcon(icon), top, left: x });
  const tx = x + icon + Math.round(icon * 0.35);
  let y = top - Math.round(size * 0.15);
  const rows = [
    d && { text: d.day, family: DISPLAY_BOLD, color: PINK },
    event.startTime && { text: `ab ${event.startTime} Uhr`, family: DISPLAY, color: '#ffffff' },
    event.locationName && { text: event.locationName, family: DISPLAY, color: '#ffffff' },
  ].filter(Boolean);
  for (const r of rows) {
    const t = await textImg(r.text, { family: r.family, size, color: r.color, maxWidth: maxWidth - (tx - x) });
    layers.push({ input: t.data, top: y, left: tx });
    y += Math.round(size * 1.22);
  }
  return { bottom: y, textRight: tx };
}

async function portraitCard(kit, logo) {
  const { w: W, h: H } = SIZE.instagram;
  const M = 95;
  const layers = [];
  const d = eventDateParts(kit.event);

  layers.push({ input: logo.portrait, top: 112, left: M });
  const logoH = (await sharp(logo.portrait).metadata()).height;
  const head = await textImg('Line up', { family: DISPLAY, size: 96, color: '#ffffff', maxWidth: 480 });
  const headY = 112 + logoH + 6;
  layers.push({ input: head.data, top: headY, left: M - 4 });
  if (d) {
    const date = await textImg(d.short, { family: DISPLAY, size: 96, color: '#ffffff', maxWidth: 480 });
    layers.push({ input: date.data, top: headY + head.info.height + 4, left: M - 4 });
  }

  // Stichpunkte rechts, rechtsbündig, mit Pfeil
  const arrowS = 22;
  const right = W - M;
  let by = 138;
  for (const b of bullets(kit)) {
    const t = await textImg(b, { family: DISPLAY, size: 30, color: '#ffffff', maxWidth: 400 });
    layers.push({ input: t.data, top: by, left: right - arrowS - 18 - t.info.width });
    layers.push({ input: arrow(arrowS), top: by + Math.round((t.info.height - arrowS) / 2), left: right - arrowS });
    by += 58;
  }

  const cardsBottom = await speakerCards(layers, kit.speakers, {
    x0: 107, width: W - 214, top: 468, gap: 30, R: 108, nameSize: 30, jobSize: 21, radius: 44, pad: 22,
  });

  const infoTop = Math.max(cardsBottom + 64, 965);
  const info = await eventInfo(layers, kit.event, { x: 117, top: infoTop, icon: 84, size: 30, maxWidth: 430 });
  const divX = 546;
  layers.push({ input: svg(3, 76, `<rect width="3" height="76" fill="#ffffff"/>`), top: infoTop + 6, left: divX });
  const claim = await textImg(CLAIM, { family: DISPLAY, size: 30, color: '#ffffff', maxWidth: W - divX - 40 - M + 30, wrap: true, lineSpacing: 1.05 });
  layers.push({ input: claim.data, top: infoTop - 4, left: divX + 40 });

  const pillW = 650;
  const pillH = 110;
  layers.push({ input: await ticketPill(pillW, pillH, 32), top: Math.max(info.bottom + 36, H - pillH - 90), left: Math.round((W - pillW) / 2) });

  const bg = background(W, H, { bandTop: Math.min(cardsBottom + 30, 930), neonY: cardsBottom - 120, neonH: 150 });
  return sharp(bg).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

async function landscapeCard(kit, logo) {
  const { w: W, h: H } = SIZE.linkedin;
  const M = 56;
  const layers = [];
  const d = eventDateParts(kit.event);

  layers.push({ input: logo.landscape, top: 44, left: M });
  const logoH = (await sharp(logo.landscape).metadata()).height;
  const head = await textImg(d ? `Line up ${d.short}` : 'Line up', { family: DISPLAY, size: 52, color: '#ffffff', maxWidth: 380 });
  layers.push({ input: head.data, top: 44 + logoH + 14, left: M - 2 });

  const info = await eventInfo(layers, kit.event, { x: M, top: 300, icon: 58, size: 22, maxWidth: 360 });
  layers.push({ input: await ticketPill(330, 64, 21), top: Math.max(info.bottom + 26, H - 64 - 56), left: M });

  const colX = 440;
  await speakerCards(layers, kit.speakers, {
    x0: colX, width: W - colX - M, top: 70, gap: 22, R: 92, nameSize: 23, jobSize: 16, radius: 32, pad: 16,
  });

  const bg = background(W, H, { bandTop: Math.round(H * 0.55), neonY: H - 150, neonH: 120 });
  return sharp(bg).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

const [eventSlug] = process.argv.slice(2);
if (!eventSlug) {
  console.error('Aufruf: node scripts/generate-event-lineup.mjs <event-slug>');
  process.exit(1);
}

const kit = await loadEventKit(eventSlug);
if (kit.speakers.length === 0) {
  console.error(`Keine bestätigten Speaker für "${eventSlug}" — nichts zu generieren.`);
  process.exit(1);
}

await fs.mkdir(OUT_DIR, { recursive: true });
const logo = logoFor(kit, await loadLogo());

console.log(`Line-up für "${kit.event.title}": ${kit.speakers.map((s) => s.title).join(', ')}`);
await fs.writeFile(path.join(OUT_DIR, `${eventSlug}-instagram.png`), await portraitCard(kit, logo));
await fs.writeFile(path.join(OUT_DIR, `${eventSlug}-linkedin.png`), await landscapeCard(kit, logo));
console.log(`Fertig: 2 Grafiken in ${path.relative(ROOT, OUT_DIR)}`);
