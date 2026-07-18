---
name: optimize-images
description: Optimiert große Bilder (>1024px) automatisch in mehrere WebP-Auflösungen plus Thumbnail, bevor sie ins Repo/auf die Website kommen. Proaktiv nutzen, wenn neue Bilder (JPG/PNG) in public/ abgelegt werden oder eine Seite Bilder in Originalgröße einbindet.
---

# Bilder optimieren (WebP-Varianten)

Gilt für dieses Repository (`ainightsweb`). Content-Bilder werden nie in
Web-Originalgröße eingebunden, sondern als passende WebP-Variante.

## Wann anwenden

- **Proaktiv**, sobald neue JPG/PNG-Dateien nach `public/` (v. a.
  `public/wp-content/uploads/`) gelegt werden — z. B. per Drag & Drop vom Nutzer.
- Wenn eine Seite/Komponente ein Bild in Originalgröße (`.jpg`/`.png` direkt)
  einbindet, statt eine Variante zu nutzen.

## Ablauf

1. **Varianten erzeugen** (Breiten 1600/1024/640/320, nur unterhalb der
   Originalbreite; Originale ≤1024px bleiben unangetastet):

   ```bash
   node scripts/optimize-images.mjs                      # kompletter Uploads-Ordner
   node scripts/optimize-images.mjs public/pfad/bild.jpg # einzelne Dateien
   ```

   Das Skript legt `bild-1600w.webp`, `bild-1024w.webp`, `bild-640w.webp`,
   `bild-320w.webp` neben das Original, überspringt Vorhandenes sowie
   WordPress-Subsizes (`-300x240.jpg` u. ä.) und aktualisiert das Manifest
   `src/data/image-variants.json`.

2. **Im Code die Variante verwenden** — nie den Varianten-Pfad hart codieren,
   sondern den Helper nutzen (fällt bei fehlender Variante aufs Original zurück):

   ```astro
   import { imgVariant } from '../lib/images';
   <img src={imgVariant(src, 640)} … />
   ```

   Richtwerte: Hero/Vollbreite → `1600` oder `1024`, Karten/Grids → `640`,
   kleine Thumbnails → `320`.

3. **Varianten + Manifest mit committen.** Die erzeugten `.webp`-Dateien und
   `src/data/image-variants.json` gehören ins Repo (statischer Build, kein
   Build-Step auf dem Server).

## Nicht anfassen

- SVGs und bereits kleine Bilder (≤1024px Breite) — die bleiben Original.
- Die MP4-Videos in `uploads/2026/02/` — Videos sind kein Fall für dieses Skript.
