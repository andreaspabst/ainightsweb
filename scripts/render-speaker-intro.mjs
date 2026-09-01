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
// Layer-Dateien sind Wegwerf-Dateien und gehören ins OS-Tempverzeichnis.
const OUT_DIR = path.join(PUBLIC, 'media/speaker-intros');
const SCRATCH_DIR = path.join(os.tmpdir(), 'ainights-speaker-intro');

const W = 1920;
const H = 1080;
const FPS = 30;

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
 * werden kann (overlay-Basisposition 0,0, keine weitere Positionslogik in
 * ffmpeg nötig). */
async function toFullCanvas(input, left, top) {
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input, left: Math.round(left), top: Math.round(top) }])
    .png()
    .toBuffer();
}

/**
 * Ken-Burns-Zoom fürs Portrait: rendert eine PNG-Sequenz (nicht ein
 * alpha-codiertes Video, um Codec-Fallstricke zu vermeiden) mit einem
 * langsamen, durchgehenden Zoom übers gesamte Video, kreisrund maskiert.
 * Wird als eigener Layer mit fester Position (baseX/baseY) statt auf einer
 * vollflächigen Leinwand geführt, weil er kleiner als 1920×1080 ist.
 */
async function buildKenBurnsPhoto(photoPath, duration) {
  const diameter = CIRCLE.r * 2;
  const bigSize = Math.round(diameter * 1.18); // Zoom-Reserve, damit nie der Bildrand sichtbar wird
  const bigPath = path.join(SCRATCH_DIR, 'kenburns-src.png');
  await sharp(photoPath)
    .resize(bigSize, bigSize, { fit: 'cover', position: 'attention' })
    .grayscale()
    .png()
    .toFile(bigPath);

  const maskPath = path.join(SCRATCH_DIR, 'kenburns-mask.png');
  await sharp(Buffer.from(`<svg width="${diameter}" height="${diameter}"><circle cx="${diameter / 2}" cy="${diameter / 2}" r="${diameter / 2}" fill="#fff"/></svg>`))
    .png()
    .toFile(maskPath);

  const frameCount = Math.round(duration * FPS);
  const seqPattern = path.join(SCRATCH_DIR, 'kenburns-%04d.png');

  await run('ffmpeg', [
    '-y',
    '-loop', '1', '-i', bigPath,
    '-loop', '1', '-t', String(duration), '-framerate', String(FPS), '-i', maskPath,
    '-filter_complex',
    `[0:v]zoompan=z='min(zoom+0.0006\\,1.18)':d=${frameCount}:s=${diameter}x${diameter}:fps=${FPS}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',format=rgba[zoomed];[1:v]format=gray[m];[zoomed][m]alphamerge[out]`,
    '-map', '[out]',
    '-frames:v', String(frameCount),
    seqPattern,
  ]);

  return {
    kind: 'sequence',
    seqPattern,
    frameCount,
    baseX: CIRCLE.cx - CIRCLE.r,
    baseY: CIRCLE.cy - CIRCLE.r,
    fadeStart: 0,
    fadeDur: 0.6,
  };
}

/** Baut die einzelnen Overlay-Layer, jeweils mit eigener Fade-in-Zeit (Sekunden),
 * für die gestaffelte Eintritts-Animation. Testversion mit drei modernen
 * Effekten statt eines einheitlichen Fades:
 *  - Foto: Ken-Burns-Zoom (durchgehend, ganzes Video)
 *  - Name: Kinetic Typography (Wort für Wort, statt der ganzen Zeile auf einmal)
 *  - Talk-Titel: Wipe-Reveal (wächst von links nach rechts ein)
 *  - Rolle/Job-Titel: bisheriger Fade+Slide (Referenz/Baseline zum Vergleich)
 */
async function buildLayers(speaker, talkTitle, duration) {
  const layers = [];
  let t = 0;
  const STEP = 0.45;
  const WORD_STEP = 0.15;
  const FADE_DUR = 0.6;

  if (speaker.image?.src) {
    layers.push(await buildKenBurnsPhoto(path.join(PUBLIC, speaker.image.src), duration));
    t += STEP;
  }

  // Textblock beginnt rechts neben dem Kreis-Foto und ist vertikal mittig
  // zum Kreis (cy=540) ausgerichtet.
  const NAME_X = CIRCLE.cx + CIRCLE.r + 80;
  const NAME_Y = 280;
  const NAME_SIZE = 110;
  const WORD_GAP = 26;

  // Kinetic Typography: Name wortweise gerendert und nebeneinander platziert
  // (statt einer Zeile am Stück), jedes Wort blendet leicht versetzt ein.
  // Jedes Wort für sich passt fast immer in maxWidth — deshalb erst die
  // Gesamtbreite aller Wörter zusammen prüfen und bei Bedarf die Schrift für
  // ALLE Wörter gemeinsam verkleinern (sonst laufen lange Namen rechts aus
  // dem Bild, z. B. "Andreas Pabst („IT Pabst“)").
  const NAME_MAX_WIDTH = W - NAME_X - 120;
  const NAME_MIN_SIZE = 60;
  const words = speaker.title.split(' ');
  let namePx = NAME_SIZE;
  let wordImgs;
  for (;;) {
    wordImgs = [];
    const gap = WORD_GAP * (namePx / NAME_SIZE);
    let totalWidth = -gap;
    for (const word of words) {
      const img = await textImg(word, { font: 'Inter Black', size: namePx, color: COLOR_WHITE, maxWidth: NAME_MAX_WIDTH * 4, maxHeight: namePx + 20, minSize: namePx });
      wordImgs.push(img);
      totalWidth += img.info.width + gap;
    }
    if (totalWidth <= NAME_MAX_WIDTH || namePx <= NAME_MIN_SIZE) break;
    namePx -= 4;
  }
  const nameGap = WORD_GAP * (namePx / NAME_SIZE);
  let cursorX = NAME_X;
  for (const img of wordImgs) {
    layers.push({ kind: 'still', canvas: await toFullCanvas(img.data, cursorX, NAME_Y), effect: 'fadeslide', fadeStart: t, fadeDur: FADE_DUR });
    cursorX += img.info.width + nameGap;
    t += WORD_STEP;
  }
  t += STEP - WORD_STEP;

  const roleLabel = speaker.role === 'moderator'
    ? (!talkTitle && speaker.moderatorLabel ? speaker.moderatorLabel : 'AI Nights Host & Moderator')
    : 'AI Nights Speaker';
  const subtitle = await textImg(roleLabel, { font: 'Inter Medium', size: 48, color: COLOR_MUTED, maxWidth: W - NAME_X - 120, maxHeight: 55, minSize: 28 });
  layers.push({ kind: 'still', canvas: await toFullCanvas(subtitle.data, NAME_X, 415), effect: 'fadeslide', fadeStart: t, fadeDur: FADE_DUR });
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
    // Wipe-Reveal statt Fade: wächst von links nach rechts ein.
    layers.push({ kind: 'still', canvas: await toFullCanvas(title.data, NAME_X, 625), effect: 'wipe', fadeStart: t, fadeDur: 0.7 });
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
    layers.push({ kind: 'still', canvas: await toFullCanvas(job.data, NAME_X, 800), effect: 'fadeslide', fadeStart: t, fadeDur: FADE_DUR });
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

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(SCRATCH_DIR, { recursive: true });

  const { stdout: durOut } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', TEMPLATE,
  ]);
  const duration = parseFloat(durOut.trim());

  const layers = await buildLayers(speaker, talkTitle, duration);

  // Jeder Layer bekommt genau einen Input (Foto-Sequenz oder Text-Still).
  const cleanupPaths = [];
  const inputArgs = ['-i', TEMPLATE];
  layers.forEach((l, i) => { l.mainInputIdx = i + 1; });
  for (const l of layers) {
    if (l.kind === 'sequence') {
      inputArgs.push('-framerate', String(FPS), '-i', l.seqPattern);
    } else {
      const p = path.join(SCRATCH_DIR, `still-${cleanupPaths.length}.png`);
      await fs.writeFile(p, l.canvas);
      cleanupPaths.push(p);
      // Ohne -loop/-t wäre das PNG nur 1 Frame lang — dann kann `fade`/`geq`
      // die Animation nicht über die Zeit ausrollen, sondern "sieht" nur den
      // Zustand bei t=0 und friert dabei ein.
      inputArgs.push('-loop', '1', '-framerate', String(FPS), '-t', String(duration), '-i', p);
    }
  }

  // Dezenter Slide-in von links (SLIDE_PX) zusätzlich zum Alpha-Fade für die
  // "fadeslide"-Layer; "wipe"-Layer wachsen stattdessen von links nach
  // rechts ein (kein zusätzlicher Slide, das wäre zu viel Bewegung auf einmal).
  // Der Reveal kommt über `geq`, das pro Pixel den ORIGINALEN Alphakanal
  // (Funktion `alpha(X,Y)`) mit einer harten Zeit-/Positions-Kante
  // multipliziert — nicht per `crop` (dessen w/h-Parameter in dieser
  // ffmpeg-Version keine Zeitausdrücke mit `t` akzeptieren) und nicht per
  // separater Masken-Datei + `alphamerge` (das würde den Alphakanal komplett
  // ERSETZEN statt ihn zu multiplizieren — dadurch blieben die eigentlich
  // transparenten Bereiche zwischen den Buchstaben nach dem Reveal nicht
  // transparent, sondern würden zu undurchsichtigem Schwarz).
  const SLIDE_PX = 28;
  const filterParts = [];
  layers.forEach((l, i) => {
    if (l.effect === 'wipe') {
      const st = l.fadeStart;
      const dur = l.fadeDur;
      filterParts.push(
        `[${l.mainInputIdx}:v]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*if(lt(X,(T-${st})/${dur}*${W}),1,0)'[f${i}]`
      );
    } else {
      filterParts.push(`[${l.mainInputIdx}:v]format=rgba,fade=t=in:st=${l.fadeStart}:d=${l.fadeDur}:alpha=1[f${i}]`);
    }
  });
  let prev = '0:v';
  layers.forEach((l, i) => {
    const out = i === layers.length - 1 ? 'vout' : `ov${i}`;
    const baseX = l.baseX ?? 0;
    const baseY = l.baseY ?? 0;
    let xExpr;
    if (l.effect === 'wipe') {
      xExpr = `${baseX}`;
    } else {
      const st = l.fadeStart;
      const end = l.fadeStart + l.fadeDur;
      xExpr = `${baseX}+if(lt(t\\,${st})\\,-${SLIDE_PX}\\,if(lt(t\\,${end})\\,-${SLIDE_PX}+${SLIDE_PX}*(t-${st})/${l.fadeDur}\\,0))`;
    }
    filterParts.push(`[${prev}][f${i}]overlay=x='${xExpr}':y='${baseY}':format=auto[${out}]`);
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

  await Promise.all(cleanupPaths.map((p) => fs.rm(p, { force: true })));
  for (const l of layers) {
    if (l.kind === 'sequence') {
      const dir = path.dirname(l.seqPattern);
      const base = path.basename(l.seqPattern).split('%')[0];
      for (const f of await fs.readdir(dir)) {
        if (f.startsWith(base)) await fs.rm(path.join(dir, f), { force: true });
      }
    }
  }
  await fs.rm(path.join(SCRATCH_DIR, 'kenburns-src.png'), { force: true });
  await fs.rm(path.join(SCRATCH_DIR, 'kenburns-mask.png'), { force: true });

  console.log(`Fertig: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
