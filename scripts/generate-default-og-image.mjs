#!/usr/bin/env node
/**
 * Generisches Default-OG-Share-Bild (1200×630) für Seiten ohne eigenes
 * `image`-Prop in Layout.astro (z. B. /de/speaker-application/, /de/sponsors/,
 * Blog-Index, Tickets-Übersicht …).
 *
 * Hintergrund: Der bisherige Default war das Event-Promo-Bild von AI Nights
 * Nürnberg #01 ("INSPIRE #01 - Premiere!", 2025) — mit Event-Titel im Bild
 * eingebrannt und damit für jede andere Seite irreführend veraltet. Dieses
 * Bild ist bewusst zeitlos (kein Event-Name, kein Datum), damit es nicht
 * wieder veraltet.
 *
 * Aufruf: node scripts/generate-default-og-image.mjs
 * Ausgabe: public/media/og-default.png
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(PUBLIC, 'media/og-default.png');
const LOGO = path.join(PUBLIC, 'wp-content/uploads/2026/07/AI-Nights-Logo-wAXDN.svg');

const W = 1200;
const H = 630;
const C = { bg0: '#0f0122', bg1: '#1b0838', magenta: '#ff2d7a', blue: '#326bff', text: '#f7f4fb', muted: '#b7addd' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function textImg(text, { family, size, color, maxWidth, letterSpacing = 0, minSize = 13 }) {
  let px = size;
  for (;;) {
    const spacing = letterSpacing ? ` letter_spacing="${Math.round(letterSpacing * 1024)}"` : '';
    const markup = `<span foreground="${color}"${spacing}>${esc(text)}</span>`;
    const { data, info } = await sharp({
      text: { text: markup, font: `${family} ${px}`, rgba: true, dpi: 72, width: Math.round(maxWidth * 4) },
    }).png().toBuffer({ resolveWithObject: true });
    if (info.width <= maxWidth || px <= minSize) return { data, info };
    px -= 2;
  }
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
      <stop offset="0%" stop-color="${C.magenta}" stop-opacity=".4"/><stop offset="100%" stop-color="${C.magenta}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="50%" cy="50%">
      <stop offset="0%" stop-color="${C.blue}" stop-opacity=".35"/><stop offset="100%" stop-color="${C.blue}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="45" height="45" patternUnits="userSpaceOnUse">
      <path d="M45 0 L0 0 0 45" fill="none" stroke="#ffffff" stroke-opacity=".045" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  <circle cx="${Math.round(w * 0.1)}" cy="${Math.round(h * 0.85)}" r="${Math.round(h * 0.5)}" fill="url(#glowA)"/>
  <circle cx="${Math.round(w * 0.9)}" cy="${Math.round(h * 0.15)}" r="${Math.round(h * 0.48)}" fill="url(#glowB)"/>
  <rect x="0" y="0" width="${w}" height="8" fill="url(#accent)"/>
</svg>`);
}

const logoSvg = await fs.readFile(LOGO);
const logo = await sharp(logoSvg, { density: 600 }).resize({ width: 460 }).png().toBuffer();
const logoMeta = await sharp(logo).metadata();

const tagline = await textImg('Die Event-Reihe rund um Künstliche Intelligenz', {
  family: 'Inter SemiBold', size: 34, color: C.muted, maxWidth: W - 200,
});
const cities = await textImg('NÜRNBERG · MÜNCHEN · ERLANGEN', {
  family: 'Inter ExtraBold', size: 22, color: C.magenta, maxWidth: W - 200, letterSpacing: 2,
});

const logoY = 210;
const taglineY = logoY + (logoMeta.height ?? 90) + 46;
const citiesY = taglineY + tagline.info.height + 26;

const layers = [
  { input: logo, top: logoY, left: Math.round((W - (logoMeta.width ?? 460)) / 2) },
  { input: tagline.data, top: taglineY, left: Math.round((W - tagline.info.width) / 2) },
  { input: cities.data, top: citiesY, left: Math.round((W - cities.info.width) / 2) },
];

await fs.mkdir(path.dirname(OUT), { recursive: true });
await sharp(background(W, H)).composite(layers).png({ compressionLevel: 9 }).toFile(OUT);
console.log(`Fertig: ${path.relative(ROOT, OUT)}`);
