/**
 * Gemeinsame Design-Bausteine für die Social-Media-Generatoren
 * (Karussells, #speakerintro-Karten). Gleiche Optik wie
 * scripts/generate-speaker-announcements.mjs — Farbwelt, Fonts,
 * Hintergrund, Ring, Pill, Footer — hier einmal zentral, damit die
 * Karussell-Skripte nicht jede Zutat erneut definieren.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const ROOT = process.cwd();
export const PUBLIC = path.join(ROOT, 'public');
const LOGO = path.join(PUBLIC, 'wp-content/uploads/2026/07/AI-Nights-Logo-wAXDN.svg');
const FONT_DIR = path.join(ROOT, 'scripts/fonts');

const FONT_FILES = {
  'Inter': 'Inter-Regular.ttf',
  'Inter SemiBold': 'Inter-SemiBold.ttf',
  'Inter ExtraBold': 'Inter-ExtraBold.ttf',
  'Inter Black': 'Inter-Black.ttf',
};
const fontFile = (family) => {
  const file = FONT_FILES[family];
  if (!file) throw new Error(`Keine Schriftdatei für „${family}" hinterlegt (scripts/fonts/)`);
  return path.join(FONT_DIR, file);
};

export const C = {
  bg0: '#0f0122',
  bg1: '#1b0838',
  magenta: '#ff2d7a',
  magentaDeep: '#dc2777',
  blue: '#326bff',
  blueBright: '#2ea3f2',
  violet: '#8b2fd8',
  text: '#f7f4fb',
  muted: '#b7addd',
};

export const FORMATS = {
  instagram: { w: 1080, h: 1080 },
  linkedin: { w: 1200, h: 627 },
  portrait: { w: 1080, h: 1350 },
};

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Text als transparentes PNG; verkleinert die Schrift, bis er in den Platz passt. */
export async function textImg(text, { family, size, color, maxWidth, maxHeight, letterSpacing = 0, wrap = false, align = 'left', minSize = 13, lineSpacing }) {
  let px = size;
  for (;;) {
    const spacing = letterSpacing ? ` letter_spacing="${Math.round(letterSpacing * 1024)}"` : '';
    const rise = lineSpacing ? ` line_height="${lineSpacing}"` : '';
    const markup = `<span foreground="${color}"${spacing}${rise}>${esc(text)}</span>`;
    const { data, info } = await sharp({
      text: {
        text: markup,
        font: `${family} ${px}`,
        fontfile: fontFile(family),
        rgba: true,
        dpi: 72,
        align,
        width: wrap ? maxWidth : maxWidth * 4,
      },
    })
      .png()
      .toBuffer({ resolveWithObject: true });
    const fits = info.width <= maxWidth && (!maxHeight || info.height <= maxHeight);
    if (fits || px <= minSize) return { data, info };
    px -= 2;
  }
}

/** Rundes Portrait; ohne Foto ein Kreis mit Initialen im Verlaufs-Look. */
export async function circlePhoto(speaker, size) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  const src = speaker.image?.src ? path.join(PUBLIC, speaker.image.src) : null;
  if (src) {
    try {
      return await sharp(src)
        .resize(size, size, { fit: 'cover', position: 'attention' })
        .composite([{ input: mask, blend: 'dest-in' }])
        .png()
        .toBuffer();
    } catch {
      console.warn(`⚠️  Foto nicht lesbar: ${speaker.slug}`);
    }
  }
  const initials = speaker.title
    .replace(/[„“"()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const disc = sharp(
    Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${C.blue}"/><stop offset="100%" stop-color="${C.magenta}"/>
      </linearGradient></defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#a)" opacity=".85"/>
    </svg>`),
  );
  const label = await textImg(initials, {
    family: 'Inter Black',
    size: Math.round(size * 0.34),
    color: '#ffffff',
    maxWidth: Math.round(size * 0.8),
  });
  return disc
    .composite([
      { input: label.data, top: Math.round((size - label.info.height) / 2), left: Math.round((size - label.info.width) / 2) },
    ])
    .png()
    .toBuffer();
}

/** Dunkler Verlaufs-Hintergrund mit Grid, Glows und Akzentkante oben. */
export function background(w, h) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.bg1}"/><stop offset="55%" stop-color="${C.bg0}"/><stop offset="100%" stop-color="#12002b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.blue}"/><stop offset="55%" stop-color="${C.violet}"/><stop offset="100%" stop-color="${C.magenta}"/>
    </linearGradient>
    <radialGradient id="glowA" cx="50%" cy="50%">
      <stop offset="0%" stop-color="${C.magenta}" stop-opacity=".38"/><stop offset="100%" stop-color="${C.magenta}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="50%" cy="50%">
      <stop offset="0%" stop-color="${C.blue}" stop-opacity=".34"/><stop offset="100%" stop-color="${C.blue}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="45" height="45" patternUnits="userSpaceOnUse">
      <path d="M45 0 L0 0 0 45" fill="none" stroke="#ffffff" stroke-opacity=".045" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  <circle cx="${Math.round(w * 0.12)}" cy="${Math.round(h * 0.82)}" r="${Math.round(h * 0.36)}" fill="url(#glowA)"/>
  <circle cx="${Math.round(w * 0.87)}" cy="${Math.round(h * 0.2)}" r="${Math.round(h * 0.34)}" fill="url(#glowB)"/>
  <rect x="0" y="0" width="${w}" height="8" fill="url(#accent)"/>
</svg>`);
}

/**
 * Abstrakte Deko im Farbschema für die Themen-Karussells. Zwei Varianten,
 * damit sich die Slides abwechseln: 'orbits' (Ringe + Punkte) und
 * 'circuit' (Knoten-Linien wie eine Schaltung).
 */
export function abstractArt(w, h, variant = 'orbits') {
  const defs = `<defs>
    <linearGradient id="aa" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.blue}"/><stop offset="100%" stop-color="${C.magenta}"/>
    </linearGradient>
    <linearGradient id="ab" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.magenta}"/><stop offset="100%" stop-color="${C.violet}"/>
    </linearGradient>
  </defs>`;
  if (variant === 'circuit') {
    const nodes = [
      [0.72, 0.18], [0.88, 0.3], [0.8, 0.5], [0.92, 0.66], [0.7, 0.78], [0.6, 0.34],
    ].map(([x, y]) => [Math.round(w * x), Math.round(h * y)]);
    const lines = nodes
      .map((p, i) => {
        const q = nodes[(i + 1) % nodes.length];
        return `<path d="M${p[0]} ${p[1]} L${q[0]} ${p[1]} L${q[0]} ${q[1]}" fill="none" stroke="url(#aa)" stroke-opacity=".5" stroke-width="2"/>`;
      })
      .join('');
    const dots = nodes
      .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${7 + (i % 3) * 3}" fill="${i % 2 ? C.magenta : C.blueBright}" fill-opacity=".9"/>
        <circle cx="${x}" cy="${y}" r="${16 + (i % 3) * 3}" fill="none" stroke="url(#ab)" stroke-opacity=".45" stroke-width="1.5"/>`)
      .join('');
    return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${defs}${lines}${dots}</svg>`);
  }
  const cx = Math.round(w * 0.82);
  const cy = Math.round(h * 0.3);
  const rings = [0.34, 0.25, 0.165]
    .map((f, i) => `<circle cx="${cx}" cy="${cy}" r="${Math.round(h * f)}" fill="none" stroke="url(#${i % 2 ? 'ab' : 'aa'})" stroke-opacity="${0.55 - i * 0.12}" stroke-width="${2 + i}"/>`)
    .join('');
  const dots = [
    [cx - h * 0.34, cy, C.magenta], [cx + h * 0.25, cy, C.blueBright], [cx, cy - h * 0.165, C.violet],
  ]
    .map(([x, y, col]) => `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="9" fill="${col}"/>`)
    .join('');
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${defs}${rings}${dots}
    <path d="M${Math.round(w * 0.05)} ${Math.round(h * 0.88)} h${Math.round(w * 0.22)}" stroke="url(#aa)" stroke-width="3" stroke-linecap="round" stroke-opacity=".7"/>
    <circle cx="${Math.round(w * 0.05 + w * 0.22)}" cy="${Math.round(h * 0.88)}" r="7" fill="${C.magenta}"/>
  </svg>`);
}


/**
 * Thematisches Deko-Motiv für die Hook-Slide der Themen-Karussells:
 * wählt anhand des Talk-Titels eine passende abstrakte Grafik im
 * Farbschema (Fallback: 'orbits' aus abstractArt).
 */
export function topicMotif(w, h, title = '') {
  const t = String(title).toLowerCase();
  const g = `<defs>
    <linearGradient id="ma" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.blue}"/><stop offset="100%" stop-color="${C.magenta}"/>
    </linearGradient>
    <linearGradient id="mb" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.magenta}"/><stop offset="100%" stop-color="${C.violet}"/>
    </linearGradient>
  </defs>`;
  const X = (f) => Math.round(w * f);
  const Y = (f) => Math.round(h * f);
  const wrap = (inner) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${g}${inner}</svg>`);

  // Testing / Code-Qualität: Pipeline-Knoten mit Haken
  if (/test|qualit|code|coding|develop|slop|deploy|software/.test(t)) {
    const ys = [0.56, 0.68, 0.8];
    const nodes = ys.map((f, i) => {
      const x = X(0.66 + i * 0.12);
      const y = Y(f);
      return `<circle cx="${x}" cy="${y}" r="26" fill="none" stroke="url(#ma)" stroke-width="3"/>
        <path d="M${x - 10} ${y} l7 8 l14 -16" fill="none" stroke="${C.blueBright}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
        (i < ys.length - 1 ? `<path d="M${x} ${y + 26} L${x} ${Y(ys[i + 1]) - 26} L${X(0.66 + (i + 1) * 0.12)} ${Y(ys[i + 1]) - 26}" fill="none" stroke="url(#mb)" stroke-opacity=".6" stroke-width="2"/>` : '');
    }).join('');
    return wrap(`${nodes}<path d="M${X(0.62)} ${Y(0.92)} h${X(0.28)}" stroke="url(#ma)" stroke-width="3" stroke-linecap="round" stroke-opacity=".7"/>
      <circle cx="${X(0.9)}" cy="${Y(0.92)}" r="7" fill="${C.magenta}"/>`);
  }
  // Marketing / Produkt / Wachstum: Balken + Pfeil
  if (/marketing|produkt|format|wachs|kunden|brand|medien/.test(t)) {
    const bars = [0.16, 0.24, 0.34].map((bh, i) => {
      const x = X(0.64 + i * 0.09);
      return `<rect x="${x}" y="${Y(0.88) - Y(bh)}" width="${X(0.05)}" height="${Y(bh)}" rx="8" fill="url(#${i % 2 ? 'mb' : 'ma'})" fill-opacity="${0.75 + i * 0.1}"/>`;
    }).join('');
    return wrap(`${bars}<path d="M${X(0.63)} ${Y(0.6)} L${X(0.82)} ${Y(0.46)} l-1 8 m1 -8 l-8 1" fill="none" stroke="${C.blueBright}" stroke-width="4" stroke-linecap="round"/>`);
  }
  // Sicherheit / Infrastruktur / Netz: Schild + Netzknoten
  if (/sicher|angriff|schutz|infrastruktur|netz|strom|wasser|krit/.test(t)) {
    const cx = X(0.78);
    const cy = Y(0.68);
    return wrap(`<path d="M${cx} ${cy - 80} l64 24 v56 c0 48 -40 76 -64 84 c-24 -8 -64 -36 -64 -84 v-56 z" fill="none" stroke="url(#ma)" stroke-width="4"/>
      <path d="M${cx - 22} ${cy + 4} l16 18 l30 -36" fill="none" stroke="${C.blueBright}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${cx - 110}" cy="${cy + 130}" r="8" fill="${C.magenta}"/><circle cx="${cx + 104}" cy="${cy + 118}" r="6" fill="${C.blueBright}"/>
      <path d="M${cx - 110} ${cy + 130} L${cx - 40} ${cy + 96} M${cx + 104} ${cy + 118} L${cx + 44} ${cy + 92}" stroke="url(#mb)" stroke-opacity=".55" stroke-width="2"/>`);
  }
  // Nachhaltigkeit: Blatt-Bögen
  if (/nachhalt|klima|umwelt|green|energie/.test(t)) {
    const cx = X(0.78);
    const cy = Y(0.68);
    return wrap(`<path d="M${cx} ${cy + 90} C ${cx - 90} ${cy + 10} ${cx - 40} ${cy - 90} ${cx + 60} ${cy - 90} C ${cx + 60} ${cy + 10} ${cx + 40} ${cy + 70} ${cx} ${cy + 90} z" fill="none" stroke="url(#ma)" stroke-width="4"/>
      <path d="M${cx} ${cy + 88} C ${cx + 8} ${cy + 20} ${cx + 24} ${cy - 30} ${cx + 52} ${cy - 76}" fill="none" stroke="url(#mb)" stroke-opacity=".7" stroke-width="2.5"/>
      <circle cx="${cx - 96}" cy="${cy + 96}" r="7" fill="${C.magenta}"/><circle cx="${cx + 84}" cy="${cy + 108}" r="5" fill="${C.blueBright}"/>`);
  }
  // Spiele / Gamification: Play-Kacheln + Würfelpunkte
  if (/spiel|game|gamif/.test(t)) {
    const bx = X(0.66);
    const by = Y(0.56);
    return wrap(`<rect x="${bx}" y="${by}" width="120" height="120" rx="22" fill="none" stroke="url(#ma)" stroke-width="4"/>
      <path d="M${bx + 46} ${by + 36} l40 24 l-40 24 z" fill="${C.magenta}"/>
      <rect x="${bx + 90}" y="${by + 150}" width="104" height="104" rx="20" fill="none" stroke="url(#mb)" stroke-width="3"/>
      ${[[26, 26], [52, 52], [78, 78]].map(([dx, dy]) => `<circle cx="${bx + 90 + dx}" cy="${by + 150 + dy}" r="8" fill="${C.blueBright}"/>`).join('')}`);
  }
  // KI-Agenten / Demos: verbundene Bot-Knoten
  if (/agent|coworker|demo|assist|llm|modell/.test(t)) {
    const nodes = [[0.68, 0.56, 30], [0.86, 0.66, 22], [0.72, 0.8, 18], [0.9, 0.86, 14]].map(([fx, fy, r]) =>
      `<circle cx="${X(fx)}" cy="${Y(fy)}" r="${r}" fill="none" stroke="url(#ma)" stroke-width="3"/>
       <circle cx="${X(fx)}" cy="${Y(fy)}" r="${Math.round(r / 3)}" fill="${C.magenta}"/>`).join('');
    return wrap(`${nodes}<path d="M${X(0.68)} ${Y(0.56)} L${X(0.86)} ${Y(0.66)} L${X(0.72)} ${Y(0.8)} L${X(0.9)} ${Y(0.86)}" fill="none" stroke="url(#mb)" stroke-opacity=".55" stroke-width="2"/>`);
  }
  // Fairness / Bias: Waage-Balken
  if (/fair|bias|ethik|verantwort/.test(t)) {
    const cx = X(0.78);
    const cy = Y(0.62);
    return wrap(`<path d="M${cx} ${cy - 60} v190 M${cx - 110} ${cy} h220" stroke="url(#ma)" stroke-width="4" stroke-linecap="round"/>
      <path d="M${cx - 110} ${cy} l-34 74 h68 z M${cx + 110} ${cy} l-34 74 h68 z" fill="none" stroke="url(#mb)" stroke-width="3"/>
      <circle cx="${cx}" cy="${cy - 66}" r="9" fill="${C.magenta}"/>`);
  }
  return abstractArt(w, h, 'orbits');
}

export function ring(w, h, cx, cy, r, width) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.blue}"/><stop offset="50%" stop-color="${C.violet}"/><stop offset="100%" stop-color="${C.magenta}"/>
  </linearGradient></defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#ring)" stroke-width="${width}"/>
</svg>`);
}

export function pillBg(w, h, solid = false) {
  const fill = solid
    ? `fill="${C.magenta}"`
    : 'fill="url(#p)"';
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${C.blue}"/><stop offset="100%" stop-color="${C.magenta}"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" rx="${h / 2}" ${fill}/>
</svg>`);
}

/** Rechteckiger Farbblock (für die #speakerintro-Texthintergründe). */
export function solidRect(w, h, color = C.magentaDeep) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" fill="${color}"/></svg>`);
}

export function divider(w, h, x, y, len) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="d" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${C.blue}" stop-opacity=".85"/><stop offset="100%" stop-color="${C.magenta}" stop-opacity=".85"/>
  </linearGradient></defs>
  <rect x="${x}" y="${y}" width="${len}" height="2" fill="url(#d)"/>
</svg>`);
}

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
export const fmtDate = (iso) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** Standard-Fußzeile: Datum · Stadt | ainights.ai | #AINIGHTS. Gibt Layer zurück. */
export async function footer(W, H, event, { margin = 72, lineY } = {}) {
  const layers = [];
  const y = lineY ?? H - 122;
  layers.push({ input: divider(W, H, margin, y, W - margin * 2), top: 0, left: 0 });
  const footY = y + (H > 900 ? 32 : 26);
  const size = H > 900 ? 20 : 19;
  const left = (event?.eventDate ? `${fmtDate(event.eventDate)} · ${event.city ?? ''}`.replace(/ ·\s*$/, '') : 'AI Nights · KI zum Anfassen').toUpperCase();
  const l = await textImg(left, { family: 'Inter ExtraBold', size, color: C.muted, maxWidth: 380, letterSpacing: 0.8 });
  const m = await textImg('ainights.ai', { family: 'Inter SemiBold', size, color: C.text, maxWidth: 200 });
  const r = await textImg('#AINIGHTS', { family: 'Inter ExtraBold', size, color: C.magenta, maxWidth: 200, letterSpacing: 0.8 });
  layers.push({ input: l.data, top: footY, left: margin });
  layers.push({ input: m.data, top: footY, left: Math.round((W - m.info.width) / 2) });
  layers.push({ input: r.data, top: footY, left: W - margin - r.info.width });
  return layers;
}

export async function loadLogo() {
  const svg = await fs.readFile(LOGO);
  const at = async (width) => sharp(svg, { density: 600 }).resize({ width }).png().toBuffer();
  return { square: await at(330), landscape: await at(270), big: await at(560), portrait: await at(430) };
}

export async function readJsonDir(dir) {
  const files = await fs.readdir(dir);
  return Promise.all(
    files.filter((f) => f.endsWith('.json')).map(async (f) => JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'))),
  );
}

/** Talk-Titel ohne Zeitfenster-Präfix („18:00 - 18:45 | …“). */
export function cleanTalkTitle(title) {
  if (!title) return null;
  const t = String(title)
    .replace(/^\s*\d{1,2}[:.]\d{2}\s*[–-]\s*\d{1,2}[:.]\d{2}\s*(\||·|-)?\s*/, '')
    .replace(/^\(inkl\.[^)]*\)\s*(\||:)?\s*/i, '')
    .replace(/^Uhr\s*/i, '')
    .trim();
  return t || null;
}

/** Lädt Event + bestätigte Speaker (ohne Platzhalter) + deren Talks im Event. */
export async function loadEventKit(eventSlug) {
  const events = await readJsonDir(path.join(ROOT, 'src/content/events'));
  const event = events.find((e) => e.slug === eventSlug);
  if (!event) throw new Error(`Event nicht gefunden: ${eventSlug}`);
  const allSpeakers = await readJsonDir(path.join(ROOT, 'src/content/speaker'));
  const sessions = await readJsonDir(path.join(ROOT, 'src/content/sessions'));
  const byId = new Map(allSpeakers.map((s) => [s.id, s]));
  const speakers = (event.speakerIds ?? [])
    .map((id) => byId.get(id))
    .filter((s) => s && !s.slug.startsWith('ai-nights-speaker'));
  const eventSessions = (event.sessionIds ?? [])
    .map((id) => sessions.find((se) => se.id === id))
    .filter(Boolean);
  const talkFor = (speaker) => {
    const s = eventSessions.find(
      (se) => se.speakerSlugs?.includes(speaker.slug) || (speaker.id && se.speakerIds?.includes(speaker.id)),
    ) ?? sessions.find(
      (se) => se.speakerSlugs?.includes(speaker.slug) || (speaker.id && se.speakerIds?.includes(speaker.id)),
    );
    // Key-Visual nur aus dem dedizierten Ordner (aus Airtable übernommen) —
    // alte WP-Sessions tragen sonst das Speaker-Portrait als Session-Bild.
    const kv = s?.image?.src?.startsWith('/media/key-visuals/') ? s.image.src : null;
    return s
      ? { title: cleanTalkTitle(s.title), excerpt: s.excerpt ?? null, keyVisual: kv }
      : { title: null, excerpt: null, keyVisual: null };
  };
  return { event, speakers, talkFor, isWoman: eventSlug.startsWith('ai-woman-nights') };
}

/** Event-Titel in zwei Zeilen: Reihe („AI Nights Nürnberg“) und Ausgabe („#05 - Autumn!“). */
export function splitEventTitle(event) {
  const raw = String(event.title ?? '');
  const [series, rest] = raw.split('|').map((s) => s.trim());
  if (rest) {
    const m = rest.match(/#\d.*$/);
    return { series, edition: (m ? m[0] : rest).trim() };
  }
  const m = raw.match(/#\d.*$/);
  return { series: m ? raw.slice(0, m.index).replace(/[-–]\s*$/, '').trim() : raw, edition: m ? m[0].trim() : '' };
}

/** Letzte Slide — Follow-CTA. */
export async function followSlide(fmt, kit, logo) {
  const { w: W, h: H } = FORMATS[fmt];
  const square = fmt === 'instagram';
  const margin = square ? 72 : 64;
  const layers = [];

  const logoImg = square ? logo.big : logo.portrait;
  const logoMeta = await sharp(logoImg).metadata();
  const logoY = square ? 300 : 150;
  layers.push({ input: logoImg, top: logoY, left: Math.round((W - logoMeta.width) / 2) });

  let y = logoY + logoMeta.height + (square ? 60 : 40);
  if (kit.isWoman) {
    const w1 = await textImg('AI WOMAN NIGHTS', { family: 'Inter ExtraBold', size: square ? 24 : 20, color: '#ffffff', maxWidth: 420, letterSpacing: 2 });
    const wPillW = w1.info.width + 64;
    const wPillH = square ? 54 : 46;
    layers.push({ input: pillBg(wPillW, wPillH, true), top: y - (square ? 36 : 24), left: Math.round((W - wPillW) / 2) });
    layers.push({ input: w1.data, top: y - (square ? 36 : 24) + Math.round((wPillH - w1.info.height) / 2), left: Math.round((W - w1.info.width) / 2) });
    y += square ? 44 : 40;
  }

  const head = await textImg('Follow AI Nights', { family: 'Inter Black', size: square ? 72 : 54, color: C.text, maxWidth: W - margin * 2 });
  layers.push({ input: head.data, top: y, left: Math.round((W - head.info.width) / 2) });
  y += head.info.height + (square ? 22 : 14);

  const sub = await textImg('Talks, Line-ups & Tickets zuerst — auf Instagram und LinkedIn', {
    family: 'Inter', size: square ? 28 : 22, color: C.muted, maxWidth: W - margin * 2 - 120, wrap: true, align: 'centre',
  });
  layers.push({ input: sub.data, top: y, left: Math.round((W - sub.info.width) / 2) });
  y += sub.info.height + (square ? 46 : 28);

  const handle = await textImg('@AINIGHTS.AI', { family: 'Inter ExtraBold', size: square ? 30 : 24, color: '#ffffff', maxWidth: 460, letterSpacing: 1.6 });
  const hPillW = handle.info.width + (square ? 92 : 72);
  const hPillH = square ? 76 : 60;
  layers.push({ input: pillBg(hPillW, hPillH), top: y, left: Math.round((W - hPillW) / 2) });
  layers.push({ input: handle.data, top: y + Math.round((hPillH - handle.info.height) / 2), left: Math.round((W - handle.info.width) / 2) });

  layers.push(...(await footer(W, H, kit.event, { margin })));
  return sharp(background(W, H)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}
