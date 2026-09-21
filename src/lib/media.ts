// Medien liegen im R2-Bucket (https://media.ainights.ai), nicht mehr im Repo.
// Für Build-Entscheidungen „gibt es diese Datei?" dient das Manifest
// src/data/media-manifest.json (wird von scripts/r2-sync.mjs gepflegt) —
// so braucht der Build keine Bilddateien auf der Platte.
import manifest from '../data/media-manifest.json';

const keys = new Set(manifest as string[]);
const strip = (p: string) => p.replace(/^\/+/, '');

/** Existiert die Datei im Bucket? Pfad wie in der Site, z. B. `/media/recap/foo.png`. */
export const mediaExists = (p: string): boolean => keys.has(strip(p));

/** Dateinamen direkt unter einem Ordner (z. B. `/media/countdown`), optional nach Endung gefiltert. */
export function mediaList(dir: string, ext = ''): string[] {
  const prefix = strip(dir).replace(/\/?$/, '/');
  return [...keys]
    .filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/') && k.endsWith(ext))
    .map((k) => k.slice(prefix.length));
}
