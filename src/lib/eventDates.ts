/**
 * Datumslogik für Events — bewusst zentral, weil sie sonst an jeder
 * Fundstelle leicht falsch wird.
 *
 * **Ein Event gilt bis zum Ende seines Tages als kommend.** Am Eventtag
 * selbst darf es nirgends als „vergangen" erscheinen, nicht aus Listen
 * fallen und keinen Vergangen-Badge bekommen — da findet es ja gerade statt.
 *
 * Die naive Variante `new Date(eventDate) < new Date()` tut genau das
 * falsch: `new Date('2026-09-17')` ist Mitternacht **UTC**, `new Date()`
 * der aktuelle Zeitpunkt. Ab 02:00 deutscher Zeit gilt das heutige Event
 * damit als vergangen. Deshalb hier ausschließlich Datums-Strings
 * (YYYY-MM-DD) vergleichen, nie Date-Objekte.
 */

/** Heutiges Datum in Europe/Berlin als `YYYY-MM-DD`. */
export function todayBerlin(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Tagesanteil eines Event-Datums (`2026-09-17` oder `2026-09-17 18:00:00`). */
const dayOf = (eventDate: string) => eventDate.slice(0, 10);

/** Kommend — inklusive des Eventtags selbst. */
export function isUpcoming(eventDate?: string | null): boolean {
  return Boolean(eventDate) && dayOf(eventDate!) >= todayBerlin();
}

/** Vergangen — erst ab dem Tag NACH dem Event. */
export function isPastEvent(eventDate?: string | null): boolean {
  return Boolean(eventDate) && dayOf(eventDate!) < todayBerlin();
}
