/**
 * Redaktionelle Inhalte für /events/<slug>/presentation/.
 * Quellen und Herkunft der unveränderten Logos: public/media/presentation/SOURCES.md.
 * Titel, Stadt, Datum und Location kommen aus dem jeweiligen Event.
 */
export type PresentationVideo =
  | { kind: 'youtube'; id: string }
  | { kind: 'file'; src: string };

export interface PresentationOptions {
  greetingVideo: PresentationVideo | null;
  toilets: string;
}

// Fallback, falls für ein Event (noch) keine Videobotschaft hinterlegt ist:
// lokale Videodatei während der Präsentation auswählen (siehe eventOverrides).
const defaults: PresentationOptions = {
  greetingVideo: null,
  toilets: 'Durch die Glastür raus, dann links neben den Aufzügen.',
};

// Bei abweichenden Räumen oder Videobotschaften pro Event ergänzen.
const eventOverrides: Record<string, Partial<PresentationOptions>> = {
  'ai-nights-nuernberg-05': {
    greetingVideo: { kind: 'youtube', id: 'A5HuYFfkCcM' },
  },
};

export function getPresentationOptions(slug: string): PresentationOptions {
  return { ...defaults, ...eventOverrides[slug] };
}

export const presentationFormats = [
  {
    name: 'AI Nights',
    logo: '/wp-content/uploads/2026/01/Logo_Partcolor_w.svg',
    label: 'Das AI Afterwork',
    description: 'Talks, Live-Demos und Austausch mit deiner lokalen AI-Community.',
    href: 'https://ainights.ai/de/tickets/',
  },
  {
    name: 'AI Woman Nights',
    logo: '/wp-content/uploads/2026/09/AI-Woman-Nights-Logo-w.svg',
    label: 'Frauen in der KI',
    description: 'Perspektiven, Vorbilder und Vernetzung für Frauen in der KI-Community.',
    href: 'https://ainights.ai/events/ai-woman-nights-01/',
  },
  {
    name: 'Agents im Weggla',
    logo: '/media/presentation/agents-im-weggla.svg',
    label: 'Agentic Coding in Nürnberg',
    description: 'Meetups und Konferenz für alle, die mit Coding-Agents arbeiten.',
    href: 'https://agentsimweggla.de/',
  },
  {
    name: 'AXDN',
    logo: '/media/presentation/axdn.svg',
    label: 'THE AI CONFERENCE',
    description: 'Ein ganzer Tag für KI in Unternehmen. Am 22. April 2027 in Nürnberg.',
    href: 'https://axdn.io/',
  },
];

// Aktueller Stand aus axdnwebsite/src/components/conference/Tracks.astro
// und https://axdn.io/ am 17.09.2026. Expo & Partners zählt dort als Track 06.
export const conferenceTracks = [
  'AI for Engineers & Dev',
  'AI for Marketing',
  'AI for HR',
  'AI for Executives & Leadership',
  'AI for Business & Entrepreneurs',
  'Expo & Partners',
];

export const appVideo: PresentationVideo = { kind: 'youtube', id: 'grbwODPjShs' };

// Line-up für die Premiere, vom Veranstalter für die Präsentation bestätigt.
export const womanNightsSpotlight = {
  eventSlug: 'ai-woman-nights-01',
  ticketQr: '/media/presentation/ai-woman-nights-01-tickets.svg',
  // Die drei gelieferten Fotos sind als Gruppe bestätigt. Einzelne Zuordnungen
  // sind in den numerischen Dateinamen nicht enthalten, daher eine gemeinsame Bildunterschrift.
  speakerNames: ['Dr. Dina Barbian', 'Anni Schramm', 'Dilara Zwanzig'],
  portraits: [
    '/media/presentation/woman-speaker-1695500720118.jpeg',
    '/media/presentation/woman-speaker-1770044091000.jpeg',
    '/media/presentation/woman-speaker-1734078943527.jpeg',
  ],
};

export const slideNames = [
  'Herzlich willkommen',
  'Design Offices',
  'Dr. Fabian Mehring',
  'Unsere Formate',
  'AXDN // 27',
  'Die AXDN App',
  'Unsere Partner',
];
