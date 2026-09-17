#!/usr/bin/env node
/**
 * Namenskarten (Namensschilder) für ein AI-Nights-Event: bearbeitet zwei
 * Canva-Vorlagen direkt (weißt die Platzhalterfelder aus, schreibt Name +
 * Firma/Rolle neu rein) statt das Design nachzubauen — Logo, Farbverlauf,
 * Deko-Icons und die generische Rückseite bleiben dadurch 1:1 wie im
 * Original. Immer Vorderseite→Rückseite→Vorderseite→Rückseite fürs
 * Duplex-Drucken. Beide Vorlagen landen in EINER PDF-Datei: erst
 * Team/Speaker-Seiten, danach die Gäste-Seiten.
 *
 * Vorlagen (nicht anfassen — Canva-Export, je 8 Karten/Seite):
 *   scripts/assets/namenskarten/template.pdf       — für attendees (Gäste)
 *   scripts/assets/namenskarten/team-template.pdf  — für staff + speakers
 *     (Slots 0-3 pro Seite sind mit "SPEAKER" beschriftet, Slots 4-7 mit
 *     "TEAM" — reines Vorlagen-Artwork, wird nicht überschrieben.)
 * Gästeliste pro Event:
 *   scripts/data/namenskarten/<event-slug>.json
 *   { staff: [...], speakers: [...], attendees: [...] }
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

// In jeder Ausgabe ein paar Blanko-Gästekarten mitgeben — für Walk-ins
// ohne Vorab-Ticket, die vor Ort von Hand ausgefüllt werden. Name bleibt
// leer, nur "Guest" steht schon als Firmenfeld drauf.
const BLANK_GUEST_CARDS = 2;

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

/** Lädt eine Vorlage, liest ihren MediaBox-Offset und schneidet daraus den
 * textfreien Verlaufs-Streifen fürs Datumsfeld aus (siehe buildDatePatch)
 * — je Vorlage einmal, weil Team- und Gäste-Vorlage unterschiedliche
 * Rasterbilder sind (auch wenn ihr Kartenraster identisch ist). */
async function loadTemplateContext(out, templatePath) {
  const templateBytes = await fs.readFile(templatePath);
  const template = await PDFDocument.load(templateBytes);
  const originY = template.getPage(0).getMediaBox().y;

  const RASTER_DPI = 300;
  const scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ainights-namenskarten-'));
  const templatePngBase = path.join(scratchDir, 'template');
  await run('pdftoppm', ['-png', '-r', String(RASTER_DPI), '-f', '1', '-l', '1', templatePath, templatePngBase]);
  // pdftoppm hängt je nach Poppler-Version 1- oder 2-stellig gepaddete
  // Seitenzahlen an — statt zu raten, die tatsächlich erzeugte Datei suchen.
  const producedFile = (await fs.readdir(scratchDir)).find((f) => f.startsWith('template') && f.endsWith('.png'));
  if (!producedFile) throw new Error(`pdftoppm hat kein PNG erzeugt in ${scratchDir}`);
  const datePatchBuf = await buildDatePatch(path.join(scratchDir, producedFile), RASTER_DPI);
  await fs.rm(scratchDir, { recursive: true, force: true });
  const datePatchImage = await out.embedPng(datePatchBuf);

  return { template, originY, datePatchImage };
}

/** Zeichnet eine Vorderseite. `assign(slot)` liefert die Person (oder
 * undefined) für Slot 0..7 — je nach Vorlage sequenziell (Gäste) oder nach
 * Speaker/Team-Rolle (Team-Vorlage, Slots 0-3 Speaker / 4-7 Team). */
function renderFrontPage(out, ctx, bold, regular, dateLabel, assign) {
  PAGE_ORIGIN_Y = ctx.originY;
  return out.copyPages(ctx.template, [0]).then(([front]) => {
    out.addPage(front);
    for (let slot = 0; slot < CARDS_PER_PAGE; slot++) {
      const person = assign(slot);
      const { dx, dy } = slotOrigin(slot);

      // Original-Platzhalter "<AIN DATUM>" hat Großbuchstaben-Oberlängen,
      // die über die von pdftotext gemeldete Box hinausragen — der Patch
      // deckt darum großzügig nach oben ab, sonst blitzt der alte Text
      // noch durch (siehe buildDatePatch/drawDatePatch für die Maße).
      drawDatePatch(front, ctx.datePatchImage, { dx, dy });
      drawCentered(front, bold, dateLabel, SLOT.date, { size: 13, color: WHITE, dx, dy });

      eraseBox(front, SLOT.firstName, { dx, dy, color: WHITE });
      eraseBox(front, SLOT.lastName, { dx, dy, color: WHITE });
      eraseBox(front, SLOT.company, { dx, dy, color: WHITE });
      if (!person) continue; // leerer Slot — Feld bleibt weiß/leer

      const nameSize = fitSize(bold, person.lastName, SLOT.firstName.w, 20, 10);
      const firstSize = Math.min(nameSize, fitSize(bold, person.firstName, SLOT.firstName.w, 20, 10));
      drawCentered(front, bold, person.firstName, SLOT.firstName, { size: firstSize, color: rgb(0.05, 0.05, 0.05), dx, dy });
      drawCentered(front, bold, person.lastName, SLOT.lastName, { size: firstSize, color: rgb(0.05, 0.05, 0.05), dx, dy });

      if (person.company) {
        const companySize = fitSize(regular, person.company, SLOT.company.w, 13, 8);
        drawCentered(front, regular, person.company, { ...SLOT.company, yBottom: SLOT.company.yTop + 16 }, { size: companySize, color: rgb(0.3, 0.3, 0.3), dx, dy });
      }
    }
  });
}

// Rückseite ist für jede Karte identisch generisch — unverändert
// duplizieren, kein Textediting nötig.
async function renderBackPage(out, ctx) {
  const [back] = await out.copyPages(ctx.template, [1]);
  out.addPage(back);
}

async function main() {
  const args = process.argv.slice(2);
  const eventSlug = args.find((a) => !a.startsWith('--'));
  // Nachzügler-Druck: nur die Gäste-Seiten (spart die Team-/Speaker-Bögen,
  // die beim ersten Druck schon rausgingen) und eine eigene Ausgabedatei.
  const guestsOnly = args.includes('--guests-only');
  const suffixArg = args.includes('--suffix') ? args[args.indexOf('--suffix') + 1] : null;
  const suffix = suffixArg ? `_${String(suffixArg).replace(/^_/, '')}` : '';
  if (!eventSlug) {
    console.error('Aufruf: node scripts/generate-namenskarten.mjs <event-slug> [--guests-only] [--suffix v2]');
    process.exit(1);
  }
  console.log(`Baue Namenskarten für ${eventSlug}${guestsOnly ? ' (nur Gäste)' : ''} …`);

  const kit = await loadEventKit(eventSlug);
  const dataPath = path.join(DATA_DIR, `${eventSlug}.json`);
  const guestData = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  const staff = guestData.staff ?? [];
  const speakers = guestData.speakers ?? [];
  const attendees = [
    ...(guestData.attendees ?? []),
    ...Array.from({ length: BLANK_GUEST_CARDS }, () => ({ firstName: '', lastName: '', company: 'Guest' })),
  ];
  if (guestsOnly && !(guestData.attendees ?? []).length) {
    throw new Error(`Keine Gäste in ${dataPath} — mit --guests-only gibt es dann nichts zu drucken.`);
  }
  if (!staff.length && !speakers.length && !attendees.length) {
    throw new Error(`Keine Gäste in ${dataPath} (staff/speakers/attendees).`);
  }

  // "SEP 26" statt vollem Datum — das Datumsfeld im Header ist nur ~68pt
  // breit, der volle Tag ist fürs Namensschild ohnehin nicht relevant.
  const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const d = new Date(kit.event.eventDate);
  const dateLabel = `${MONTHS_EN[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;

  const out = await PDFDocument.create();
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const regular = await out.embedFont(StandardFonts.Helvetica);

  let teamPageCount = 0;
  if (!guestsOnly && (staff.length || speakers.length)) {
    // Team-Vorlage: Slots 0-3 sind als "SPEAKER" beschriftet, 4-7 als
    // "TEAM" (Vorlagen-Artwork) — Speaker und Crew laufen darum als zwei
    // getrennte 4er-Warteschlangen statt einer durchlaufenden Liste.
    const teamCtx = await loadTemplateContext(out, path.join(ASSETS, 'team-template.pdf'));
    teamPageCount = Math.max(Math.ceil(speakers.length / 4), Math.ceil(staff.length / 4), 1);
    for (let p = 0; p < teamPageCount; p++) {
      const speakerSlice = speakers.slice(p * 4, p * 4 + 4);
      const staffSlice = staff.slice(p * 4, p * 4 + 4);
      await renderFrontPage(out, teamCtx, bold, regular, dateLabel, (slot) => (slot < 4 ? speakerSlice[slot] : staffSlice[slot - 4]));
      await renderBackPage(out, teamCtx);
    }
  }

  let guestPageCount = 0;
  if (attendees.length) {
    const guestCtx = await loadTemplateContext(out, path.join(ASSETS, 'template.pdf'));
    guestPageCount = Math.ceil(attendees.length / CARDS_PER_PAGE);
    for (let p = 0; p < guestPageCount; p++) {
      await renderFrontPage(out, guestCtx, bold, regular, dateLabel, (slot) => attendees[p * CARDS_PER_PAGE + slot]);
      await renderBackPage(out, guestCtx);
    }
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${eventSlug}${suffix}.pdf`);
  await fs.writeFile(outPath, await out.save());

  const totalPeople = (guestsOnly ? 0 : staff.length + speakers.length) + attendees.length;
  const pageCount = teamPageCount + guestPageCount;
  console.log(`Fertig: ${outPath}`);
  const crewLabel = guestsOnly ? '0 Crew + 0 Speaker (übersprungen)' : `${staff.length} Crew + ${speakers.length} Speaker`;
  console.log(`${totalPeople} Personen (${crewLabel} + ${attendees.length} Gäste) auf ${pageCount} Vorderseiten (${teamPageCount} Team-Vorlage + ${guestPageCount} Gäste-Vorlage) + ${pageCount} Rückseiten.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
