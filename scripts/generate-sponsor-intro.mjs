#!/usr/bin/env node
/**
 * Sponsor-Vorstellungs-Grafik für Instagram (1080×1350, Hochformat).
 *
 * Eckige Bracket-Rahmen in Magenta mit Lücke oben (für "SPONSOR") und
 * unten (für das AI_nights-Logo), Sponsor-Logo mittig in einem
 * weiß umrandeten Feld — angelehnt an die bisherige Vorlage (Canva).
 *
 * Aufruf:
 *   node scripts/generate-sponsor-intro.mjs <sponsor-slug>
 * Output: public/media/sponsor-intro/<sponsor-slug>-instagram.png
 *
 * Der Beitragstext (Caption) wird NICHT ins Bild gerendert, sondern separat
 * gepflegt/verschickt — dieses Skript erzeugt nur das Titelbild.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const OUT_DIR = path.join(PUBLIC, 'media/sponsor-intro');
const LOGO = path.join(PUBLIC, 'wp-content/uploads/2026/07/AI-Nights-Logo-wAXDN.svg');
const FONT_DIR = path.join(ROOT, 'scripts/fonts');

const FONT_FILES = {
  'Inter ExtraBold': 'Inter-ExtraBold.ttf',
  'Inter Black': 'Inter-Black.ttf',
};
const fontFile = (family) => path.join(FONT_DIR, FONT_FILES[family]);

const MAGENTA = '#ff2d7a';
const W = 1080;
const H = 1350;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function textImg(text, { family, size, color, maxWidth, letterSpacing = 0 }) {
  const spacing = letterSpacing ? ` letter_spacing="${Math.round(letterSpacing * 1024)}"` : '';
  const markup = `<span foreground="${color}"${spacing}>${esc(text)}</span>`;
  const { data, info } = await sharp({
    text: { text: markup, font: `${family} ${size}`, fontfile: fontFile(family), rgba: true, dpi: 72, width: maxWidth * 4 },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { data, info };
}

function background() {
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="glow" cx="50%" cy="50%">
        <stop offset="0%" stop-color="${MAGENTA}" stop-opacity=".5"/>
        <stop offset="100%" stop-color="${MAGENTA}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="#050505"/>
    <circle cx="${W * 0.85}" cy="${H * 0.94}" r="${H * 0.32}" fill="url(#glow)"/>
  </svg>`);
}

/** Eckige Bracket-Rahmen: lange horizontale Arme (mit Lücke für Text/Logo), kurze vertikale Stubs an den Ecken. */
function brackets({ left, right, top, bottom, topGap, bottomGap, armV = 60, strokeWidth = 5 }) {
  const midX = (left + right) / 2;
  const topLeftArmEnd = midX - topGap / 2;
  const topRightArmStart = midX + topGap / 2;
  const bottomLeftArmEnd = midX - bottomGap / 2;
  const bottomRightArmStart = midX + bottomGap / 2;
  const s = (d) => `<path d="${d}" fill="none" stroke="${MAGENTA}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${s(`M${left},${top + armV} L${left},${top} L${topLeftArmEnd},${top}`)}
    ${s(`M${topRightArmStart},${top} L${right},${top} L${right},${top + armV}`)}
    ${s(`M${left},${bottom - armV} L${left},${bottom} L${bottomLeftArmEnd},${bottom}`)}
    ${s(`M${bottomRightArmStart},${bottom} L${right},${bottom} L${right},${bottom - armV}`)}
  </svg>`);
}

function frameBox(size, strokeWidth = 5) {
  return Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${size - strokeWidth}" height="${size - strokeWidth}" fill="none" stroke="#ffffff" stroke-width="${strokeWidth}"/>
  </svg>`);
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Aufruf: node scripts/generate-sponsor-intro.mjs <sponsor-slug>');
    process.exit(1);
  }
  const sponsor = JSON.parse(await fs.readFile(path.join(ROOT, 'src/content/sponsor', `${slug}.json`), 'utf8'));

  const layers = [];

  // "SPONSOR"-Headline oben
  const heading = await textImg('SPONSOR', { family: 'Inter ExtraBold', size: 46, color: '#ffffff', maxWidth: W, letterSpacing: 4 });
  const headingY = 96;
  layers.push({ input: heading.data, top: headingY, left: Math.round((W - heading.info.width) / 2) });

  // AI_nights-Logo unten
  const logoBuf = await sharp(await fs.readFile(LOGO)).resize({ width: 260 }).png().toBuffer();
  const logoMeta = await sharp(logoBuf).metadata();
  const logoY = H - 130 - logoMeta.height;
  layers.push({ input: logoBuf, top: logoY, left: Math.round((W - logoMeta.width) / 2) });

  // Rahmen: Lücke oben = Headline-Breite + Puffer, Lücke unten = Logo-Breite + Puffer
  const frameLeft = 90;
  const frameRight = W - 90;
  const frameTop = headingY - 34;
  const frameBottom = logoY + logoMeta.height + 34;
  layers.push({
    input: brackets({
      left: frameLeft,
      right: frameRight,
      top: frameTop,
      bottom: frameBottom,
      topGap: heading.info.width + 60,
      bottomGap: logoMeta.width + 60,
    }),
    top: 0,
    left: 0,
  });

  // Sponsor-Logo mittig in weiß umrandetem Feld
  const boxSize = 620;
  const boxY = Math.round((frameTop + frameBottom - boxSize) / 2);
  const boxX = Math.round((W - boxSize) / 2);
  layers.push({ input: frameBox(boxSize), top: boxY, left: boxX });

  const sponsorLogoPath = path.join(PUBLIC, sponsor.logo.src);
  const maxLogoW = boxSize - 160;
  const maxLogoH = boxSize - 160;
  let sponsorLogoBuf = await sharp(sponsorLogoPath).resize({ width: maxLogoW, height: maxLogoH, fit: 'inside' }).png().toBuffer();
  const sMeta = await sharp(sponsorLogoBuf).metadata();
  layers.push({
    input: sponsorLogoBuf,
    top: boxY + Math.round((boxSize - sMeta.height) / 2),
    left: boxX + Math.round((boxSize - sMeta.width) / 2),
  });

  const out = await sharp(background()).composite(layers).png({ compressionLevel: 9 }).toBuffer();
  await fs.mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${slug}-instagram.png`);
  await fs.writeFile(outPath, out);
  console.log('Fertig:', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
