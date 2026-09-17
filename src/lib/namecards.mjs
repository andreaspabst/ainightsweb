import fs from 'node:fs';
import path from 'node:path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const NAMENSKARTEN_DIR = path.join(PUBLIC_DIR, 'media/namenskarten');

// Findet die aktuellste PDF für ein Event: `<slug>.pdf` oder, falls per
// Skript versioniert nachgedruckt (z. B. nur neue Gästekarten), die höchste
// `<slug>-vN.pdf` — damit der Kurzlink nach einem Nachdruck automatisch auf
// die neueste Version zeigt, ohne die Datei wieder umbenennen zu müssen.
export function latestNamecardsFile(slug) {
  const plain = `${slug}.pdf`;
  if (fs.existsSync(path.join(NAMENSKARTEN_DIR, plain))) return plain;
  const versioned = fs.existsSync(NAMENSKARTEN_DIR)
    ? fs.readdirSync(NAMENSKARTEN_DIR)
        .filter((f) => new RegExp(`^${slug}-v(\\d+)\\.pdf$`).test(f))
        .sort((a, b) => Number(a.match(/-v(\d+)\.pdf$/)[1]) - Number(b.match(/-v(\d+)\.pdf$/)[1]))
    : [];
  return versioned.at(-1);
}
