---
name: speaker-intro-posts
description: >-
  Plant für jeden bestätigten Speaker eines Events den #speakerintro-Post auf
  Instagram UND LinkedIn über den Metricool-MCP ein (Karte generieren,
  hochladen, terminieren nach dem 5/4/3-Wochen-Schema, dienstags 9:00).
  Proaktiv anwenden, sobald ein Event neue bestätigte Speaker/Sessions
  bekommt — zusammen mit announce-speakers (Blogpost) und
  event-lineup-graphic (Line-up-Grafik).
---

# #speakerintro-Posts generieren und in Metricool einplanen

Jeder bestätigte Speaker bekommt einen Post mit seiner #speakerintro-Karte
auf **Instagram und LinkedIn** — automatisch terminiert im Wochenrhythmus
vor dem Event. Geplant wird über den **Metricool-MCP** (nicht mehr über
Linkrex — dort liegen nur noch Alt-Posts).

## Wann anwenden

**Proaktiv daran denken**, wenn in diesem Repo ein Event unter
`src/content/events/` neue bestätigte Speaker bekommt (Platzhalter
`ai-nights-speaker-…` zählen nicht). Dann prüfen, ob für jeden Speaker schon
ein Intro-Post in Metricool geplant/veröffentlicht ist — fehlende ergänzen.

## Schritt 1: Assets generieren und deployen

```bash
node scripts/generate-speaker-intro-cards.mjs <event-slug>
node scripts/generate-event-carousel.mjs <event-slug>
node scripts/generate-topic-carousels.mjs <event-slug>
```

Ergebnis committen und deployen (PR → Merge → Forge) — **wichtig**, denn
Metricool zieht die Karte per URL von der Live-Site.

### Zwei Zuschnitte — pro Kanal den richtigen nehmen

`generate-speaker-intro-cards.mjs` erzeugt je Speaker **zwei** Karten:

| Kanal | Datei | Maße |
|---|---|---|
| Instagram | `<speaker-slug>-instagram.png` | 1080 × 1350 (Portrait) |
| LinkedIn | `<speaker-slug>-linkedin.png` | 1200 × 627 (Landscape) |

```
https://ainights.ai/media/speaker-intro-cards/<event-slug>/<speaker-slug>-instagram.png
https://ainights.ai/media/speaker-intro-cards/<event-slug>/<speaker-slug>-linkedin.png
```

**Für LinkedIn ist die `-linkedin.png` Pflicht.** LinkedIn beschneidet
Portrait-Bilder im Feed auf ca. 1.91:1 und schneidet dabei die Headline
(„#speakerintro" + Name) weg. Nie die Instagram-Portrait-Karte in einen
LinkedIn-Post hängen.

## Schritt 2: Termin bestimmen

- Grundregel: **Dienstag 09:00 Uhr**, Speaker in Slot-Reihenfolge auf die
  Dienstage **~5, ~4 und ~3 Wochen vor dem Event** (bei Nicht-Dienstag-Events
  zählt der Dienstag der jeweiligen Woche).
- **Kollision** (in derselben Woche ist bereits ein Post einer anderen Serie
  geplant, oder der Dienstag ist selbst ein Event-Tag): **anderen Wochentag
  derselben Woche nehmen** — bevorzugt Donnerstag 09:00.
- Vorher in Metricool die bereits geplanten Posts der Marke prüfen. Ist das Schema zeitlich nicht mehr möglich (< 3 Wochen
  Vorlauf), kurz beim Nutzer nachfragen statt still zu quetschen.
- Kommt ein Speaker nachträglich dazu, bekommt er den nächsten freien
  Dienstag im Schema (oder Ausweichtag).

## Schritt 3: In Metricool einplanen

Über den **Metricool-MCP-Konnektor** (Tools per ToolSearch laden:
`getBrandSettings`, `createScheduledPost`, `getScheduledPosts`):

1. Mit `getBrandSettings` die Marke **„ainights.ai Social Media"**
   (blogId 5545128, Timezone Europe/Berlin) verifizieren — niemals in
   eine andere Marke planen (dort hängen Instagram `ainights.ai` und
   die AI-Nights-LinkedIn-Company-Page dran).
2. **Pro Speaker zwei Posts** zum selben Termin anlegen — einer für
   Instagram, einer für LinkedIn —, weil sich der Text unterscheidet
   (Instagram: „Link in Bio", LinkedIn: direkter Event-Link).
   Kein TikTok, solange nichts anderes vereinbart ist.
   `createScheduledPost` je Post mit:
   - `providers`: `[{"network":"instagram"}]` bzw. `[{"network":"linkedin"}]`
     (plus `instagramData: {"type":"POST"}` bzw.
     `linkedinData: {"previewIncluded": false}` — siehe Pflichtregel unten)
   - Bild in `media`: die Live-URL der #speakerintro-Karte im **Format des
     Kanals** — Instagram `…-instagram.png`, LinkedIn `…-linkedin.png`.
     Metricool lädt sie selbst herunter; vorher per curl prüfen, dass sie
     200 liefert
   - Termin: `publicationDate` `{dateTime: "YYYY-MM-DDT09:00:00", timezone: "Europe/Berlin"}`
   - Text nach diesem Muster (Ton wie bestehende Posts, keine
     erfundenen Fakten; Hashtags gehören mit in den `text`):

     ```
     #speakerintro <Emoji> <Einstiegszeile mit Event + Datum>: <Name>, <Rolle/Unternehmen>.

     Sein/Ihr Talk: „<Talk-Titel>" <Emoji>

     Tickets & alle Infos auf ainights.ai — Link in Bio! 🎟️   ← Instagram
     Tickets & alle Infos: https://ainights.ai/events/<event-slug>/ 🎟️   ← LinkedIn

     <Hashtag-Zeile>
     ```
   - Hashtags: immer `#ainights` + `#ki` + Stadt + 1–2 Themen-Tags;
     bei AI-Woman-Nights-Events zusätzlich `#aiwomannights` + `#womenintech`.

### Pflichtregel LinkedIn: `previewIncluded: false`

Sobald ein LinkedIn-Post **ein Bild mitschickt UND im Text eine URL steht**,
muss `linkedinData` `"previewIncluded": false` enthalten:

```json
"linkedinData": { "previewIncluded": false }
```

Sonst baut LinkedIn aus der URL eine Link-Vorschau und zeigt das
hochgeladene Bild **gar nicht** — genau das ist passiert, mehrere
#speakerintro-Posts gingen ohne Grafik raus.

Alternative, wenn die Link-Vorschau bewusst gewünscht ist: die URL aus dem
Post-Text nehmen und stattdessen in den ersten Kommentar legen
(`firstCommentText`) — dann bleibt das Bild das Hauptmotiv.

Vor dem Anlegen einmal gegenprüfen: Jeder LinkedIn-Post mit `media` +
URL im Text hat `previewIncluded: false`.

## Danach

Die geplanten Posts in Metricool kurz verifizieren und dem Nutzer eine
Tabelle (Datum, Speaker, Event, Kanäle) zeigen. Nicht vergessen: Blogpost
(`announce-speakers`) und ggf. Voucher (`speaker-vouchers`) gehören zum
selben Anlass.
