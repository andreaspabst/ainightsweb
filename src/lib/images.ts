// Zugriff auf die von scripts/optimize-images.mjs erzeugten WebP-Varianten.
// Für JPG/PNG-Originale > 320px liegen neben dem Original Varianten wie
//   foo-1600w.webp, foo-1024w.webp, foo-640w.webp, foo-320w.webp
// (nur Breiten unterhalb der Originalbreite). Das Manifest listet, welche
// Varianten existieren — bei fehlender Variante fällt alles aufs Original zurück.
import manifest from '../data/image-variants.json';

export type VariantWidth = 320 | 640 | 1024 | 1600;

const variants = manifest as Record<string, number[]>;
const OPTIMIZABLE = /\.(jpe?g|png)$/i;

/** Pfad der WebP-Variante in gewünschter Breite (oder nächstgrößere vorhandene); Fallback: Original. */
export function imgVariant(src: string, width: VariantWidth): string {
  const widths = variants[src];
  if (!widths || widths.length === 0) return src;
  // kleinste vorhandene Breite >= gewünschter Breite, sonst die größte vorhandene
  const sorted = [...widths].sort((a, b) => a - b);
  const pick = sorted.find((w) => w >= width) ?? sorted[sorted.length - 1];
  return src.replace(OPTIMIZABLE, `-${pick}w.webp`);
}
