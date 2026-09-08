#!/usr/bin/env node
/**
 * #speakerintro-Karten in zwei Zuschnitten — Nachbau der Vorlage:
 * Speaker-Foto, „#speakerintro“, der Name (erste Zeile weiß auf Magenta-Block,
 * zweite Zeile weiß), der Jobtitel auf einem Magenta-Block und das
 * AI-Nights-Logo (bei AI-Woman-Nights-Events das Woman-Lockup).
 *
 *   instagram → Portrait 1080×1350: Foto vollflächig, Text unten links,
 *               Logo mittig unten.
 *   linkedin  → Landscape 1200×627: Text links auf Marken-Hintergrund,
 *               Foto rechts als Panel, das nach links ausblendet.
 *
 * Der Landscape-Zuschnitt ist Pflicht für LinkedIn: LinkedIn beschneidet
 * Portrait-Bilder im Feed auf ~1.91:1 und schneidet dabei die Headline weg.
 *
 * Ausgabe:
 *   public/media/speaker-intro-cards/<event-slug>/<speaker-slug>-instagram.png
 *   public/media/speaker-intro-cards/<event-slug>/<speaker-slug>-linkedin.png
 * Die Dateien tauchen automatisch pro Event auf /tools/ auf.
 *
 * Aufruf:
 *   node scripts/generate-speaker-intro-cards.mjs ai-nights-nuernberg-05 [weitere-slugs]
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { C, FORMATS, PUBLIC, textImg, solidRect, background, loadEventKit, loadLogo, logoFor } from './lib/social-kit.mjs';

const OUT_BASE = path.join(PUBLIC, 'media/speaker-intro-cards');
/**
 * Instagram bekommt den Portrait-Zuschnitt (nicht das quadratische
 * FORMATS.instagram), LinkedIn den Landscape-Zuschnitt aus FORMATS.
 */
const SIZE = { instagram: FORMATS.portrait, linkedin: FORMATS.linkedin };
const PINK = C.magentaDeep;

/**
 * Foto auf w×h „cover“-skalieren. Standard: sharps automatischer
 * Bildausschnitt ('attention'). Passt der nicht (Person zu weit am Rand),
 * kann pro Speaker in der JSON `image.cropX` (0 = linker Rand … 1 = rechter
 * Rand, 0.5 = mittig) und optional `image.cropY` gesetzt werden – dann wird
 * der Ausschnitt genau dort gewählt.
 */
async function coverPhoto(src, image = {}, w, h) {
  const hasManual = typeof image.cropX === 'number' || typeof image.cropY === 'number';
  if (!hasManual) {
    return sharp(src).resize(w, h, { fit: 'cover', position: 'attention' }).png().toBuffer();
  }
  const clamp = (v, d) => (typeof v === 'number' ? Math.min(1, Math.max(0, v)) : d);
  const meta = await sharp(src).metadata();
  const scale = Math.max(w / meta.width, h / meta.height);
  const sw = Math.max(w, Math.round(meta.width * scale));
  const sh = Math.max(h, Math.round(meta.height * scale));
  const left = Math.round(clamp(image.cropX, 0.5) * (sw - w));
  const top = Math.round(clamp(image.cropY, 0.5) * (sh - h));
  return sharp(src).resize(sw, sh).extract({ left, top, width: w, height: h }).png().toBuffer();
}

/** Marken-Verlauf als Foto-Ersatz, damit die Karte auch ohne Bild funktioniert. */
const photoFallback = (w, h) =>
  Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.blue}"/><stop offset="100%" stop-color="${C.magenta}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/></svg>`);

/** Portrait: Foto vollflächig, oben leicht abgedunkelt für den Hashtag, unten fürs Logo. */
async function portraitPhoto(speaker, W, H) {
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
  const base = src ? await coverPhoto(src, speaker.image, W, H) : photoFallback(W, H);
  return sharp(base).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
}

/**
 * Landscape: Marken-Hintergrund, rechts ein hochformatiges Foto-Panel, das
 * nach links in den Hintergrund ausblendet — so bleibt links Platz für den
 * Text und das Motiv wird nicht zum Querband gestaucht.
 */
async function landscapeBase(speaker, W, H, panelW) {
  const src = speaker.image?.src ? path.join(PUBLIC, speaker.image.src) : null;
  const photo = src ? await coverPhoto(src, speaker.image, panelW, H) : photoFallback(panelW, H);
  const fade = Buffer.from(`<svg width="${panelW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0f0122" stop-opacity="1"/>
        <stop offset="8%" stop-color="#0f0122" stop-opacity=".92"/>
        <stop offset="30%" stop-color="#0f0122" stop-opacity=".38"/>
        <stop offset="58%" stop-color="#0f0122" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="foot" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="#0f0122" stop-opacity=".35"/><stop offset="100%" stop-color="#0f0122" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="${panelW}" height="${H}" fill="url(#fade)"/>
    <rect y="${Math.round(H * 0.7)}" width="${panelW}" height="${Math.round(H * 0.3)}" fill="url(#foot)"/>
  </svg>`);
  const panel = await sharp(photo).composite([{ input: fade, top: 0, left: 0 }]).png().toBuffer();
  // Akzentkante oben wieder über das Panel legen, damit sie durchläuft.
  const accent = Buffer.from(`<svg width="${W}" height="8" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.blue}"/><stop offset="55%" stop-color="${C.violet}"/><stop offset="100%" stop-color="${C.magenta}"/>
    </linearGradient></defs><rect width="${W}" height="8" fill="url(#a)"/></svg>`);
  return sharp(background(W, H))
    .composite([
      { input: panel, top: 0, left: W - panelW },
      { input: accent, top: 0, left: 0 },
    ])
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

/** Portrait 1080×1350 (Instagram). */
async function portraitCard(kit, speaker, logo) {
  const { w: W, h: H } = SIZE.instagram;
  const MARGIN = 84;
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

  // Logo mittig unten (bei AI Woman Nights das Woman-Lockup)
  const lg = logoFor(kit, logo).portrait;
  const logoMeta = await sharp(lg).metadata();
  const logoY = H - 150 - logoMeta.height;
  layers.push({ input: lg, top: logoY, left: Math.round((W - logoMeta.width) / 2) });

  return sharp(await portraitPhoto(speaker, W, H)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

/** Landscape 1200×627 (LinkedIn): Text links, Foto rechts. */
async function landscapeCard(kit, speaker, logo) {
  const { w: W, h: H } = SIZE.linkedin;
  const MARGIN = 64;
  const PANEL_W = 520;
  const colW = W - PANEL_W - MARGIN - 44;
  const layers = [];

  // Logo oben links (bei AI Woman Nights das Woman-Lockup)
  const lg = logoFor(kit, logo).landscape;
  const logoMeta = await sharp(lg).metadata();
  const logoY = 46;
  layers.push({ input: lg, top: logoY, left: MARGIN });

  // #speakerintro darunter
  const tag = await textImg('#speakerintro', { family: 'Inter Black', size: 44, color: '#ffffff', maxWidth: colW });
  const tagY = logoY + logoMeta.height + 34;
  layers.push({ input: tag.data, top: tagY, left: MARGIN });

  // Name: Zeile 1 auf Pink-Block, Zeile 2 weiß
  const [line1, line2] = nameLines(speaker.title);
  const padX = 26;
  const padY = 14;
  const n1 = await textImg(line1, { family: 'Inter Black', size: 58, color: '#ffffff', maxWidth: colW - padX * 2 });
  const block1W = n1.info.width + padX * 2;
  const block1H = n1.info.height + padY * 2;
  const nameBottom = Math.round(H * 0.72);
  let n2 = null;
  let block2H = 0;
  if (line2) {
    n2 = await textImg(line2, { family: 'Inter Black', size: 58, color: '#ffffff', maxWidth: colW });
    block2H = n2.info.height + 10;
  }
  const block1Y = Math.max(tagY + tag.info.height + 26, nameBottom - block2H - block1H);
  layers.push({ input: solidRect(block1W, block1H, PINK), top: block1Y, left: MARGIN });
  layers.push({ input: n1.data, top: block1Y + padY, left: MARGIN + padX });
  if (n2) {
    layers.push({ input: n2.data, top: block1Y + block1H + 10, left: MARGIN });
  }

  // Jobtitel-Pill linksbündig darunter (rechts steht das Foto)
  const role = shortRole(speaker.jobTitle);
  if (role) {
    const r = await textImg(role, { family: 'Inter ExtraBold', size: 26, color: '#ffffff', maxWidth: colW - padX * 2 });
    const blockW = r.info.width + padX * 2;
    const blockH = r.info.height + 16;
    const y = Math.max(block1Y + block1H + block2H, nameBottom) + 26;
    layers.push({ input: solidRect(blockW, blockH, PINK), top: y, left: MARGIN });
    layers.push({ input: r.data, top: y + 8, left: MARGIN + padX });
  }

  return sharp(await landscapeBase(speaker, W, H, PANEL_W)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

const card = (fmt, kit, speaker, logo) =>
  (fmt === 'instagram' ? portraitCard : landscapeCard)(kit, speaker, logo);

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
    for (const fmt of ['instagram', 'linkedin']) {
      await fs.writeFile(path.join(outDir, `${s.slug}-${fmt}.png`), await card(fmt, kit, s, logo));
    }
    console.log(`✓ ${slug} / ${s.slug}: 2 Formate`);
  }
}
