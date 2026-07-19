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
