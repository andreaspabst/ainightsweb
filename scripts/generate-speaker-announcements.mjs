import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const speakerDir = path.join(root, 'src/content/speaker');
const sessionDir = path.join(root, 'src/content/sessions');
const publicDir = path.join(root, 'public');
const outputDir = path.join(publicDir, 'media/speaker-announcements');
const logoPath = path.join(publicDir, 'wp-content/uploads/2026/07/AI-Nights-Logo-wAXDN.svg');

const formats = {
  linkedin: { width: 1200, height: 627 },
  instagram: { width: 1080, height: 1080 },
};

const colors = {
  bg: '#0d0c12',
  panel: '#171119',
  ink: '#fff7fb',
  muted: '#cbbdcf',
  pink: '#ef0460',
  violet: '#3b1e99',
  gold: '#f2b544',
};

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function initials(name) {
  return name
    .replace(/[„“"()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function wrapText(text, maxChars, maxLines = 3) {
  const words = String(text ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.join(' ').length > lines.join(' ').length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[,.!?;:]+$/, '')}...`;
  }
  return lines;
}

function tspans(lines, x, y, lineHeight) {
  return lines
    .map((line, index) => `<tspan x="${x}" y="${y + index * lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');
}

function cleanTalkTitle(title, speaker) {
  const cleaned = String(title ?? '')
    .replace(/^\s*\d{1,2}[:.]\d{2}\s*(?:-|–|—)\s*\d{1,2}[:.]\d{2}\s*(?:uhr)?\s*(?:\(.*?\))?\s*(?:\||-|–|—)\s*/i, '')
    .replace(/^\s*\([^)]*(?:diskussionsrunde|pause|inkl\.)[^)]*\)\s*/i, '')
    .replace(/^#?\d+\s*session$/i, '')
    .replace(/^\d{1,2}[:.]\d{2}\s*(?:uhr)?\s*/i, '')
    .trim();
  return cleaned || speaker.topics?.[0] || speaker.excerpt || 'Speaker bei den AI Nights';
}

async function readJsonFiles(dir) {
  const files = (await fs.readdir(dir)).filter((file) => file.endsWith('.json'));
  return Promise.all(
    files.map(async (file) => ({
      file,
      data: JSON.parse(await fs.readFile(path.join(dir, file), 'utf8')),
    })),
  );
}

function isPlaceholderSpeaker(speaker) {
  return /^ai-nights-speaker-/i.test(speaker.slug) || /^AI Nights Speaker #/i.test(speaker.title);
}

function pickTalk(speaker, sessions) {
  const matches = sessions
    .filter(({ data }) => data.speakerSlugs?.includes(speaker.slug) || (speaker.id && data.speakerIds?.includes(speaker.id)))
    .filter(({ data }) => !/pause|break|welcome|kickoff/i.test(data.title));

  const specific = matches.filter(({ data }) => !/^#?\d+\s*session$/i.test(data.title));
  const pool = specific.length ? specific : matches;
  const sorted = [...pool].sort((a, b) => new Date(b.data.date ?? 0).getTime() - new Date(a.data.date ?? 0).getTime());
  return sorted[0]?.data;
}

async function makeAvatar(speaker, size) {
  if (speaker.image?.src) {
    const srcPath = path.join(publicDir, speaker.image.src.replace(/^\//, ''));
    try {
      const mask = Buffer.from(
        `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
      );
      return sharp(srcPath)
        .resize(size, size, { fit: 'cover' })
        .composite([{ input: mask, blend: 'dest-in' }])
        .png()
        .toBuffer();
    } catch {}
  }

  return sharp(
    Buffer.from(`
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${colors.pink}"/>
        <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
          font-family="Space Grotesk, Inter, Arial, sans-serif" font-size="${Math.round(size * 0.28)}"
          font-weight="900" fill="#fff">${escapeXml(initials(speaker.title))}</text>
      </svg>
    `),
  )
    .png()
    .toBuffer();
}

async function makeAnnouncement({ speaker, talkTitle, format }) {
  const { width, height } = formats[format];
  const isSquare = width === height;
  const avatarSize = isSquare ? 230 : 250;
  const avatarLeft = isSquare ? 92 : 86;
  const avatarTop = isSquare ? 704 : 210;
  const copyLeft = isSquare ? 92 : 390;
  const copyTop = isSquare ? 178 : 136;
  const talkY = isSquare ? 430 : 475;
  const nameY = isSquare ? 746 : 318;
  const logoWidth = isSquare ? 260 : 245;
  const nameFont = speaker.title.length > 42 ? (isSquare ? 35 : 32) : (isSquare ? 48 : 42);
  const nameLineHeight = Math.round(nameFont * 1.12);

  const speakerLines = wrapText(speaker.title, isSquare ? 25 : 22, isSquare ? 3 : 2);
  const roleY = nameY + speakerLines.length * nameLineHeight + (isSquare ? 24 : 13);
  const roleLines = wrapText(speaker.jobTitle ?? 'Speaker bei den AI Nights', isSquare ? 34 : 44, 2);
  const talkLines = wrapText(talkTitle, isSquare ? 34 : 46, isSquare ? 3 : 2);

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${colors.bg}"/>
      <path d="M0 0H${Math.round(width * 0.42)}V${height}H0Z" fill="${colors.panel}"/>
      <rect x="${Math.round(width * 0.66)}" y="-80" width="${Math.round(width * 0.24)}" height="${height + 160}" fill="${colors.violet}" transform="rotate(14 ${Math.round(width * 0.78)} ${height / 2})"/>
      <rect x="${isSquare ? 686 : 790}" y="${isSquare ? 118 : 72}" width="${isSquare ? 270 : 250}" height="${isSquare ? 178 : 162}" rx="4" fill="${colors.gold}"/>
      <text x="${isSquare ? 720 : 820}" y="${isSquare ? 184 : 132}" font-family="Inter, Arial, sans-serif" font-size="${isSquare ? 25 : 22}"
        font-weight="900" letter-spacing="2" fill="#171119">SPEAKER</text>
      <text x="${isSquare ? 720 : 820}" y="${isSquare ? 238 : 182}" font-family="Space Grotesk, Inter, Arial, sans-serif" font-size="${isSquare ? 54 : 46}"
        font-weight="900" fill="#171119">2027</text>
      <text x="${isSquare ? 640 : 760}" y="${isSquare ? 274 : 228}" text-anchor="middle"
        font-family="Space Grotesk, Inter, Arial, sans-serif" font-size="${isSquare ? 230 : 178}"
        font-weight="900" fill="rgba(255,247,251,.08)">AI</text>
      <text x="${isSquare ? 760 : 908}" y="${isSquare ? 980 : 592}" text-anchor="middle"
        font-family="Space Grotesk, Inter, Arial, sans-serif" font-size="${isSquare ? 190 : 118}"
        font-weight="900" fill="rgba(239,4,96,.22)">NIGHTS</text>

      <text x="${copyLeft}" y="${copyTop}" font-family="Inter, Arial, sans-serif" font-size="${isSquare ? 31 : 28}"
        font-weight="900" letter-spacing="2.5" fill="${colors.gold}">I AM SPEAKER AT</text>
      <text x="${copyLeft}" y="${copyTop + (isSquare ? 90 : 82)}" font-family="Space Grotesk, Inter, Arial, sans-serif"
        font-size="${isSquare ? 92 : 76}" font-weight="900" fill="${colors.ink}">AI NIGHTS</text>
      <rect x="${copyLeft}" y="${copyTop + (isSquare ? 116 : 104)}" width="${isSquare ? 315 : 292}" height="16" fill="${colors.pink}"/>

      <text font-family="Inter, Arial, sans-serif" font-size="${isSquare ? 37 : 31}" font-weight="850" fill="${colors.ink}">
        ${tspans(talkLines, copyLeft, talkY, isSquare ? 46 : 39)}
      </text>
      <text x="${copyLeft}" y="${talkY - (isSquare ? 52 : 36)}" font-family="Inter, Arial, sans-serif" font-size="20"
        font-weight="900" letter-spacing="2" fill="${colors.pink}">TALK</text>

      <circle cx="${avatarLeft + avatarSize / 2 + 14}" cy="${avatarTop + avatarSize / 2 + 14}" r="${avatarSize / 2}" fill="${colors.pink}"/>
      <circle cx="${avatarLeft + avatarSize / 2}" cy="${avatarTop + avatarSize / 2}" r="${avatarSize / 2 + 7}" fill="${colors.gold}"/>

      <text font-family="Space Grotesk, Inter, Arial, sans-serif" font-size="${nameFont}" font-weight="900" fill="${colors.ink}">
        ${tspans(speakerLines, isSquare ? 360 : 390, nameY, nameLineHeight)}
      </text>
      <text font-family="Inter, Arial, sans-serif" font-size="${isSquare ? 24 : 21}" font-weight="650" fill="${colors.muted}">
        ${tspans(roleLines, isSquare ? 360 : 390, roleY, isSquare ? 31 : 27)}
      </text>

      <text x="${isSquare ? 92 : 86}" y="${height - 58}" font-family="Inter, Arial, sans-serif" font-size="${isSquare ? 22 : 18}"
        font-weight="900" letter-spacing="2.2" fill="${colors.muted}">AINIGHTS.AI</text>
    </svg>
  `;

  const avatar = await makeAvatar(speaker, avatarSize);
  const logo = await sharp(logoPath).resize({ width: logoWidth }).png().toBuffer();

  return sharp(Buffer.from(svg))
    .composite([
      { input: avatar, left: avatarLeft, top: avatarTop },
      { input: logo, left: width - logoWidth - (isSquare ? 92 : 86), top: height - (isSquare ? 98 : 82) },
    ])
    .png()
    .toBuffer();
}

await fs.mkdir(outputDir, { recursive: true });

const speakers = await readJsonFiles(speakerDir);
const sessions = await readJsonFiles(sessionDir);
let count = 0;

for (const { data: speaker } of speakers) {
  if (isPlaceholderSpeaker(speaker)) continue;

  const talk = pickTalk(speaker, sessions);
  const talkTitle = cleanTalkTitle(talk?.title, speaker);

  for (const format of Object.keys(formats)) {
    const image = await makeAnnouncement({ speaker, talkTitle, format });
    const target = path.join(outputDir, `${speaker.slug}-${format}.png`);
    await fs.writeFile(target, image);
    count += 1;
  }
}

console.log(`Generated ${count} speaker announcement images in ${path.relative(root, outputDir)}`);
