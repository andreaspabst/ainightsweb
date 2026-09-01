#!/usr/bin/env node
/**
 * Talk-Intro-Video pro Speaker ("SPEAKER INTRO").
 *
 * Rendert aus scripts/assets/speaker-intro/template-blank.mp4 (35s, 1920×1080,
 * ohne Ton) ein fertiges MP4 mit rundem S/W-Portrait, Name, Event-Rolle,
 * Talk-Titel und Job-Titel — im gleichen Look wie die Vorlage
 * "SPEAKERS INTRO AIN05.zip" (Referenz: ANDREAS PABST.mp4).
 *
 * Liest Name/Foto/Jobtitel aus src/content/speaker/<slug>.json und (falls
 * vorhanden) den Talk-Titel aus der verknüpften Session des angegebenen
 * Events aus src/content/events/<event-slug>.json.
 *
 * Aufruf:
 *   node scripts/render-speaker-intro.mjs <speaker-slug> [event-slug]
 *   node scripts/render-speaker-intro.mjs martin-hofmann ai-nights-nuernberg-05
 *
 * Ausgabe: public/media/speaker-intros/<speaker-slug>.mp4 — Website-Asset,
 * wird auf /tools/ pro Event verlinkt (wie die Speaker-Announcement-Grafiken
 * aus scripts/generate-speaker-announcements.mjs).
 *
 * Voraussetzung: ffmpeg im PATH; die Schriften "Inter" (mehrere Schnitte)
 * müssen als Systemschrift installiert sein (Pango rendert den Text, wie bei
 * scripts/generate-speaker-announcements.mjs).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const TEMPLATE = path.join(ROOT, 'scripts/assets/speaker-intro/template-blank.mp4');
// Fertige .mp4s sind Website-Assets (siehe /tools/) und landen wie die
// Speaker-Announcement-Grafiken unter public/media/ — nur die Zwischen-
// Layer-PNGs sind Wegwerf-Dateien und gehören ins OS-Tempverzeichnis.
const OUT_DIR = path.join(PUBLIC, 'media/speaker-intros');
const SCRATCH_DIR = path.join(os.tmpdir(), 'ainights-speaker-intro');

const W = 1920;
const H = 1080;

// Kreis-Ausschnitt für das Portrait: frei und vollständig im Bild platziert
// (das neue Hintergrundvideo hat keine eingebrannte Platzhalterform mehr).
const CIRCLE = { cx: 380, cy: 540, r: 340 };

const COLOR_WHITE = '#ffffff';
const COLOR_MUTED = '#e7defc';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Text als transparentes PNG über Pango; verkleinert die Schrift, bis sie passt. */
async function textImg(text, { font, size, color, maxWidth, maxHeight, align = 'left', minSize = 18, wrap = false }) {
  let px = size;
  for (;;) {
    const markup = `<span foreground="${color}">${esc(text)}</span>`;
    const { data, info } = await sharp({
      text: { text: markup, font: `${font} ${px}`, rgba: true, dpi: 72, align, width: wrap ? maxWidth : maxWidth * 4 },
    })
      .png()
      .toBuffer({ resolveWithObject: true });
    const fits = info.width <= maxWidth && (!maxHeight || info.height <= maxHeight);
    if (fits || px <= minSize) return { data, info };
    px -= 2;
  }
}

/** Rundes S/W-Portrait, exakt auf die Kreisgeometrie der Vorlage zugeschnitten. */
async function circlePhoto(photoPath) {
  const size = CIRCLE.r * 2;
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);
  return sharp(photoPath)
    .resize(size, size, { fit: 'cover', position: 'attention' })
    .grayscale()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function loadJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function findTalk(speaker, eventSlug) {
  if (!eventSlug) return null;
  let event;
  try {
    event = await loadJson(path.join(ROOT, `src/content/events/${eventSlug}.json`));
  } catch {
    return null;
  }
  const sessionIds = event.sessionIds ?? [];
  const sessionsDir = path.join(ROOT, 'src/content/sessions');
  for (const file of await fs.readdir(sessionsDir)) {
    const session = await loadJson(path.join(sessionsDir, file));
    if (sessionIds.includes(session.id) && (session.speakerIds ?? []).includes(speaker.id)) {
      return session.title;
    }
  }
  return null;
}

/** Platziert einen Layer auf vollflächiger transparenter 1920×1080-Leinwand,
 * damit jeder Layer im ffmpeg-Filtergraph einzeln und unabhängig überblendet
 * werden kann (overlay=0:0, keine Positionslogik mehr in ffmpeg nötig). */
async function toFullCanvas(input, left, top) {
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input, left: Math.round(left), top: Math.round(top) }])
    .png()
    .toBuffer();
}

/** Baut die einzelnen Overlay-Layer, jeweils mit eigener Fade-in-Zeit (Sekunden),
 * für die gestaffelte Eintritts-Animation wie im Original (Foto → Name →
 * Rolle → Talk-Titel → Job-Titel, nacheinander eingeblendet). */
async function buildLayers(speaker, talkTitle) {
  const layers = [];
  let t = 0;
  const STEP = 0.45;
  const FADE_DUR = 0.6;

  if (speaker.image?.src) {
    const photo = await circlePhoto(path.join(PUBLIC, speaker.image.src));
    layers.push({ canvas: await toFullCanvas(photo, CIRCLE.cx - CIRCLE.r, CIRCLE.cy - CIRCLE.r), fadeStart: t, fadeDur: FADE_DUR });
    t += STEP;
  }

  // Textblock beginnt rechts neben dem Kreis-Foto und ist vertikal mittig
  // zum Kreis (cy=540) ausgerichtet.
  const NAME_X = CIRCLE.cx + CIRCLE.r + 80;
  const name = await textImg(speaker.title, { font: 'Inter Black', size: 110, color: COLOR_WHITE, maxWidth: W - NAME_X - 120, maxHeight: 110, minSize: 60 });
  layers.push({ canvas: await toFullCanvas(name.data, NAME_X, 280), fadeStart: t, fadeDur: FADE_DUR });
  t += STEP;

  const roleLabel = speaker.role === 'moderator' ? 'AI Nights Host & Moderator' : 'AI Nights Speaker';
  const subtitle = await textImg(roleLabel, { font: 'Inter Medium', size: 48, color: COLOR_MUTED, maxWidth: W - NAME_X - 120, maxHeight: 55, minSize: 28 });
  layers.push({ canvas: await toFullCanvas(subtitle.data, NAME_X, 415), fadeStart: t, fadeDur: FADE_DUR });
  t += STEP;

  if (talkTitle) {
    const title = await textImg(talkTitle, {
      font: 'Inter Bold',
      size: 58,
      color: COLOR_WHITE,
      maxWidth: W - NAME_X - 120,
      maxHeight: 140,
      minSize: 30,
      wrap: true,
    });
    layers.push({ canvas: await toFullCanvas(title.data, NAME_X, 625), fadeStart: t, fadeDur: FADE_DUR });
    t += STEP;
  }

  if (speaker.jobTitle) {
    const job = await textImg(speaker.jobTitle, {
      font: 'Inter Medium',
      size: 42,
      color: COLOR_WHITE,
      maxWidth: W - NAME_X - 120,
      maxHeight: 90,
      minSize: 26,
      wrap: true,
    });
    layers.push({ canvas: await toFullCanvas(job.data, NAME_X, 800), fadeStart: t, fadeDur: FADE_DUR });
    t += STEP;
  }

  return layers;
}

async function main() {
  const [slug, eventSlug] = process.argv.slice(2);
  if (!slug) {
    console.error('Aufruf: node scripts/render-speaker-intro.mjs <speaker-slug> [event-slug]');
    process.exit(1);
  }

  const speaker = await loadJson(path.join(ROOT, `src/content/speaker/${slug}.json`));
  const talkTitle = await findTalk(speaker, eventSlug);

  console.log(`Rendere Intro für ${speaker.title}${talkTitle ? ` — Talk: "${talkTitle}"` : ' (kein Talk verknüpft)'}`);

  const layers = await buildLayers(speaker, talkTitle);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(SCRATCH_DIR, { recursive: true });

  const layerPaths = [];
  for (let i = 0; i < layers.length; i++) {
    const p = path.join(SCRATCH_DIR, `${slug}-layer${i}.png`);
    await fs.writeFile(p, layers[i].canvas);
    layerPaths.push(p);
  }

  // Jeder Layer bekommt sein eigenes fade=in (Alpha) mit individuellem Start,
  // danach werden alle nacheinander per overlay auf das Template gelegt —
  // so entsteht die gestaffelte Eintritts-Animation (Foto → Name → Rolle →
  // Talk-Titel → Job-Titel), statt dass alles ab Frame 0 fertig dasteht.
  const { stdout: durOut } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', TEMPLATE,
  ]);
  const duration = parseFloat(durOut.trim());

  const inputArgs = ['-i', TEMPLATE];
  // Ohne -loop/-t wäre jedes PNG nur 1 Frame lang — dann kann `fade` die
  // Animation nicht über die Zeit ausrollen, sondern "sieht" nur den
  // Zustand bei t=0 (meist fast unsichtbar) und friert dabei ein.
  layerPaths.forEach((p) => inputArgs.push('-loop', '1', '-framerate', '30', '-t', String(duration), '-i', p));

  // Dezenter Slide-in von links (SLIDE_PX) zusätzlich zum Alpha-Fade, statt
  // einem reinen Opacity-Fade auf der Stelle — je Layer über die x-Position
  // des overlay-Filters animiert (nicht übertreiben, daher nur ~28px).
  const SLIDE_PX = 28;
  const filterParts = [];
  layers.forEach((l, i) => {
    filterParts.push(`[${i + 1}:v]format=rgba,fade=t=in:st=${l.fadeStart}:d=${l.fadeDur}:alpha=1[f${i}]`);
  });
  let prev = '0:v';
  layers.forEach((l, i) => {
    const out = i === layers.length - 1 ? 'vout' : `ov${i}`;
    const st = l.fadeStart;
    const end = l.fadeStart + l.fadeDur;
    const xExpr = `if(lt(t\\,${st})\\,-${SLIDE_PX}\\,if(lt(t\\,${end})\\,-${SLIDE_PX}+${SLIDE_PX}*(t-${st})/${l.fadeDur}\\,0))`;
    filterParts.push(`[${prev}][f${i}]overlay=x='${xExpr}':y=0:format=auto[${out}]`);
    prev = out;
  });
  const filterComplex = filterParts.join(';');

  const outPath = path.join(OUT_DIR, `${slug}.mp4`);
  await run('ffmpeg', [
    '-y',
    ...inputArgs,
    '-filter_complex', filterComplex,
    '-map', '[vout]',
    '-c:v', 'libx264',
    '-crf', '18',
    '-preset', 'medium',
    '-pix_fmt', 'yuv420p',
    outPath,
  ]);
  await Promise.all(layerPaths.map((p) => fs.rm(p, { force: true })));

  console.log(`Fertig: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
