#!/usr/bin/env node
/**
 * Holt fehlende Medien aus dem R2-Bucket (https://media.ainights.ai) nach public/
 * — nötig auf einer frischen Maschine, bevor Skripte (generate-*, optimize-images,
 * render-speaker-intro …) Bilder lesen oder `npm run dev` Bilder lokal zeigen soll.
 * Die Liste kommt aus src/data/media-manifest.json; vorhandene Dateien werden
 * übersprungen. Es braucht keine Zugangsdaten — der Bucket ist öffentlich lesbar.
 *
 * Aufruf: node scripts/r2-pull.mjs [--only <prefix>] [--concurrency 16]
 *   z. B.  node scripts/r2-pull.mjs --only wp-content/uploads/2026/09
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PUBLIC = path.join(ROOT, 'public');

const BASE = 'https://media.ainights.ai';
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const concurrency = args.includes('--concurrency') ? Number(args[args.indexOf('--concurrency') + 1]) : 16;

const manifest = JSON.parse(await fs.readFile(path.join(ROOT, 'src/data/media-manifest.json'), 'utf8'));
const keys = manifest.filter((k) => !only || k.startsWith(only));
console.log(`${keys.length} Dateien im Manifest${only ? ` (Filter: ${only})` : ''} …`);

let fetched = 0, skipped = 0, failed = 0, bytes = 0, next = 0;
async function worker() {
  while (next < keys.length) {
    const key = keys[next++];
    const dest = path.join(PUBLIC, key);
    try { await fs.access(dest); skipped++; continue; } catch { /* fehlt → laden */ }
    try {
      const res = await fetch(`${BASE}/${encodeURI(key)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, buf);
      fetched++; bytes += buf.length;
    } catch (err) {
      failed++;
      console.error(`✗ ${key}: ${err.message}`);
    }
    if ((fetched + skipped) % 300 === 0) console.log(`  … ${fetched} geladen, ${skipped} vorhanden`);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
console.log(`Fertig: ${fetched} geladen (${(bytes / 1e6).toFixed(0)} MB), ${skipped} schon vorhanden, ${failed} Fehler.`);
if (failed) process.exit(1);
