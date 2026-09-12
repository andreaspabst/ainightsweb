import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { CITIES, mapPosition } from '../lib/cities';

/**
 * Das Programm als JSON, für die AXDN-App.
 *
 * Die App braucht Speaker und Sessions je Event — Joinify kennt nur den Ticketverkauf.
 * Statt die Inhaltsdateien irgendwo zweitzuhalten, veröffentlicht die Website sie hier:
 * eine Datei, die beim Build mitentsteht und über den Joinify-Referenzcode
 * (`platforms.joinify`) mit dem Event im Ticketsystem verbunden ist.
 *
 * Bewusst nur, was die App anzeigt — keine SEO-Felder, kein contentHtml. Was hier steht,
 * ist öffentlich sichtbar; auf der Website steht es ohnehin schon.
 */
/** Bilder liegen relativ auf der Website — die App braucht eine vollständige Adresse. */
function absolute(path: string | undefined, site: URL | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;

  return new URL(path, site ?? 'https://ainights.ai').toString();
}

export const GET: APIRoute = async ({ site }) => {
  const [events, sessions, speaker] = await Promise.all([
    getCollection('events'),
    getCollection('sessions'),
    getCollection('speaker'),
  ]);

  const payload = {
    generated: new Date().toISOString(),
    source: 'ainights.ai',
    // Die Städtekarte der AI Nights. Die App zeichnet dieselbe Karte; damit folgt sie
    // der Website, statt eine zweite Liste zu führen, die auseinanderläuft.
    cities: CITIES.map((city) => ({
      slug: city.slug,
      name: city.name,
      status: city.status,
      onOverview: city.onOverview,
      ...mapPosition(city.lat, city.lon),
    })),
    events: events
      // Ohne Joinify-Code lässt sich das Event nicht zuordnen — dann hilft der Eintrag
      // niemandem und bläht die Datei nur auf.
      .filter((entry) => entry.data.platforms?.joinify)
      .map((entry) => ({
        id: entry.data.id,
        slug: entry.data.slug,
        title: entry.data.title,
        eventDate: entry.data.eventDate,
        startTime: entry.data.startTime,
        platforms: { joinify: entry.data.platforms?.joinify },
        sessionIds: entry.data.sessionIds ?? [],
        speakerIds: entry.data.speakerIds ?? [],
        // Die Aftershow gehört zum Abend: wer ein Ticket hat, soll in der App sehen,
        // dass es danach weitergeht — samt dem, was im Ticket steckt.
        aftershow: entry.data.aftershow
          ? {
              title: entry.data.aftershow.title,
              kicker: entry.data.aftershow.kicker,
              text: entry.data.aftershow.text,
              facts: (entry.data.aftershow.facts ?? []).map((fact) => ({
                icon: fact.icon,
                label: fact.label,
              })),
              partnerName: entry.data.aftershow.partnerName,
              partnerLogo: absolute(entry.data.aftershow.partnerLogo?.src, site),
            }
          : undefined,
      })),
    sessions: sessions.map((entry) => ({
      id: entry.data.id,
      slug: entry.data.slug,
      title: entry.data.title,
      excerpt: entry.data.excerpt,
      type: entry.data.type,
      // Die gepflegten Uhrzeiten. Ohne sie müsste eine App den Ablauf aus Dauern
      // aufaddieren — und läge falsch, sobald zwischen zwei Punkten eine Lücke liegt.
      startTime: entry.data.startTime,
      endTime: entry.data.endTime,
      duration: entry.data.duration,
      level: entry.data.level,
      room: entry.data.room,
      speakerIds: entry.data.speakerIds ?? [],
    })),
    speaker: speaker.map((entry) => ({
      id: entry.data.id,
      slug: entry.data.slug,
      title: entry.data.title,
      jobTitle: entry.data.jobTitle,
      company: entry.data.company,
      excerpt: entry.data.excerpt,
      // Das Kurzprofil als reiner Text: die App zeigt kein HTML an.
      bio: entry.data.bioHtml?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      photo: absolute(entry.data.image?.src, site),
      socials: entry.data.socials ?? {},
      profileUrl: new URL(`/speaker/${entry.data.slug}/`, site ?? 'https://ainights.ai').toString(),
    })),
  };

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Eine Stunde reicht: der Abgleich läuft stündlich, und ein neu angekündigter
      // Speaker darf ruhig eine Stunde brauchen.
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
