#!/usr/bin/env node
/**
 * Lädt Medien aus public/ 1:1 (gleicher Pfad) in den R2-Bucket `ainights-media`
 * hoch — erreichbar unter https://media.ainights.ai/<pfad>. Bereits vorhandene
 * Objekte mit gleicher Größe werden übersprungen.
 *
 * Aufruf:
 *   node scripts/r2-sync.mjs [--dry-run] [--only <prefix>] [--concurrency 16]
 * Standard: wp-content/uploads, img und media (ohne media/namenskarten/ — die
 * Namenskarten-PDFs enthalten Gästenamen und bleiben aus Datenschutzgründen draußen).
 *
 * Läuft über die Cloudflare-REST-API (kein S3-Client nötig).
 * Voraussetzung: .env mit CLOUDFLARE_API_TOKEN (R2 Edit) und CLOUDFLARE_ACCOUNT_ID.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ROOT, PUBLIC } from './lib/social-kit.mjs';

process.loadEnvFile(path.join(ROOT, '.env'));

const BUCKET = 'ainights-media';
const ROOTS = ['wp-content/uploads', 'img', 'media'];
const EXCLUDE = ['media/namenskarten/'];
const TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.pdf': 'application/pdf', '.json': 'application/json',
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const concurrency = args.includes('--concurrency') ? Number(args[args.indexOf('--concurrency') + 1]) : 16;

const API = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${BUCKET}/objects`;
const PUBLIC_BASE = 'https://media.ainights.ai';

// WordPress-Bestand und Galerien ändern sich nie unter gleichem Namen → ein Jahr,
// immutable. Erzeugte Karten unter media/ werden gelegentlich neu gerendert
// (gleicher Dateiname) → nur kurz cachen.
const cacheControl = (key) =>
  key.startsWith('media/') ? 'public, max-age=3600' : 'public, max-age=31536000, immutable';

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (!entry.name.startsWith('.')) yield full;
  }
}

async function exists(key, size) {
  // Größenvergleich über die öffentliche Domain; Query-Bust umgeht den Edge-Cache
  // (R2 ignoriert die Query).
  try {
    const res = await fetch(`${PUBLIC_BASE}/${encodeURI(key)}?chk=${Date.now()}`, { method: 'HEAD' });
    return res.ok && Number(res.headers.get('content-length')) === size;
  } catch {
    return false;
  }
}

// Cloudflares API erlaubt ~1.200 Anfragen / 5 Min — daher höchstens ~3,5 PUTs pro Sekunde.
const PUT_INTERVAL_MS = 285;
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  nextSlot = Math.max(nextSlot, now) + PUT_INTERVAL_MS;
  const wait = nextSlot - PUT_INTERVAL_MS - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

async function put(key, file) {
  const body = await fs.readFile(file);
  for (let attempt = 1; attempt <= 4; attempt++) {
    await throttle();
    const res = await fetch(`${API}/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': TYPES[path.extname(key).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': cacheControl(key),
      },
      body,
    });
    if (res.ok) return;
    if (res.status < 500 && res.status !== 429) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
    await new Promise((r) => setTimeout(r, (res.status === 429 ? 30000 : 1000) * attempt));
  }
  throw new Error('nach 4 Versuchen aufgegeben');
}

async function main() {
  const files = [];
  for (const root of ROOTS) {
    const abs = path.join(PUBLIC, root);
    try { await fs.access(abs); } catch { continue; }
    for await (const file of walk(abs)) {
      const key = path.relative(PUBLIC, file).split(path.sep).join('/');
      if (EXCLUDE.some((p) => key.startsWith(p))) continue;
      if (only && !key.startsWith(only)) continue;
      files.push({ file, key });
    }
  }
  console.log(`${files.length} Dateien${dryRun ? ' (Dry-Run)' : ''} …`);

  let uploaded = 0, skipped = 0, bytes = 0, failed = 0, next = 0;
  async function worker() {
    while (next < files.length) {
      const { file, key } = files[next++];
      const { size } = await fs.stat(file);
      if (await exists(key, size)) { skipped++; continue; }
      if (dryRun) { uploaded++; bytes += size; continue; }
      try {
        await put(key, file);
        uploaded++; bytes += size;
      } catch (err) {
        failed++;
        console.error(`✗ ${key}: ${err.message}`);
      }
      if ((uploaded + skipped) % 200 === 0) console.log(`  … ${uploaded} hochgeladen, ${skipped} übersprungen`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(`Fertig: ${uploaded} ${dryRun ? 'würden hochgeladen' : 'hochgeladen'} (${(bytes / 1e6).toFixed(0)} MB), ${skipped} übersprungen, ${failed} Fehler.`);
  if (failed) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
