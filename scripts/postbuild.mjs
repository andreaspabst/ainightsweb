#!/usr/bin/env node
/**
 * Post-Build-Schritt: Sitemap unter den gängigen Pfaden bereitstellen.
 *
 * @astrojs/sitemap erzeugt nur dist/sitemap-index.xml. Crawler und Tools
 * erwarten aber standardmäßig /sitemap.xml, und die alte WordPress-Site
 * (Yoast) war unter /sitemap_index.xml bekannt (Google Search Console).
 * Beide bekommen eine identische Kopie des Index.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');

const src = path.join(DIST, 'sitemap-index.xml');
for (const name of ['sitemap.xml', 'sitemap_index.xml']) {
  await fs.copyFile(src, path.join(DIST, name));
  console.log(`✓ dist/${name}`);
}

/**
 * Medien-Auslagerung: Bild-/Video-Pfade in HTML, CSS und JS zeigen im
 * Produktions-Build direkt auf den R2-Bucket (https://media.ainights.ai), statt
 * vom Forge-Server zu kommen. Ordner-Struktur ist 1:1 gleich (siehe
 * scripts/r2-sync.mjs), nur der Host ändert sich.
 *
 * Ausgenommen: /media/namenskarten/ (Gästenamen, bleibt auf ainights.ai).
 * Für lokale Builds ohne Bucket-Zugriff: MEDIA_LOCAL=1 npm run build.
 */
if (process.env.MEDIA_LOCAL !== '1') {
  const MEDIA = 'https://media.ainights.ai';
  const DIRS = '(?:wp-content\\/uploads|img|media)';
  // absolute URLs auf die eigene Domain und absolute Pfade in Attributen/url()/srcset/JSON
  const absolute = new RegExp(`https:\\/\\/ainights\\.ai(\\/${DIRS}\\/)(?!namenskarten\\/)`, 'g');
  const rooted = new RegExp(`(["'(=\\s,])(\\/${DIRS}\\/)(?!namenskarten\\/)`, 'g');
  const EXT = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt']);

  let files = 0;
  let hits = 0;
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Die Medienordner selbst enthalten nur Binärdaten — nicht durchsuchen.
        if (['wp-content', 'img', 'media'].includes(entry.name) && path.dirname(full) === DIST) continue;
        await walk(full);
      } else if (EXT.has(path.extname(entry.name))) {
        const before = await fs.readFile(full, 'utf8');
        let n = 0;
        const after = before
          .replace(absolute, (_, p) => { n++; return `${MEDIA}${p}`; })
          .replace(rooted, (_, pre, p) => { n++; return `${pre}${MEDIA}${p}`; });
        if (n) { await fs.writeFile(full, after); files++; hits += n; }
      }
    }
  }
  await walk(DIST);
  console.log(`✓ Medien-URLs auf ${MEDIA} umgeschrieben: ${hits} Stellen in ${files} Dateien`);
}
