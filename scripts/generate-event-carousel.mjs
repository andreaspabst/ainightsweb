#!/usr/bin/env node
/**
 * Event-Karussell für Instagram & LinkedIn.
 *
 * Slide 1: komplettes Line-up (alle bestätigten Speaker)
 * Slide 2..N+1: je ein Speaker mit seinem Talk-Thema
 * letzte Slide: „Follow AI Nights“-CTA
 *
 * Ausgabe: public/media/event-carousels/<event-slug>/slide-<n>-instagram.png (1080×1080)
 *          public/media/event-carousels/<event-slug>/slide-<n>-linkedin.png  (1200×627)
 * Die Dateien tauchen automatisch pro Event auf /tools/ auf.
 *
 * Aufruf:
 *   node scripts/generate-event-carousel.mjs ai-nights-nuernberg-05 [weitere-slugs]
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  C, FORMATS, PUBLIC, textImg, circlePhoto, background, ring, pillBg, footer,
  loadLogo, loadEventKit, splitEventTitle, followSlide,
} from './lib/social-kit.mjs';

const OUT_BASE = path.join(PUBLIC, 'media/event-carousels');

/** Slide 1 — Line-up: Eventtitel + Spalte pro Speaker. */
async function lineupSlide(fmt, kit, logo) {
  const { w: W, h: H } = FORMATS[fmt];
  const square = fmt === 'instagram';
  const margin = square ? 72 : 64;
  const layers = [{ input: square ? logo.square : logo.landscape, top: square ? 62 : 40, left: margin }];

  const pillText = (kit.isWoman ? 'Das Line-up steht' : 'Das Line-up steht').toUpperCase();
  const pill = await textImg(pillText, { family: 'Inter ExtraBold', size: square ? 26 : 20, color: '#ffffff', maxWidth: W - margin * 2 - 120, letterSpacing: 1.2 });
  const pillH = square ? 60 : 48;
  const pillW = pill.info.width + (square ? 76 : 56);
  const pillY = square ? 74 : 44;
  layers.push({ input: pillBg(pillW, pillH), top: pillY, left: W - margin - pillW });
  layers.push({ input: pill.data, top: pillY + Math.round((pillH - pill.info.height) / 2), left: W - margin - pillW + Math.round((pillW - pill.info.width) / 2) });

  const { series, edition } = splitEventTitle(kit.event);
  const titleY = square ? 190 : 122;
  const t1 = await textImg(series, { family: 'Inter Black', size: square ? 58 : 44, color: C.text, maxWidth: W - margin * 2 });
  layers.push({ input: t1.data, top: titleY, left: Math.round((W - t1.info.width) / 2) });
  let afterTitle = titleY + t1.info.height;
  if (edition) {
    const t2 = await textImg(edition, { family: 'Inter ExtraBold', size: square ? 34 : 26, color: C.magenta, maxWidth: W - margin * 2, letterSpacing: 0.6 });
    layers.push({ input: t2.data, top: afterTitle + 8, left: Math.round((W - t2.info.width) / 2) });
    afterTitle += t2.info.height + 8;
  }

  // Speaker-Reihe
  const n = kit.speakers.length;
  const rowTop = square ? afterTitle + 66 : afterTitle + 34;
  const colW = Math.floor((W - margin * 2) / n);
  const R = Math.min(square ? 128 : 96, Math.floor(colW * 0.32));
  for (let i = 0; i < n; i++) {
    const s = kit.speakers[i];
    const cx = margin + colW * i + Math.floor(colW / 2);
    const cy = rowTop + R;
    layers.push({ input: ring(W, H, cx, cy, R + 5, 7), top: 0, left: 0 });
    layers.push({ input: await circlePhoto(s, R * 2), top: cy - R, left: cx - R });
    const name = await textImg(s.title, { family: 'Inter ExtraBold', size: square ? 30 : 24, color: C.text, maxWidth: colW - 24, maxHeight: square ? 76 : 60, wrap: true, align: 'centre' });
    layers.push({ input: name.data, top: cy + R + (square ? 26 : 18), left: cx - Math.round(name.info.width / 2) });
    if (s.jobTitle) {
      const role = await textImg(s.jobTitle, { family: 'Inter', size: square ? 20 : 17, color: C.muted, maxWidth: colW - 28, maxHeight: square ? 72 : 58, wrap: true, align: 'centre' });
      layers.push({ input: role.data, top: cy + R + (square ? 26 : 18) + name.info.height + 8, left: cx - Math.round(role.info.width / 2) });
    }
  }

  layers.push(...(await footer(W, H, kit.event, { margin })));
  return sharp(background(W, H)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

/** Slide je Speaker — Portrait + Talk-Thema. */
async function speakerSlide(fmt, kit, speaker, idx, logo) {
  const { w: W, h: H } = FORMATS[fmt];
  const square = fmt === 'instagram';
  const margin = square ? 72 : 64;
  const talk = kit.talkFor(speaker);
  const layers = [{ input: square ? logo.square : logo.landscape, top: square ? 62 : 40, left: margin }];

  const pillText = `TALK ${idx + 1}/${kit.speakers.length}`;
  const pill = await textImg(pillText, { family: 'Inter ExtraBold', size: square ? 26 : 20, color: '#ffffff', maxWidth: 300, letterSpacing: 1.4 });
  const pillH = square ? 60 : 48;
  const pillW = pill.info.width + (square ? 76 : 56);
  const pillY = square ? 74 : 44;
  layers.push({ input: pillBg(pillW, pillH), top: pillY, left: W - margin - pillW });
  layers.push({ input: pill.data, top: pillY + Math.round((pillH - pill.info.height) / 2), left: W - margin - pillW + Math.round((pillW - pill.info.width) / 2) });

  if (square) {
    const R = 150;
    const CX = W / 2;
    const CY = 330;
    layers.push({ input: ring(W, H, CX, CY, R + 6, 9), top: 0, left: 0 });
    layers.push({ input: await circlePhoto(speaker, R * 2), top: CY - R, left: CX - R });
    const name = await textImg(speaker.title, { family: 'Inter Black', size: 54, color: C.text, maxWidth: W - margin * 2 });
    let y = CY + R + 36;
    layers.push({ input: name.data, top: y, left: Math.round((W - name.info.width) / 2) });
    y += name.info.height + 12;
    if (speaker.jobTitle) {
      const role = await textImg(speaker.jobTitle, { family: 'Inter', size: 24, color: C.muted, maxWidth: W - margin * 2 - 100, maxHeight: 66, wrap: true, align: 'centre' });
      layers.push({ input: role.data, top: y, left: Math.round((W - role.info.width) / 2) });
      y += role.info.height + 30;
    }
    const label = await textImg(talk.title ? 'TALK' : 'THEMA', { family: 'Inter ExtraBold', size: 19, color: C.blueBright, maxWidth: 160, letterSpacing: 1.8 });
    layers.push({ input: label.data, top: y, left: Math.round((W - label.info.width) / 2) });
    y += label.info.height + 12;
    const talkText = talk.title ?? 'Wird noch bekanntgegeben';
    const talkImg = await textImg(talkText, { family: 'Inter SemiBold', size: 34, color: talk.title ? C.text : C.muted, maxWidth: W - margin * 2 - 60, maxHeight: 150, wrap: true, align: 'centre' });
    layers.push({ input: talkImg.data, top: y, left: Math.round((W - talkImg.info.width) / 2) });
  } else {
    const R = 148;
    const CX = 250;
    const CY = 320;
    const colX = 480;
    const colW = W - colX - margin;
    layers.push({ input: ring(W, H, CX, CY, R + 6, 9), top: 0, left: 0 });
    layers.push({ input: await circlePhoto(speaker, R * 2), top: CY - R, left: CX - R });
    const name = await textImg(speaker.title, { family: 'Inter Black', size: 48, color: C.text, maxWidth: colW, maxHeight: 130, wrap: true });
    let y = 130;
    layers.push({ input: name.data, top: y, left: colX });
    y += name.info.height + 10;
    if (speaker.jobTitle) {
      const role = await textImg(speaker.jobTitle, { family: 'Inter', size: 22, color: C.muted, maxWidth: colW, maxHeight: 60, wrap: true });
      layers.push({ input: role.data, top: y, left: colX });
      y += role.info.height + 22;
    }
    const label = await textImg(talk.title ? 'TALK' : 'THEMA', { family: 'Inter ExtraBold', size: 17, color: C.blueBright, maxWidth: 140, letterSpacing: 1.6 });
    layers.push({ input: label.data, top: y, left: colX });
    y += label.info.height + 8;
    const talkText = talk.title ?? 'Wird noch bekanntgegeben';
    const talkImg = await textImg(talkText, { family: 'Inter SemiBold', size: 27, color: talk.title ? C.text : C.muted, maxWidth: colW, maxHeight: 120, wrap: true });
    layers.push({ input: talkImg.data, top: y, left: colX });
  }

  layers.push(...(await footer(W, H, kit.event, { margin })));
  return sharp(background(W, H)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

const slugs = process.argv.slice(2);
if (slugs.length === 0) {
  console.error('Aufruf: node scripts/generate-event-carousel.mjs <event-slug> [...]');
  process.exit(1);
}

const logo = await loadLogo();
for (const slug of slugs) {
  const kit = await loadEventKit(slug);
  if (kit.speakers.length === 0) {
    console.warn(`⚠️  ${slug}: keine bestätigten Speaker — übersprungen.`);
    continue;
  }
  const outDir = path.join(OUT_BASE, slug);
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });
  for (const fmt of ['instagram', 'linkedin']) {
    let n = 1;
    const write = async (buf) => {
      await fs.writeFile(path.join(outDir, `slide-${n}-${fmt}.png`), buf);
    };
    await write(await lineupSlide(fmt, kit, logo));
    n++;
    for (let i = 0; i < kit.speakers.length; i++) {
      await write(await speakerSlide(fmt, kit, kit.speakers[i], i, logo));
      n++;
    }
    await write(await followSlide(fmt, kit, logo));
  }
  console.log(`✓ ${slug}: ${kit.speakers.length + 2} Slides × 2 Formate → ${path.relative(process.cwd(), outDir)}`);
}
