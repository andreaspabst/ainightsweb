#!/usr/bin/env node
/**
 * Rechtstexte von der eRecht24 Projekt-API holen (Impressum + Datenschutz)
 * und in die Seiten-JSONs schreiben. Läuft vor jedem Build.
 *
 * - API-Key aus ERECHT24_API_KEY (Env) oder .env im Projekt-Root
 *   (Forge legt die Environment-Variablen als .env im Site-Root ab).
 * - Fail-safe: Ohne Key oder bei API-Fehlern bleibt der zuletzt
 *   committete Stand (Cache im Repo) unverändert — der Build bricht NICHT.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

async function apiKey() {
  if (process.env.ERECHT24_API_KEY) return process.env.ERECHT24_API_KEY.trim();
  try {
    const env = await fs.readFile(path.join(ROOT, '.env'), 'utf8');
    const m = env.match(/^ERECHT24_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  } catch {}
  return null;
}

const TARGETS = [
  { endpoint: 'imprint', file: 'src/data/pages/de__legal-notice.json' },
  { endpoint: 'privacyPolicy', file: 'src/data/pages/de__data-protection.json' },
];

const key = await apiKey();
if (!key) {
  console.warn('⚠️  eRecht24: kein API-Key (ERECHT24_API_KEY) — verwende gecachte Rechtstexte.');
  process.exit(0);
}

for (const t of TARGETS) {
  try {
    const res = await fetch(`https://api.e-recht24.de/v1/${t.endpoint}`, {
      headers: { eRecht24: key },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let html = (data.html_de ?? '').trim();
    if (!html) throw new Error('leere html_de-Antwort');
    // Führende <h1> entfernen — die Seite rendert ihren eigenen Titel
    html = html.replace(/^\s*<h1>[^<]*<\/h1>\s*/i, '');

    const file = path.join(ROOT, t.file);
    const page = JSON.parse(await fs.readFile(file, 'utf8'));
    if (page.contentHtml === html) {
      console.log(`✓ eRecht24 ${t.endpoint}: unverändert`);
      continue;
    }
    page.contentHtml = html;
    await fs.writeFile(file, JSON.stringify(page, null, 2) + '\n');
    console.log(`✓ eRecht24 ${t.endpoint}: aktualisiert (${html.length} Zeichen, Stand ${data.modified ?? 'unbekannt'})`);
  } catch (err) {
    console.warn(`⚠️  eRecht24 ${t.endpoint}: ${err.message} — verwende gecachten Stand.`);
  }
}
