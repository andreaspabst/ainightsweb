#!/usr/bin/env node
/**
 * Bild-Optimierung für ainightsweb.
 *
 * Erzeugt für große Content-Bilder (Breite > 1024px) mehrere WebP-Varianten
 * plus Thumbnail, direkt neben dem Original:
 *
 *   foo.jpg → foo-1600w.webp   (nur wenn Original breiter als 1600px)
 *             foo-1024w.webp
 *             foo-640w.webp
 *             foo-320w.webp    (Thumbnail)
 *
 * WordPress-Subsizes (foo-300x240.jpg u. ä.) und bereits erzeugte Varianten
 * werden übersprungen. Bestehende Varianten werden nicht neu gerechnet.
 *
 * Aufruf:
 *   node scripts/optimize-images.mjs                     # ganzer Uploads-Ordner
 *   node scripts/optimize-images.mjs pfad/zu/bild.jpg …  # einzelne Dateien
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DEFAULT_DIR = path.join(ROOT, 'public', 'wp-content', 'uploads');
const WIDTHS = [1600, 1024, 640, 320];
const MIN_SOURCE_WIDTH = 1024;
const QUALITY = 78;

const isSubsize = (name) => /-\d+x\d+\.(jpe?g|png)$/i.test(name);
const isVariant = (name) => /-\d+w\.webp$/i.test(name);
const isSource = (name) => /\.(jpe?g|png)$/i.test(name) && !isSubsize(name);

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

async function optimize(file) {
  const base = file.replace(/\.(jpe?g|png)$/i, '');
  let meta;
  try {
    meta = await sharp(file).metadata();
  } catch {
    console.warn(`⚠️  Überspringe (nicht lesbar): ${file}`);
    return 0;
  }
  const width = meta.width ?? 0;
  if (width <= MIN_SOURCE_WIDTH) return 0;

  let created = 0;
  for (const w of WIDTHS) {
    if (w >= width && w !== WIDTHS[WIDTHS.length - 1] && w > 1024) continue; // keine Hochskalierung
    const out = `${base}-${w}w.webp`;
    try {
      await fs.access(out);
      continue; // existiert schon
    } catch {}
    await sharp(file).resize({ width: w, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(out);
    created++;
  }
  return created;
}

const args = process.argv.slice(2);
let files = [];
if (args.length > 0) {
  files = args.map((a) => path.resolve(a));
} else {
  for await (const f of walk(DEFAULT_DIR)) {
    if (isSource(f) && !isVariant(f)) files.push(f);
  }
}

let total = 0;
let touched = 0;
for (const f of files) {
  const n = await optimize(f);
  if (n > 0) touched++;
  total += n;
}
console.log(`Fertig: ${total} Varianten für ${touched} Bilder erzeugt (${files.length} Quellen geprüft).`);

// Manifest schreiben: URL-Pfad → vorhandene Varianten-Breiten.
// Wird von src/lib/images.ts gelesen (Fallback aufs Original bei fehlender Variante).
const PUBLIC = path.join(ROOT, 'public');
const manifest = {};
for await (const f of walk(DEFAULT_DIR)) {
  const m = f.match(/^(.*)-(\d+)w\.webp$/);
  if (!m) continue;
  for (const ext of ['.jpg', '.jpeg', '.png', '.JPG', '.PNG']) {
    const orig = `${m[1]}${ext}`;
    try {
      await fs.access(orig);
      const url = orig.slice(PUBLIC.length).split(path.sep).join('/');
      (manifest[url] ??= []).push(Number(m[2]));
      break;
    } catch {}
  }
}
for (const k of Object.keys(manifest)) manifest[k].sort((a, b) => a - b);
const manifestPath = path.join(ROOT, 'src', 'data', 'image-variants.json');
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
console.log(`Manifest: ${Object.keys(manifest).length} Bilder → ${path.relative(ROOT, manifestPath)}`);
