#!/usr/bin/env node
/**
 * Namenskarten (Namensschilder) für ein AI-Nights-Event: bearbeitet die
 * Canva-Vorlage direkt (weißt die Platzhalterfelder aus, schreibt Name +
 * Firma/Rolle neu rein) statt das Design nachzubauen — Logo, Farbverlauf,
 * Deko-Icons und die generische Rückseite bleiben dadurch 1:1 wie im
 * Original. Immer Vorderseite→Rückseite→Vorderseite→Rückseite fürs
 * Duplex-Drucken.
 *
 * Vorlage (nicht anfassen — Canva-Export, 8 Karten/Seite):
 *   scripts/assets/namenskarten/template.pdf
 * Gästeliste pro Event (Crew zuerst, dann echte Käufer):
 *   scripts/data/namenskarten/<event-slug>.json  { staff: [...], attendees: [...] }
 *   Eintrag: { firstName, lastName, company }  — company darf leer sein.
 *
 * Aufruf: node scripts/generate-namenskarten.mjs <event-slug>
 * Output: public/media/namenskarten/<event-slug>.pdf
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { ROOT, PUBLIC, loadEventKit } from './lib/social-kit.mjs';

const run = promisify(execFile);

const ASSETS = path.join(ROOT, 'scripts/assets/namenskarten');
const DATA_DIR = path.join(ROOT, 'scripts/data/namenskarten');
const OUT_DIR = path.join(PUBLIC, 'media/namenskarten');

const WHITE = rgb(1, 1, 1);

// Zeilen-/Feld-Boxen einer einzelnen Karte (Slot oben links), aus
// `pdftotext -bbox-layout` der Vorlage entnommen — Koordinaten von oben
// links (y wächst nach unten), wie pdftotext sie ausgibt. Slot 2 (rechts)
// und die Zeilen darunter sind reine x/y-Verschiebungen davon.
const COL_DX = 278.08; // Abstand Spalte 1 → Spalte 2
const ROW_DY = 183.72; // Abstand Zeile n → Zeile n+1
const SLOT = {
  firstName: { x: 68.23, w: 197.44, yTop: 77.77, yBottom: 102.28 },
  lastName: { x: 68.23, w: 197.44, yTop: 103.98, yBottom: 128.49 },
  company: { x: 68.23, w: 197.44, yTop: 133.14, yBottom: 165.98 },
  date: { x: 225.63, w: 67.66, yTop: 48.26, yBottom: 61.87 },
};
const PAGE_W = 612;
const PAGE_H = 792; // = CropBox-Höhe, worauf sich pdftotext -bbox-layout bezieht
const CARDS_PER_PAGE = 8; // 2 Spalten × 4 Zeilen

// Die Vorlage hat eine MediaBox mit y-Ursprung ≠ 0 (Canva-Export-Eigenheit,
// z. B. y=7.92 statt 0) — pdf-lib zeichnet relativ zur MediaBox, während
// die aus `pdftotext -bbox-layout` entnommenen SLOT-Koordinaten relativ zur
// CropBox (oben links) sind. Ohne diesen Offset landen alle Boxen ein paar
// Punkte zu weit unten — sichtbar z. B. daran, dass das Ausweißen des
// Firmenfelds die durchgezogene Trennlinie direkt darunter mit wegradiert.
// Wird in main() aus der echten Vorlage gelesen statt hart codiert, damit
// ein neuer Canva-Export sich nicht wieder unbemerkt verschiebt.
let PAGE_ORIGIN_Y = 0;

function slotOrigin(index) {
  const col = index % 2;
  const row = Math.floor(index / 2);
  return { dx: col * COL_DX, dy: row * ROW_DY };
}

/** Zentrierten Text in eine Box schreiben, Schriftgröße runterregeln bis
 * er in die Boxbreite passt (gleiches Prinzip wie `textImg` im Rest des
 * Repos, nur mit pdf-lib-Textmetriken statt Pango). */
function fitSize(font, text, maxWidth, startSize, minSize) {
  let size = startSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
}

function drawCentered(page, font, text, box, { size, color, dx, dy }) {
  if (!text) return;
  const x = box.x + dx;
  const yTopDown = box.yBottom + dy;
  const w = font.widthOfTextAtSize(text, size);
  const left = x + (box.w - w) / 2;
  const baseline = PAGE_ORIGIN_Y + PAGE_H - yTopDown + size * 0.18; // grobe Baseline-Korrektur (Cap-Height vs. yBottom)
  page.drawText(text, { x: left, y: baseline, size, font, color });
}

function eraseBox(page, box, { dx, dy, color, padX = 4, padTop = 3, padBottom = 3 }) {
  const x = box.x + dx - padX;
  const yTopDown = box.yTop + dy - padTop;
  const h = box.yBottom - box.yTop + padTop + padBottom;
  page.drawRectangle({
    x, y: PAGE_ORIGIN_Y + PAGE_H - yTopDown - h, width: box.w + padX * 2, height: h, color,
  });
}

// Das Datumsfeld sitzt auf dem Verlaufs-Header, nicht auf Weiß — ein
// flächiger Rechteck-Fill in EINER abgetasteten Farbe sah dort wie ein
// sichtbar falsch getönter Aufkleber aus, weil der Verlauf über die
// Feldbreite selbst leicht changiert (siehe SKILL.md, Abschnitt
// "Datumsfeld"). Stattdessen wird ein echter, textfreier Streifen des
// Verlaufs aus der Vorlage ausgeschnitten und über die Zielhöhe gestreckt
// — der Verlauf ändert sich nur horizontal, nicht vertikal, darum ist das
// Strecken verlustfrei und garantiert pixelgenau statt geraten.
async function buildDatePatch(templatePngPath, rasterDpi) {
  const scale = rasterDpi / 72;
  const padX = 4;
  const padTop = 8;
  const padBottom = 3;
  const box = SLOT.date;
  const left = Math.round((box.x - padX) * scale);
  const width = Math.round((box.w + padX * 2) * scale);
  const targetHeight = Math.round((box.yBottom - box.yTop + padTop + padBottom) * scale);
  // Textfreier Streifen: Header beginnt bei y≈39pt, Datumstext erst bei
  // yTop=48.26pt — 43–46pt liegt sicher dazwischen (siehe SKILL.md).
  const stripTop = Math.round(43 * scale);
  const stripHeight = Math.max(1, Math.round(3 * scale));
  const strip = await sharp(templatePngPath).extract({ left, top: stripTop, width, height: stripHeight }).toBuffer();
  return sharp(strip).resize(width, targetHeight, { fit: 'fill' }).png().toBuffer();
}

function drawDatePatch(page, patchImage, { dx, dy }) {
  const padX = 4;
  const padTop = 8;
  const padBottom = 3;
  const box = SLOT.date;
  const x = box.x + dx - padX;
  const yTopDown = box.yTop + dy - padTop;
  const h = box.yBottom - box.yTop + padTop + padBottom;
  const w = box.w + padX * 2;
  page.drawImage(patchImage, { x, y: PAGE_ORIGIN_Y + PAGE_H - yTopDown - h, width: w, height: h });
}

async function main() {
  const eventSlug = process.argv[2];
  if (!eventSlug) {
    console.error('Aufruf: node scripts/generate-namenskarten.mjs <event-slug>');
    process.exit(1);
  }
  console.log(`Baue Namenskarten für ${eventSlug} …`);

  const kit = await loadEventKit(eventSlug);
  const dataPath = path.join(DATA_DIR, `${eventSlug}.json`);
  const guestData = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  const people = [...(guestData.staff ?? []), ...(guestData.attendees ?? [])];
  if (!people.length) throw new Error(`Keine Gäste in ${dataPath} (staff/attendees).`);

  // "SEP 26" statt vollem Datum — das Datumsfeld im Header ist nur ~68pt
  // breit, der volle Tag ist fürs Namensschild ohnehin nicht relevant.
  const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const d = new Date(kit.event.eventDate);
  const dateLabel = `${MONTHS_EN[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;

  const templateBytes = await fs.readFile(path.join(ASSETS, 'template.pdf'));
  const template = await PDFDocument.load(templateBytes);
  PAGE_ORIGIN_Y = template.getPage(0).getMediaBox().y;

  // Vorlage einmal rastern, um daraus den textfreien Verlaufs-Streifen fürs
  // Datumsfeld zu gewinnen (siehe buildDatePatch) — ein Aufruf reicht, der
  // Patch ist für alle 8 Kartenslots auf jeder Seite identisch (jede Karte
  // hat exakt denselben Verlauf an derselben relativen Stelle).
  const RASTER_DPI = 300;
  const scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ainights-namenskarten-'));
  const templatePngBase = path.join(scratchDir, 'template');
  await run('pdftoppm', ['-png', '-r', String(RASTER_DPI), '-f', '1', '-l', '1', path.join(ASSETS, 'template.pdf'), templatePngBase]);
  // pdftoppm hängt je nach Poppler-Version 1- oder 2-stellig gepaddete
  // Seitenzahlen an — statt zu raten, die tatsächlich erzeugte Datei suchen.
  const producedFile = (await fs.readdir(scratchDir)).find((f) => f.startsWith('template') && f.endsWith('.png'));
  if (!producedFile) throw new Error(`pdftoppm hat kein PNG erzeugt in ${scratchDir}`);
  const datePatchBuf = await buildDatePatch(path.join(scratchDir, producedFile), RASTER_DPI);
  await fs.rm(scratchDir, { recursive: true, force: true });

  const out = await PDFDocument.create();
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const regular = await out.embedFont(StandardFonts.Helvetica);
  const datePatchImage = await out.embedPng(datePatchBuf);

  const pageCount = Math.ceil(people.length / CARDS_PER_PAGE);
  for (let p = 0; p < pageCount; p++) {
    const [front] = await out.copyPages(template, [0]);
    out.addPage(front);

    for (let slot = 0; slot < CARDS_PER_PAGE; slot++) {
      const person = people[p * CARDS_PER_PAGE + slot];
      const { dx, dy } = slotOrigin(slot);

      // Original-Platzhalter "<AIN DATUM>" hat Großbuchstaben-Oberlängen,
      // die über die von pdftotext gemeldete Box hinausragen — der Patch
      // deckt darum großzügig nach oben ab, sonst blitzt der alte Text
      // noch durch (siehe buildDatePatch/drawDatePatch für die Maße).
      drawDatePatch(front, datePatchImage, { dx, dy });
      drawCentered(front, bold, dateLabel, SLOT.date, { size: 13, color: WHITE, dx, dy });

      eraseBox(front, SLOT.firstName, { dx, dy, color: WHITE });
      eraseBox(front, SLOT.lastName, { dx, dy, color: WHITE });
      eraseBox(front, SLOT.company, { dx, dy, color: WHITE });
      if (!person) continue; // leerer Slot auf der letzten Seite — Feld bleibt weiß/leer

      const nameSize = fitSize(bold, person.lastName, SLOT.firstName.w, 20, 10);
      const firstSize = Math.min(nameSize, fitSize(bold, person.firstName, SLOT.firstName.w, 20, 10));
      drawCentered(front, bold, person.firstName, SLOT.firstName, { size: firstSize, color: rgb(0.05, 0.05, 0.05), dx, dy });
      drawCentered(front, bold, person.lastName, SLOT.lastName, { size: firstSize, color: rgb(0.05, 0.05, 0.05), dx, dy });

      if (person.company) {
        const companySize = fitSize(regular, person.company, SLOT.company.w, 13, 8);
        drawCentered(front, regular, person.company, { ...SLOT.company, yBottom: SLOT.company.yTop + 16 }, { size: companySize, color: rgb(0.3, 0.3, 0.3), dx, dy });
      }
    }

    // Rückseite ist für jede Karte identisch generisch — unverändert
    // duplizieren, kein Textediting nötig.
    const [back] = await out.copyPages(template, [1]);
    out.addPage(back);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${eventSlug}.pdf`);
  await fs.writeFile(outPath, await out.save());

  const usedSlots = pageCount * CARDS_PER_PAGE;
  console.log(`Fertig: ${outPath}`);
  console.log(`${people.length} Personen (${guestData.staff?.length ?? 0} Crew + ${guestData.attendees?.length ?? 0} Gäste) auf ${pageCount} Vorderseiten (${usedSlots - people.length} Slots leer) + ${pageCount} Rückseiten.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
