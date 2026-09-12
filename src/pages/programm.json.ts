import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

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
export const GET: APIRoute = async () => {
  const [events, sessions, speaker] = await Promise.all([
    getCollection('events'),
    getCollection('sessions'),
    getCollection('speaker'),
  ]);

  const payload = {
    generated: new Date().toISOString(),
    source: 'ainights.ai',
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
      })),
    sessions: sessions.map((entry) => ({
      id: entry.data.id,
      slug: entry.data.slug,
      title: entry.data.title,
      excerpt: entry.data.excerpt,
      type: entry.data.type,
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
