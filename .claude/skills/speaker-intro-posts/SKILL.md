---
name: speaker-intro-posts
description: Plant für jeden bestätigten Speaker eines Events den #speakerintro-Post und für das komplette Line-up den Line-up-Post in Metricool ein (Karte generieren, deployen, terminieren nach dem 5/4/3-Wochen-Schema, dienstags 9:00, Instagram + LinkedIn). Proaktiv anwenden, sobald ein Event neue bestätigte Speaker/Sessions bekommt — zusammen mit announce-speakers (Blogpost) und event-lineup-graphic (Line-up-Grafik).
---

# #speakerintro- und Line-up-Posts in Metricool einplanen

Jeder bestätigte Speaker bekommt einen Post mit seiner #speakerintro-Karte,
das vollständige Line-up einen eigenen Post — terminiert im Wochenrhythmus vor
dem Event.

## Social Media läuft über Metricool

**Linkrex nicht mehr verwenden.** Social-Media-Planung für die AI Nights läuft
ausschließlich über den Metricool-MCP (`mcp__Metricool_…`). Die
Linkrex-Konnektoren existieren zwar noch, sind aber für die AI Nights raus —
doppelt geplante Posts gehen sonst zweimal auf denselben Kanälen raus.

- **Brand:** „ainights.ai Social Media", `blogId` **5545128**,
  Zeitzone `Europe/Berlin` (per `getBrandSettings` gegenprüfen, nicht raten —
  im selben Konto liegen u. a. „der.pabst", „Agents im Weggla" und
  „dermannimkleid").
- **Netzwerke pro Ankündigung: Instagram *und* LinkedIn**, als **zwei
  getrennte Posts** zur selben Zeit (so liegen die bestehenden Posts vor):
  - Instagram: Textende „Tickets & alle Infos auf ainights.ai — Link in Bio! 🎟️",
    `instagramData: {"type":"POST","showReelOnFeed":true,"isAiGenerated":false}`
  - LinkedIn: statt „Link in Bio" die volle Event-URL,
    `linkedinData: {"previewIncluded":true,"type":"post"}`
- Hashtags stehen **im Text**, nicht im separaten Feld.
- `mediaAltText` immer setzen — beschreibt, wer auf der Karte zu sehen ist.

## Schritt 1: Assets generieren und deployen

```bash
node scripts/generate-speaker-intro-cards.mjs <event-slug>
node scripts/generate-event-carousel.mjs <event-slug>
node scripts/generate-topic-carousels.mjs <event-slug>
node scripts/generate-event-lineup.mjs <event-slug>
```

Ergebnis committen und deployen (PR → Merge → Forge) — **wichtig**, denn
Metricool lädt die Bilder per öffentlicher URL von der Live-Site:

- `https://ainights.ai/media/speaker-intro-cards/<event-slug>/<speaker-slug>.png`
- `https://ainights.ai/media/event-lineups/<event-slug>-instagram.png` bzw. `-linkedin.png`

Metricool kopiert die Datei beim Anlegen in die eigene Mediathek; die
Antwort enthält dann eine `static.metricool.com`-URL. Das ist normal.

## Schritt 2: Termine bestimmen

- Grundregel: **Dienstag 09:00 Uhr**, Speaker in Slot-Reihenfolge auf die
  Dienstage **~5, ~4 und ~3 Wochen vor dem Event**.
- **Line-up-Post**: eigener Termin, wenn alle Slots stehen — bewährt hat sich
  der Dienstag **eine Woche vor dem Event**.
- **Vorher immer** `getScheduledPosts` für den Zeitraum abfragen. In derselben
  Woche laufen oft schon Posts anderer Events (Nürnberg und München
  überschneiden sich regelmäßig) — bei Kollision einen anderen Wochentag
  derselben Woche nehmen, bevorzugt Donnerstag 09:00.
- Ist das Schema zeitlich nicht mehr möglich (< 3 Wochen Vorlauf), kurz beim
  Nutzer nachfragen statt still zu quetschen.
- Kommt ein Speaker nachträglich dazu, bekommt er den nächsten freien Termin
  im Schema.

## Save-the-Date-Post

Die Save-the-Date-Karte (`node scripts/generate-save-the-date.mjs <event-slug>`,
Ausgabe unter `public/media/save-the-date/`) geht **rund zwei Monate vor dem
Event** raus — auf **LinkedIn und Instagram**, wie die Speaker-Intros als zwei
getrennte Posts zur selben Zeit.

- Ausgangspunkt: Event-Datum minus zwei Monate, dann auf den nächstgelegenen
  **Dienstag 09:00** legen.
- Fällt der Termin auf einen belegten Slot oder auf einen **Event-Tag**
  (auch den eines anderen Events), auf den Donnerstag derselben Woche
  ausweichen — vorher `getScheduledPosts` prüfen.
- Reihenfolge über den Vorlauf hinweg: Save the Date (~8 Wochen) →
  #speakerintro je Slot (5/4/3 Wochen) → Line-up (1 Woche).

## Schritt 3: Posts anlegen

`createScheduledPost` mit `blogId`, `date` (ISO 8601 mit Offset) und `info`:

```json
{
  "text": "…",
  "media": ["https://ainights.ai/media/speaker-intro-cards/<event>/<slug>.png"],
  "mediaAltText": ["…"],
  "providers": [{"network": "instagram"}],
  "publicationDate": {"dateTime": "2026-10-27T09:00:00", "timezone": "Europe/Berlin"},
  "autoPublish": true, "draft": false, "shortener": false,
  "instagramData": {"type": "POST", "showReelOnFeed": true, "isAiGenerated": false}
}
```

Textmuster (Ton wie die bestehenden Posts, keine erfundenen Fakten):

```
#speakerintro <Emoji> <Einstiegszeile mit Event + Datum>: <Name>, <Rolle/Unternehmen>.

Sein/Ihr Talk: „<Talk-Titel>" <Emoji>

Tickets & alle Infos auf ainights.ai — Link in Bio! 🎟️

#ainights #ki #<stadt> #<thema1> #<thema2>
```

Bei AI-Woman-Nights-Events zusätzlich `#aiwomannights` und `#womenintech`.

## Danach

Kurz per `getScheduledPosts` verifizieren und dem Nutzer eine Tabelle (Datum,
Speaker, Netzwerk, Post-ID) zeigen. Nicht vergessen: Blogpost
(`announce-speakers`) und ggf. Voucher (`speaker-vouchers`) gehören zum
selben Anlass.
