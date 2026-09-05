#!/usr/bin/env node
/**
 * Themen-Karussell: pro Speaker-TALK eines Events vier Slides.
 *
 * Slide 1: Talk-Titel als Hook (abstrakte Grafik, Variante „orbits“)
 * Slide 2: Worum geht's — Session-Beschreibung/Key Takeaways (Variante „circuit“)
 * Slide 3: Speaker-Vorstellung mit Bild und Bio
 * Slide 4: „Follow AI Nights“-CTA
 *
 * Ausgabe: public/media/topic-carousels/<event-slug>/<speaker-slug>-slide-<n>-{instagram,linkedin}.png
 * Die Dateien tauchen automatisch pro Event auf /tools/ auf.
 *
 * Aufruf:
 *   node scripts/generate-topic-carousels.mjs ai-nights-nuernberg-05 [weitere-slugs]
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  C, FORMATS, PUBLIC, textImg, circlePhoto, background, abstractArt, ring, pillBg,
  footer, loadLogo, loadEventKit, followSlide,
} from './lib/social-kit.mjs';

const OUT_BASE = path.join(PUBLIC, 'media/topic-carousels');

const cityLabel = (kit) => (kit.isWoman ? `AI Woman Nights ${kit.event.city ?? ''}` : `AI Nights ${kit.event.city ?? ''}`).trim();

/** Slide 1 — Hook: großes Talk-Thema auf abstrakter Grafik. */
async function hookSlide(fmt, kit, speaker, talk, logo) {
  const { w: W, h: H } = FORMATS[fmt];
  const square = fmt === 'instagram';
  const margin = square ? 72 : 64;
  const layers = [
    { input: abstractArt(W, H, 'orbits'), top: 0, left: 0 },
    { input: square ? logo.square : logo.landscape, top: square ? 62 : 40, left: margin },
  ];

  const pill = await textImg(`TALK @ ${cityLabel(kit)}`.toUpperCase(), { family: 'Inter ExtraBold', size: square ? 24 : 19, color: '#ffffff', maxWidth: W - margin * 2 - 60, letterSpacing: 1.2 });
  const pillH = square ? 58 : 46;
  const pillW = pill.info.width + (square ? 72 : 56);
  const pillY = square ? 220 : 140;
  layers.push({ input: pillBg(pillW, pillH), top: pillY, left: margin });
  layers.push({ input: pill.data, top: pillY + Math.round((pillH - pill.info.height) / 2), left: margin + Math.round((pillW - pill.info.width) / 2) });

  const title = await textImg(talk.title, {
    family: 'Inter Black', size: square ? 64 : 48, color: C.text,
    maxWidth: W - margin * 2, maxHeight: square ? 420 : 240, wrap: true,
  });
  layers.push({ input: title.data, top: pillY + pillH + (square ? 44 : 28), left: margin });

  const by = await textImg(`mit ${speaker.title}`, { family: 'Inter SemiBold', size: square ? 27 : 22, color: C.muted, maxWidth: W - margin * 2 });
  layers.push({ input: by.data, top: pillY + pillH + (square ? 44 : 28) + title.info.height + (square ? 26 : 16), left: margin });

  layers.push(...(await footer(W, H, kit.event, { margin })));
  return sharp(background(W, H)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

/** Slide 2 — Worum geht's: Beschreibung oder Takeaway-Bullets. */
async function aboutSlide(fmt, kit, speaker, talk, logo) {
  const { w: W, h: H } = FORMATS[fmt];
  const square = fmt === 'instagram';
  const margin = square ? 72 : 64;
  const layers = [
    { input: abstractArt(W, H, 'circuit'), top: 0, left: 0 },
    { input: square ? logo.square : logo.landscape, top: square ? 62 : 40, left: margin },
  ];

  const label = await textImg("WORUM GEHT'S?", { family: 'Inter ExtraBold', size: square ? 22 : 18, color: C.blueBright, maxWidth: 340, letterSpacing: 2 });
  const labelY = square ? 210 : 128;
  layers.push({ input: label.data, top: labelY, left: margin });

  let y = labelY + label.info.height + (square ? 22 : 14);
  const takeaways = (speaker.keyTakeaways ?? []).slice(0, 3);
  if (takeaways.length >= 2) {
    for (const t of takeaways) {
      const dot = Buffer.from(`<svg width="16" height="16"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${C.blue}"/><stop offset="100%" stop-color="${C.magenta}"/></linearGradient></defs><rect width="16" height="16" rx="5" fill="url(#g)"/></svg>`);
      const item = await textImg(t, { family: 'Inter SemiBold', size: square ? 30 : 24, color: C.text, maxWidth: W - margin * 2 - 56, maxHeight: square ? 130 : 100, wrap: true });
      layers.push({ input: dot, top: y + (square ? 10 : 7), left: margin });
      layers.push({ input: item.data, top: y, left: margin + 40 });
      y += item.info.height + (square ? 34 : 22);
    }
  } else {
    const text = talk.excerpt || speaker.excerpt || talk.title;
    const body = await textImg(text, {
      family: 'Inter', size: square ? 32 : 25, color: C.text,
      maxWidth: W - margin * 2 - (square ? 40 : 260), maxHeight: square ? 520 : 300, wrap: true,
    });
    layers.push({ input: body.data, top: y, left: margin });
  }

  layers.push(...(await footer(W, H, kit.event, { margin })));
  return sharp(background(W, H)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

/** Slide 3 — Speaker-Vorstellung mit Bild und Bio. */
async function speakerBioSlide(fmt, kit, speaker, talk, logo) {
  const { w: W, h: H } = FORMATS[fmt];
  const square = fmt === 'instagram';
  const margin = square ? 72 : 64;
  const layers = [{ input: square ? logo.square : logo.landscape, top: square ? 62 : 40, left: margin }];
  const bio = speaker.excerpt || talk.excerpt || '';

  if (square) {
    const R = 132;
    const CX = W / 2;
    const CY = 300;
    layers.push({ input: ring(W, H, CX, CY, R + 6, 8), top: 0, left: 0 });
    layers.push({ input: await circlePhoto(speaker, R * 2), top: CY - R, left: CX - R });

    const pill = await textImg(kit.isWoman ? 'SPEAKERIN' : 'SPEAKER', { family: 'Inter ExtraBold', size: 22, color: '#ffffff', maxWidth: 260, letterSpacing: 1.8 });
    const pillH = 52;
    const pillW = pill.info.width + 64;
    let y = CY + R + 30;
    layers.push({ input: pillBg(pillW, pillH), top: y, left: Math.round((W - pillW) / 2) });
    layers.push({ input: pill.data, top: y + Math.round((pillH - pill.info.height) / 2), left: Math.round((W - pill.info.width) / 2) });
    y += pillH + 22;

    const name = await textImg(speaker.title, { family: 'Inter Black', size: 52, color: C.text, maxWidth: W - margin * 2 });
    layers.push({ input: name.data, top: y, left: Math.round((W - name.info.width) / 2) });
    y += name.info.height + 10;
    if (speaker.jobTitle) {
      const role = await textImg(speaker.jobTitle, { family: 'Inter SemiBold', size: 24, color: C.magenta, maxWidth: W - margin * 2 - 80, maxHeight: 64, wrap: true, align: 'centre' });
      layers.push({ input: role.data, top: y, left: Math.round((W - role.info.width) / 2) });
      y += role.info.height + 24;
    }
    if (bio) {
      const bioImg = await textImg(bio, { family: 'Inter', size: 25, color: C.muted, maxWidth: W - margin * 2 - 40, maxHeight: 240, wrap: true, align: 'centre' });
      layers.push({ input: bioImg.data, top: y, left: Math.round((W - bioImg.info.width) / 2) });
    }
  } else {
    const R = 150;
    const CX = 252;
    const CY = 316;
    const colX = 480;
    const colW = W - colX - margin;
    layers.push({ input: ring(W, H, CX, CY, R + 6, 9), top: 0, left: 0 });
    layers.push({ input: await circlePhoto(speaker, R * 2), top: CY - R, left: CX - R });

    const pill = await textImg(kit.isWoman ? 'SPEAKERIN' : 'SPEAKER', { family: 'Inter ExtraBold', size: 18, color: '#ffffff', maxWidth: 200, letterSpacing: 1.8 });
    const pillH = 44;
    const pillW = pill.info.width + 52;
    let y = 108;
    layers.push({ input: pillBg(pillW, pillH), top: y, left: colX });
    layers.push({ input: pill.data, top: y + Math.round((pillH - pill.info.height) / 2), left: colX + Math.round((pillW - pill.info.width) / 2) });
    y += pillH + 18;

    const name = await textImg(speaker.title, { family: 'Inter Black', size: 44, color: C.text, maxWidth: colW, maxHeight: 110, wrap: true });
    layers.push({ input: name.data, top: y, left: colX });
    y += name.info.height + 8;
    if (speaker.jobTitle) {
      const role = await textImg(speaker.jobTitle, { family: 'Inter SemiBold', size: 21, color: C.magenta, maxWidth: colW, maxHeight: 56, wrap: true });
      layers.push({ input: role.data, top: y, left: colX });
      y += role.info.height + 16;
    }
    if (bio) {
      const bioImg = await textImg(bio, { family: 'Inter', size: 21, color: C.muted, maxWidth: colW, maxHeight: 190, wrap: true });
      layers.push({ input: bioImg.data, top: y, left: colX });
    }
  }

  layers.push(...(await footer(W, H, kit.event, { margin })));
  return sharp(background(W, H)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}

const slugs = process.argv.slice(2);
if (slugs.length === 0) {
  console.error('Aufruf: node scripts/generate-topic-carousels.mjs <event-slug> [...]');
  process.exit(1);
}

const logo = await loadLogo();
for (const slug of slugs) {
  const kit = await loadEventKit(slug);
  const withTalks = kit.speakers
    .map((s) => ({ speaker: s, talk: kit.talkFor(s) }))
    .filter(({ talk }) => talk.title);
  if (withTalks.length === 0) {
    console.warn(`⚠️  ${slug}: keine Talks mit Titel — übersprungen.`);
    continue;
  }
  const outDir = path.join(OUT_BASE, slug);
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });
  for (const { speaker, talk } of withTalks) {
    for (const fmt of ['instagram', 'linkedin']) {
      const slides = [
        await hookSlide(fmt, kit, speaker, talk, logo),
        await aboutSlide(fmt, kit, speaker, talk, logo),
        await speakerBioSlide(fmt, kit, speaker, talk, logo),
        await followSlide(fmt, kit, logo),
      ];
      for (let i = 0; i < slides.length; i++) {
        await fs.writeFile(path.join(outDir, `${speaker.slug}-slide-${i + 1}-${fmt}.png`), slides[i]);
      }
    }
    console.log(`✓ ${slug} / ${speaker.slug}: 4 Slides × 2 Formate`);
  }
}
