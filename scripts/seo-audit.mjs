#!/usr/bin/env node
/**
 * SEO-Audit für den gebauten dist/-Ordner.
 * Prüft JEDE Seite auf: <title>, Meta-Description, Canonical,
 * OpenGraph (og:title/description/image/url), twitter:card,
 * <img> ohne alt-Attribut und fehlende <h1>.
 *
 * Aufruf:  npm run build && node scripts/seo-audit.mjs
 * Exit-Code 1, wenn Probleme gefunden wurden (CI-tauglich).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name === 'index.html') yield p;
  }
}

// HTML-Entities dekodieren, damit Längen in echten Zeichen gemessen werden
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
const get = (html, re) => {
  const v = html.match(re)?.[1]?.trim();
  return v == null ? null : decode(v);
};

const problems = [];
let pages = 0;

for await (const file of walk(DIST)) {
  const html = await fs.readFile(file, 'utf8');
  const url = '/' + path.relative(DIST, path.dirname(file)).split(path.sep).join('/') + '/';

  // Redirect-Stubs (meta refresh) überspringen
  if (/http-equiv="refresh"/i.test(html)) continue;
  pages++;

  const report = (msg) => problems.push(`${url}  →  ${msg}`);

  const title = get(html, /<title>([^<]*)<\/title>/i);
  if (!title) report('kein <title>');
  else if (title.length > 70) report(`<title> zu lang (${title.length} Zeichen)`);

  const desc = get(html, /<meta name="description" content="([^"]*)"/i);
  if (desc === null) report('keine Meta-Description');
  else if (desc === '') report('Meta-Description LEER');
  else if (desc.length < 50) report(`Meta-Description sehr kurz (${desc.length} Zeichen)`);
  else if (desc.length > 170) report(`Meta-Description zu lang (${desc.length} Zeichen)`);

  if (!/<link rel="canonical"/i.test(html)) report('kein Canonical');
  for (const tag of ['og:title', 'og:description', 'og:image', 'og:url', 'og:site_name']) {
    const v = get(html, new RegExp(`<meta property="${tag}" content="([^"]*)"`, 'i'));
    if (!v) report(`${tag} fehlt oder leer`);
  }
  if (!get(html, /<meta name="twitter:card" content="([^"]*)"/i)) report('twitter:card fehlt');

  // <img> ohne alt-Attribut (alt="" ist ok für dekorative Bilder)
  const imgsOhneAlt = [...html.matchAll(/<img\b[^>]*>/gi)].filter((m) => !/\balt=/.test(m[0]));
  if (imgsOhneAlt.length > 0) report(`${imgsOhneAlt.length} <img> ohne alt-Attribut`);

  if (!/<h1[\s>]/i.test(html)) report('keine <h1>');
}

if (problems.length === 0) {
  console.log(`✅ SEO-Audit: ${pages} Seiten geprüft, keine Probleme.`);
} else {
  console.log(`❌ SEO-Audit: ${problems.length} Problem(e) auf ${pages} geprüften Seiten:\n`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
