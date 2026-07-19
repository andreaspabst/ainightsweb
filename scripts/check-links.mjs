#!/usr/bin/env node
/**
 * Interner Link- und Asset-Check für den gebauten dist/-Ordner.
 *
 * Prüft, dass jede gebaute Seite existiert und dass alle internen
 * Verweise (href, src, srcset, poster) auf vorhandene Dateien zeigen —
 * für eine statische Site das Äquivalent zu „jede Seite ist ohne
 * Fehler aufrufbar".
 *
 * Aufruf:  npm run build && node scripts/check-links.mjs
 * Exit-Code 1 bei kaputten Verweisen (CI-tauglich).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const exists = async (p) => fs.access(p).then(() => true, () => false);

// interne URL → Ziel im dist prüfen (trailingSlash: 'always' → Ordner/index.html)
const checked = new Map();
async function targetExists(url) {
  if (checked.has(url)) return checked.get(url);
  const clean = decodeURI(url.split('#')[0].split('?')[0]);
  let ok;
  if (clean === '' || clean === '/') {
    ok = true;
  } else if (clean.endsWith('/')) {
    ok = await exists(path.join(DIST, clean, 'index.html'));
  } else {
    ok = (await exists(path.join(DIST, clean))) || (await exists(path.join(DIST, clean, 'index.html')));
  }
  checked.set(url, ok);
  return ok;
}

const problems = [];
let pages = 0;
let refs = 0;

for await (const file of walk(DIST)) {
  if (!file.endsWith('.html')) continue;
  pages++;
  const html = await fs.readFile(file, 'utf8');
  const page = '/' + path.relative(DIST, file).split(path.sep).join('/');

  const urls = new Set();
  for (const m of html.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)) urls.add(m[1]);
  for (const m of html.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u) urls.add(u);
    }
  }

  for (const u of urls) {
    // extern, Anker, Mail/Tel, data-URIs überspringen
    if (!u.startsWith('/') || u.startsWith('//')) continue;
    refs++;
    if (!(await targetExists(u))) problems.push(`${page}  →  kaputter Verweis: ${u}`);
  }
}

if (problems.length === 0) {
  console.log(`✅ Link-Check: ${pages} Seiten, ${refs} interne Verweise geprüft — alles erreichbar.`);
} else {
  console.log(`❌ Link-Check: ${problems.length} kaputte Verweise:\n`);
  for (const p of [...new Set(problems)]) console.log('  ' + p);
  process.exit(1);
}
