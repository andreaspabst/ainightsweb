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
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { ROOT, PUBLIC, loadEventKit } from './lib/social-kit.mjs';

const ASSETS = path.join(ROOT, 'scripts/assets/namenskarten');
const DATA_DIR = path.join(ROOT, 'scripts/data/namenskarten');
const OUT_DIR = path.join(PUBLIC, 'media/namenskarten');

const WHITE = rgb(1, 1, 1);
// Aus der Vorlage abgetastete Hintergrundfarbe des Farbverlaufs genau an
// der Stelle, an der "<AIN DATUM>" sitzt (beide Spalten identisch, da
// jede Karte ihren eigenen Verlauf hat) — zum sauberen Ausweißen des
// Datums-Platzhalters, der auf dem pinken Header sitzt statt auf Weiß.
const HEADER_BG = rgb(220 / 255, 47 / 255, 108 / 255);

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

  // Kompaktes Format (TT.MM.JJJJ) statt ausgeschriebenem Monat — das
  // Datumsfeld im Header ist nur ~68pt breit.
  const d = new Date(kit.event.eventDate);
  const dateLabel = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

  const templateBytes = await fs.readFile(path.join(ASSETS, 'template.pdf'));
  const template = await PDFDocument.load(templateBytes);
  PAGE_ORIGIN_Y = template.getPage(0).getMediaBox().y;

  const out = await PDFDocument.create();
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const regular = await out.embedFont(StandardFonts.Helvetica);

  const pageCount = Math.ceil(people.length / CARDS_PER_PAGE);
  for (let p = 0; p < pageCount; p++) {
    const [front] = await out.copyPages(template, [0]);
    out.addPage(front);

    for (let slot = 0; slot < CARDS_PER_PAGE; slot++) {
      const person = people[p * CARDS_PER_PAGE + slot];
      const { dx, dy } = slotOrigin(slot);

      // Original-Platzhalter "<AIN DATUM>" hat Großbuchstaben-Oberlängen,
      // die über die von pdftotext gemeldete Box hinausragen — großzügig
      // nach oben ausweißen, sonst blitzt der alte Text noch durch.
      eraseBox(front, SLOT.date, { dx, dy, color: HEADER_BG, padTop: 12, padBottom: 3 });
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
