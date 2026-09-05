#!/usr/bin/env node
/**
 * #speakerintro-Karten (Portrait 1080×1350) — Nachbau der Vorlage:
 * Speaker-Foto vollflächig, oben rechts „#speakerintro“, unten links der
 * Name (erste Zeile weiß auf Magenta-Block, zweite Zeile weiß), darunter
 * rechtsbündig der Jobtitel auf Magenta-Block, unten mittig das
 * AI-Nights-Logo (bei AI-Woman-Nights-Events plus „AI WOMAN NIGHTS“-Block).
 *
 * Ausgabe: public/media/speaker-intro-cards/<event-slug>/<speaker-slug>.png
 * Die Dateien tauchen automatisch pro Event auf /tools/ auf.
 *
 * Aufruf:
 *   node scripts/generate-speaker-intro-cards.mjs ai-nights-nuernberg-05 [weitere-slugs]
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { C, PUBLIC, textImg, solidRect, loadEventKit, loadLogo } from './lib/social-kit.mjs';

const OUT_BASE = path.join(PUBLIC, 'media/speaker-intro-cards');
const W = 1080;
const H = 1350;
const MARGIN = 84;
const PINK = C.magentaDeep;

/** Foto vollflächig, oben leicht abgedunkelt für den Hashtag, unten fürs Logo. */
async function photoLayer(speaker) {
  const src = speaker.image?.src ? path.join(PUBLIC, speaker.image.src) : null;
  const overlay = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0f0122" stop-opacity=".42"/><stop offset="100%" stop-color="#0f0122" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="bottom" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="#0f0122" stop-opacity=".5"/><stop offset="100%" stop-color="#0f0122" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${Math.round(H * 0.22)}" fill="url(#top)"/>
    <rect y="${Math.round(H * 0.72)}" width="${W}" height="${Math.round(H * 0.28)}" fill="url(#bottom)"/>
  </svg>`);
  if (!src) {
    // Ohne Foto: Marken-Verlauf als Fläche, damit die Karte trotzdem funktioniert.
    const fallback = Buffer.from(`<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.blue}"/><stop offset="100%" stop-color="${C.magenta}"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/></svg>`);
    return sharp(fallback).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
  }
  return sharp(src)
    .resize(W, H, { fit: 'cover', position: 'attention' })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

/** Name in zwei Zeilen aufteilen: „Tom Fischer“ → [„TOM“, „FISCHER“]. */
function nameLines(title) {
  const clean = String(title).replace(/\s+/g, ' ').trim();
  const parts = clean.split(' ');
  if (parts.length <= 1) return [clean.toUpperCase(), ''];
  // Duos („Tim Junge & Markus Utomo“): am & trennen, sonst nach dem Vornamen.
  const amp = clean.indexOf(' & ');
  if (amp > 0) return [clean.slice(0, amp).toUpperCase(), clean.slice(amp + 1).trim().toUpperCase()];
  // Akademische Titel gehören mit auf den ersten Block („DR. DINA“ / „BARBIAN“).
  const firstCount = /^(dr\.?|prof\.?)$/i.test(parts[0]) && parts.length > 2 ? 2 : 1;
  return [parts.slice(0, firstCount).join(' ').toUpperCase(), parts.slice(firstCount).join(' ').toUpperCase()];
}

/** Kurzform des Jobtitels für die Pill (wie „KI-MANAGER @ VNP“). */
function shortRole(jobTitle) {
  if (!jobTitle) return null;
  const first = String(jobTitle).split('|')[0].trim();
  return first.toUpperCase();
}

async function card(kit, speaker, logo) {
  const layers = [];

  // #speakerintro oben rechts
  const tag = await textImg('#speakerintro', { family: 'Inter Black', size: 58, color: '#ffffff', maxWidth: W - MARGIN * 2 });
  layers.push({ input: tag.data, top: 74, left: W - MARGIN - tag.info.width });

  // Name unten links: Zeile 1 auf Pink-Block, Zeile 2 weiß
  const [line1, line2] = nameLines(speaker.title);
  const padX = 34;
  const padY = 18;
  const n1 = await textImg(line1, { family: 'Inter Black', size: 104, color: '#ffffff', maxWidth: W - MARGIN * 2 - padX * 2 });
  const block1W = n1.info.width + padX * 2;
  const block1H = n1.info.height + padY * 2;
  const nameBottom = Math.round(H * 0.685);
  let n2 = null;
  let block2H = 0;
  if (line2) {
    n2 = await textImg(line2, { family: 'Inter Black', size: 104, color: '#ffffff', maxWidth: W - MARGIN * 2 });
    block2H = n2.info.height + 14;
  }
  const block1Y = nameBottom - block2H - block1H;
  layers.push({ input: solidRect(block1W, block1H, PINK), top: block1Y, left: MARGIN });
  layers.push({ input: n1.data, top: block1Y + padY, left: MARGIN + padX });
  if (n2) {
    layers.push({ input: n2.data, top: block1Y + block1H + 14, left: MARGIN });
  }

  // Jobtitel-Pill rechtsbündig darunter
  const role = shortRole(speaker.jobTitle);
  if (role) {
    const r = await textImg(role, { family: 'Inter ExtraBold', size: 42, color: '#ffffff', maxWidth: W - MARGIN * 2 - padX * 2 });
    const blockW = r.info.width + padX * 2;
    const blockH = r.info.height + 22;
    const y = nameBottom + 44;
    layers.push({ input: solidRect(blockW, blockH, PINK), top: y, left: W - MARGIN - blockW });
    layers.push({ input: r.data, top: y + 11, left: W - MARGIN - blockW + padX });
  }

  // Logo mittig unten (+ Woman-Block bei AI Woman Nights)
  const logoMeta = await sharp(logo.portrait).metadata();
  const logoY = H - 150 - logoMeta.height;
  if (kit.isWoman) {
    const wn = await textImg('AI WOMAN NIGHTS', { family: 'Inter ExtraBold', size: 30, color: '#ffffff', maxWidth: 520, letterSpacing: 2.4 });
    const wnW = wn.info.width + 52;
    const wnH = wn.info.height + 20;
    layers.push({ input: solidRect(wnW, wnH, PINK), top: logoY - wnH - 18, left: Math.round((W - wnW) / 2) });
    layers.push({ input: wn.data, top: logoY - wnH - 18 + 10, left: Math.round((W - wn.info.width) / 2) });
  }
  layers.push({ input: logo.portrait, top: logoY, left: Math.round((W - logoMeta.width) / 2) });

  return sharp(await photoLayer(speaker)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

const slugs = process.argv.slice(2);
if (slugs.length === 0) {
  console.error('Aufruf: node scripts/generate-speaker-intro-cards.mjs <event-slug> [...]');
  process.exit(1);
}

const logo = await loadLogo();
for (const slug of slugs) {
  const kit = await loadEventKit(slug);
  if (kit.speakers.length === 0) {
    console.warn(`⚠️  ${slug}: keine bestätigten Speaker — übersprungen.`);
    continue;
  }
  const outDir = path.join(OUT_BASE, slug);
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });
  for (const s of kit.speakers) {
    await fs.writeFile(path.join(outDir, `${s.slug}.png`), await card(kit, s, logo));
    console.log(`✓ ${slug} / ${s.slug}`);
  }
}
