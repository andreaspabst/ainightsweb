---
name: event-social-posts
description: Plant die Social-Media-Posts rund um ein AI-Nights-Event in Metricool ein — Save the Date (~2 Monate vorher), #speakerintro je Speaker (5/4/3 Wochen vorher), den Line-up-Post (1 Woche vorher) und den „HEUTE 17:00 UHR"-Post am Event-Tag, jeweils auf Instagram und LinkedIn. Proaktiv anwenden, sobald ein Event angelegt wird oder neue bestätigte Speaker/Sessions bekommt — zusammen mit announce-speakers (Blogpost) — sowie in der Woche vor dem Event für den Event-Tag-Post.
---

# Event-Posts in Metricool einplanen

Rund um jedes Event laufen vier Post-Typen: die **Save-the-Date-Karte** etwa
zwei Monate vorher, pro Speaker ein **#speakerintro**, der **Line-up-Post**
eine Woche vorher und am **Event-Tag** die „HEUTE 17:00 UHR"-Karte. Alle
terminiert im Wochenrhythmus vor dem Event, alle auf Instagram und LinkedIn.

## ⚠️ Die zwei LinkedIn-Regeln, an denen es bisher immer gescheitert ist

1. **Für LinkedIn immer die `-linkedin.png` nehmen**, nie die Instagram-Karte.
   LinkedIn beschneidet Portrait-Bilder im Feed auf ca. 1.91:1 und schneidet
   dabei die Headline weg. Jeder Kartentyp liegt in beiden Zuschnitten vor
   (Tabelle in Schritt 1).
2. **`linkedinData` braucht `"previewIncluded": false`**, sobald ein Bild
   mitgeschickt wird *und* im Text eine URL steht (Details unten).

## ⚠️ Caption-Regeln (verbindlich für jeden Post)

1. **Keine Gedankenstriche.** Weder „—“ noch „–“ als Satzzeichen, nicht
   zwischen Satzteilen, nicht in Aufzählungen. Das ist das Merkmal, an dem man
   sofort erkennt, dass ein Text von einer KI kommt. Stattdessen Komma, Punkt
   oder Doppelpunkt, Sätze lieber kürzer machen. Bindestriche in Wörtern
   (Line-up, Co-Founder) sind in Ordnung. Vor dem Anlegen jeden Text einmal auf
   „—“ und „–“ prüfen. Einzige Ausnahme ist der Abschlussblock unten, der mit
   seinem „–“ wörtlich übernommen wird.
2. **Jede Event-Caption schließt mit diesem Block**, mit den aktuellen Daten
   des Events (Datum, Ort, Stadt-Hashtag):

   ```
   👉 Wenn du dabei sein willst:
   🗓️ 17. September – ab 17 Uhr
   📍 Design Offices Nürnberg
   🥂 Drinks & Snacks inklusive – gute Gespräche kommen von selbst

   Kommentiere mit TICKET und du bekommst deinen Platz.

   #ainights #ai #event #ki #afterwork #networking #nürnberg
   ```

   - Den Stadt-Hashtag je Event tauschen (`#nürnberg`, `#münchen`,
     `#hamburg`, `#bayreuth`). Bei AI Woman Nights zusätzlich `#aiwomannights`.
   - **LinkedIn:** Dort gibt es den Kommentar-Trick nicht. Statt der
     TICKET-Zeile steht „Tickets und alle Infos: <volle Event-URL>“, sonst
     bleibt der Block gleich. `previewIncluded: false` gilt unverändert.
   - Der Block ersetzt „Link in Bio“ und die bisherigen Datums-/Ortszeilen.
     Davor steht nur der Einstieg (Hook plus ein bis zwei Sätze zum Inhalt).
3. Gilt für alle neuen Captions und für jede bestehende Caption, die in
   Metricool angefasst wird. Die AXDN//27-Posts haben eigene Inhalte, aber
   auch dort keine Gedankenstriche.

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
  - Instagram: Textende ist der Abschlussblock aus den Caption-Regeln oben
    („Kommentiere mit TICKET und du bekommst deinen Platz.“),
    `instagramData: {"type":"POST","showReelOnFeed":true,"isAiGenerated":false}`
    plus **Collab mit dem Stadt-Account**, siehe unten
  - LinkedIn: statt der TICKET-Zeile die volle Event-URL,
    `linkedinData: {"previewIncluded":false,"type":"post"}` — **`previewIncluded`
    muss `false` sein**, siehe Pflichtregel unten
- Hashtags stehen **im Text**, nicht im separaten Feld.
- `mediaAltText` immer setzen — beschreibt, wer auf der Karte zu sehen ist.
- **Schrift der Postkarten (AI Nights und AI Woman Nights): Glacial
  Indifference** (`scripts/fonts/GlacialIndifference-*.otf`, SIL OFL, in
  `social-kit.mjs` als Familien `Glacial Indifference` / `Glacial Indifference
  Bold` registriert). Save-the-Date- und Event-Tag-Karte nutzen sie; neue
  Karten-Generatoren ebenfalls damit setzen. Kursiv gibt es nur synthetisch
  (Pango `<i>`), einen Italic-Schnitt hat die Schrift nicht.

### Instagram-Collab mit dem Stadt-Account

**Gepostet wird immer vom Haupt-Account** `ainights.ai` (Brand „ainights.ai
Social Media"). Hat das Event einen **Stadtbezug**, kommt der Stadt-Account
derselben Stadt als **Collab-Partner** dazu: Der Post erscheint dann in beiden
Feeds und Grids, mit beiden Accounts als Absender — der lokale Account baut
Reichweite auf, ohne dass wir doppelt posten müssen.

| Stadt | Instagram-Account | gilt für |
|---|---|---|
| Nürnberg | `ainights.ai_nuernberg` | AI Nights Nürnberg **und** AI Woman Nights |
| München | `ainights.ai_muenchen` | AI Nights München |

```json
"instagramData": {
  "type": "POST", "showReelOnFeed": true, "isAiGenerated": false,
  "collaborators": [{"username": "ainights.ai_nuernberg", "deleted": false}]
}
```

- Die Stadt kommt aus dem Feld `city` des Events in `src/content/events/`.
  Steht für diese Stadt kein Account in der Tabelle, wird **kein** Collab
  gesetzt — nicht raten und nicht den Account einer anderen Stadt nehmen.
  Ein München-Post mit dem Nürnberg-Account als Co-Absender ist schlicht
  falsch und verwässert den lokalen Feed.
- Kommt eine Stadt neu dazu (eigener Instagram-Account angelegt), gehört sie
  in die Tabelle oben — und der Account muss vorher im **Meta-Business-Portfolio
  „AI Nights"** liegen, sonst nimmt Instagram ihn als Collab nicht an.
- **Nur Instagram.** LinkedIn kennt keine Collab-Posts; dort bleibt es beim
  reinen Post vom Haupt-Account.
- Beim **Entfernen** eines Collabs `"collaborators": []` senden — ein leeres
  Array löscht das Feld tatsächlich, das Weglassen des Feldes nicht.
- Die Einladung verschickt Instagram erst **beim Veröffentlichen**, nicht beim
  Einplanen. Jemand mit Zugriff auf den Stadt-Account muss sie dann annehmen,
  sonst läuft der Post normal, aber nur auf `ainights.ai`. Beim ersten Post
  einer neuen Serie kurz in die Benachrichtigungen des Stadt-Accounts schauen.

## Schritt 1: Assets generieren und hochladen

```bash
node scripts/generate-speaker-intro-cards.mjs <event-slug>
node scripts/generate-event-carousel.mjs <event-slug>
node scripts/generate-topic-carousels.mjs <event-slug>
node scripts/generate-event-lineup.mjs <event-slug>
node scripts/generate-save-the-date.mjs <event-slug>
node scripts/generate-event-day.mjs <event-slug>
node scripts/generate-event-day.mjs <event-slug> --countdown 14,10,2
```

Jedes dieser Skripte schreibt **pro Aufruf beide Formate** (`-instagram.png`
und `-linkedin.png`) — es gibt keinen Schalter, der nur eines erzeugt.

Ergebnis mit `npm run media:push` in den R2-Bucket hochladen — **wichtig**, denn
Metricool lädt die Bilder per öffentlicher URL. Medien liegen nicht mehr im
Repo (nur lokal, gitignored); ein Deploy ist dafür **nicht** nötig, die Bilder
sind sofort unter `https://media.ainights.ai/media/…` erreichbar. Das
aktualisierte `src/data/media-manifest.json` gehört mit in den Commit.

### Fallback ohne R2-Zugangsdaten: `public/social-media-posts/`

Fehlen in `.env` `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`, oder schlägt
`npm run media:push` mit einem Auth-Fehler fehl (Token abgelaufen o. ä.) —
**nicht** auf den R2-Push warten oder den Nutzer nach Zugangsdaten fragen,
sondern über den normalen Deploy-Weg gehen:

1. Fertige Grafiken/Videos nach `public/social-media-posts/<slug>/<dateiname>`
   legen (z. B. `public/social-media-posts/ai-woman-nights-01/slide-3-instagram.png`).
   Anders als `public/media/` ist dieser Ordner **nicht** in `.gitignore` —
   die Dateien werden normal committet und landen über den Build in `dist/`.
2. Ganz normaler Git-Workflow aus diesem CLAUDE.md: Feature-Branch, committen,
   vor dem Push kurz beim Nutzer bestätigen lassen, pushen, PR gegen `master`
   erstellen. Den PR **nicht selbst mergen**.
3. Nach dem Merge auf das Forge-Deploy warten, dann jede URL einzeln prüfen
   (`curl -I https://ainights.ai/social-media-posts/<slug>/<dateiname>` →
   muss `200` liefern) — erst danach in `createScheduledPost` als `media`
   verwenden.
4. Diese Dateien bleiben dauerhaft im Repo (kein Auto-Cleanup) — für einzelne
   Sonderposts unkritisch, aber kein Ersatz für den R2-Weg bei den
   Standard-Kartentypen oben: sobald wieder gültige R2-Zugangsdaten da sind,
   bei denen weiter `npm run media:push` nutzen.

### Welcher Kartentyp in welchem Format

Alle Kartentypen liegen in **zwei Zuschnitten** vor, unterschieden durch das
Suffix `-instagram` / `-linkedin` im Dateinamen:

| Kartentyp | Datei | Instagram | LinkedIn |
|---|---|---|---|
| Save the Date | `/media/save-the-date/<event-slug>-<fmt>.png` | 1080×1350 | 1200×627 |
| #speakerintro | `/media/speaker-intro-cards/<event-slug>/<speaker-slug>-<fmt>.png` | 1080×1350 | 1200×627 |
| Line-up | `/media/event-lineups/<event-slug>-<fmt>.png` | 1080×1350 | 1200×627 |
| Event-Tag „HEUTE" | `/media/event-day/<event-slug>-<fmt>.png` | 1080×1350 | 1200×627 |
| Countdown „NUR NOCH" | `/media/countdown/<event-slug>-<n>-<fmt>.png` | 1080×1350 | 1200×627 |
| Event-/Themen-Karussell | `/media/{event,topic}-carousels/<event-slug>/…-slide-<n>-<fmt>.png` | 1080×1080 | 1200×627 |

**Für LinkedIn ist die `-linkedin.png` Pflicht.** LinkedIn beschneidet
Portrait- und Quadrat-Bilder im Feed auf ca. 1.91:1 und schneidet dabei die
Headline weg (bei den #speakerintro-Karten „#speakerintro" + Name, bei der
Event-Tag-Karte „HEUTE 17:00 UHR"). Nie die Instagram-Karte in einen
LinkedIn-Post hängen.

Beispiel-URLs:

- `https://media.ainights.ai/media/save-the-date/<event-slug>-instagram.png` / `-linkedin.png`
- `https://media.ainights.ai/media/speaker-intro-cards/<event-slug>/<speaker-slug>-instagram.png` / `-linkedin.png`
- `https://media.ainights.ai/media/event-lineups/<event-slug>-instagram.png` / `-linkedin.png`
- `https://media.ainights.ai/media/event-day/<event-slug>-instagram.png` / `-linkedin.png`
- `https://media.ainights.ai/media/countdown/<event-slug>-14-instagram.png` / `-linkedin.png`

Vor dem Einplanen jede URL einmal per `curl -I` gegenprüfen (muss 200 liefern).

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

### Save the Date

Die Save-the-Date-Karte (`node scripts/generate-save-the-date.mjs <event-slug>`,
Ausgabe unter `public/media/save-the-date/<event-slug>-instagram.png` bzw.
`-linkedin.png`) geht **rund zwei Monate vor dem Event** raus — auf **LinkedIn und Instagram**, wie die Speaker-Intros als zwei
getrennte Posts zur selben Zeit.

- Ausgangspunkt: Event-Datum minus zwei Monate, dann auf den nächstgelegenen
  **Dienstag 09:00** legen.
- Fällt der Termin auf einen belegten Slot oder auf einen **Event-Tag**
  (auch den eines anderen Events), auf den Donnerstag derselben Woche
  ausweichen — vorher `getScheduledPosts` prüfen.
- Reihenfolge über den Vorlauf hinweg: Save the Date (~8 Wochen) →
  #speakerintro je Slot (5/4/3 Wochen) → Line-up (1 Woche) → Event-Tag.

### Event-Tag: „HEUTE 17:00 UHR"

Am Tag des Events geht morgens die Event-Tag-Karte raus
(`node scripts/generate-event-day.mjs <event-slug>`, Ausgabe unter
`public/media/event-day/<event-slug>-instagram.png` (Portrait 1080×1350) und
`-linkedin.png` (Landscape 1200×627, Headline links, Publikum rechts): ein
zufälliges Publikumsfoto aus der Galerie als Duotone, oben links
das Logo, groß **HEUTE** + Uhrzeit (aus `startTime` des Events) und die Zeile
„Für die Spontanen: Tickets sind auch an der Abendkasse erhältlich".

- **AI Woman Nights**: Woman-Lockup als Logo und **Lila-Duotone** statt
  Magenta — das macht das Script anhand des Slugs von allein. Die Fotos
  kommen dort aus einer eigenen Liste (`AUDIENCE_WOMAN`) mit Motiven, auf
  denen Frauen im Publikum zu sehen sind; die allgemeine Liste landet sonst
  leicht auf einer reinen Männerrunde.
- **Termin: Event-Tag, 09:00 Uhr**, Instagram *und* LinkedIn als zwei
  getrennte Posts. Liegt an dem Tag schon etwas um 09:00 (z. B. ein
  Speaker-Intro eines anderen Events), auf 11:00 ausweichen — vorher
  `getScheduledPosts` prüfen.
- Das Foto ist pro Event stabil (Seed = Event-Slug). Passt es nicht (Buffet,
  leerer Raum, jemand ungünstig getroffen), mit `--seed <n>` neu würfeln oder
  mit `--image <pfad>` ein Bild setzen; `--any-gallery` greift in alle
  Galeriebilder aus `src/data/gallery.json` statt in die kuratierte
  Publikumsliste. Das PNG **immer ansehen**, bevor es eingeplant wird.
- Gibt es keine Abendkasse (ausverkauft, reine Vorverkaufs-Location), die
  Zeile mit `--subline "…"` ersetzen oder mit `--no-subline` weglassen — und
  den Post-Text entsprechend anpassen.
- Textmuster (Ton wie die bestehenden Posts, keine erfundenen Fakten):

  ```
  Heute ist es so weit! 🎉 <Event-Titel>, ab <Uhrzeit> Uhr im <Location>, <Stadt>.

  <Ein Satz zum Abend: Speaker/Talks in Slot-Reihenfolge, Drinks & Networking.>

  Für die Spontanen: Tickets gibt es auch an der Abendkasse. 🎟️

  <Abschlussblock aus den Caption-Regeln, mit „heute“ statt Datum: 🗓️ Heute – ab 17 Uhr>
  ```

### Countdown: „NUR NOCH 14 TAGE"

Im Vorlauf läuft dieselbe Karte als Countdown
(`node scripts/generate-event-day.mjs <event-slug> --countdown 14,10,2`,
Ausgabe unter `public/media/countdown/<event-slug>-<n>-instagram.png` bzw.
`-linkedin.png`). Gleiche Optik, gleiche zwei Zuschnitte, gleiche Lila-Regel
für Woman-Events — nur die Headline lautet **NUR NOCH / \<n\> TAGE**, darunter
steht die **Stadt groß** in der Akzentfarbe des Duotones, und die Hinweiszeile
trägt statt der Abendkasse **Datum und Uhrzeit**.

Die Stadt gehört groß auf die Karte: In derselben Woche laufen regelmäßig
mehrere Events parallel (Nürnberg, München, Woman Nights), und „NUR NOCH 14
TAGE" allein sagt im Feed nicht, welches davon gemeint ist. Die Location
dagegen steht weiter nur im Post-Text — sie bricht auf der Karte mitten im
Namen um.

- Bewährter Rhythmus: **14, 10 und 2 Tage vorher**, jeweils 09:00 Uhr,
  Instagram und LinkedIn als zwei getrennte Posts.
- `--countdown` nimmt jede Zahl und mehrere Stufen auf einmal
  (`--countdown 1` ergibt „NUR NOCH 1 TAG"). Ein Lauf mit mehreren Stufen
  gibt jeder Stufe automatisch ein anderes Foto — auch verschieden vom Foto
  der Event-Tag-Karte. Vier Posts desselben Events innerhalb von zwei Wochen
  mit demselben Bild wirken sonst wie ein Fehler.
- Die Sperre greift nur innerhalb eines Laufs. Werden Event-Tag- und
  Countdown-Karten getrennt erzeugt, die Fotos **gegenprüfen** (das Script
  gibt sie pro Karte aus) und Doppler mit `--image` auflösen. Bei
  AI-Woman-Nights ist die Fotoliste nur vier Motive lang — Event-Tag plus
  drei Countdown-Stufen schöpfen sie exakt aus.
- Der 09:00-Slot kollidiert oft mit einem #speakerintro (die liegen 5/4/3
  Wochen vorher ebenfalls auf 09:00) — vorher `getScheduledPosts` prüfen und
  bei Kollision auf **11:00** gehen. Die Countdown-Zahl auf der Karte muss
  zum Termin passen: lieber die Stufe wechseln (`--countdown 7`) als den
  Post zu verschieben.
- Textmuster:

  ```
  Nur noch <n> Tage bis <Event-Titel>! ⏳

  <Ein Satz zum Abend: Speaker/Talks, wenn das Line-up steht, sonst allgemein.>

  <Abschlussblock aus den Caption-Regeln mit Datum, Ort und Stadt-Hashtag>
  ```

### Reihenfolge im Vorlauf

Save the Date (~8 Wochen) → #speakerintro je Slot (5/4/3 Wochen) →
**Countdown T-14** → Line-up (1 Woche) → **Countdown T-10 und T-2** →
Event-Tag (09:00).

## Schritt 3: Posts anlegen

`createScheduledPost` mit `blogId`, `date` (ISO 8601 mit Offset) und `info`.
Pro Anlass **zwei Posts** zum selben Termin — je Netzwerk mit der Karte im
Format dieses Netzwerks.

Instagram:

```json
{
  "text": "…",
  "media": ["https://ainights.ai/media/speaker-intro-cards/<event>/<slug>-instagram.png"],
  "mediaAltText": ["…"],
  "providers": [{"network": "instagram"}],
  "publicationDate": {"dateTime": "2026-10-27T09:00:00", "timezone": "Europe/Berlin"},
  "autoPublish": true, "draft": false, "shortener": false,
  "instagramData": {"type": "POST", "showReelOnFeed": true, "isAiGenerated": false}
}
```

LinkedIn:

```json
{
  "text": "… https://ainights.ai/events/<event-slug>/ …",
  "media": ["https://ainights.ai/media/speaker-intro-cards/<event>/<slug>-linkedin.png"],
  "mediaAltText": ["…"],
  "providers": [{"network": "linkedin"}],
  "publicationDate": {"dateTime": "2026-10-27T09:00:00", "timezone": "Europe/Berlin"},
  "autoPublish": true, "draft": false, "shortener": false,
  "linkedinData": {"previewIncluded": false, "type": "post"}
}
```

### Pflichtregel LinkedIn: `previewIncluded: false`

Sobald ein LinkedIn-Post **ein Bild mitschickt UND im Text eine URL steht**,
muss `linkedinData` `"previewIncluded": false` enthalten:

```json
"linkedinData": { "previewIncluded": false, "type": "post" }
```

Sonst baut LinkedIn aus der URL eine Link-Vorschau und zeigt das hochgeladene
Bild **gar nicht** — genau das ist bei mehreren geplanten Posts passiert, sie
gingen ohne Grafik raus.

Alternative, wenn die Link-Vorschau bewusst gewünscht ist: die URL **aus dem
Post-Text nehmen** und stattdessen in den ersten Kommentar legen
(`firstCommentText`) — dann bleibt das Bild das Hauptmotiv.

Vor dem Anlegen einmal gegenprüfen — für **jeden** LinkedIn-Post:

- `media` zeigt auf die `-linkedin.png` (nicht auf `-instagram.png`),
- und wenn im `text` eine URL steht: `previewIncluded: false` ist gesetzt.

Textmuster (Ton wie die bestehenden Posts, keine erfundenen Fakten):

```
#speakerintro <Emoji> <Einstiegszeile mit Event + Datum>: <Name>, <Rolle/Unternehmen>.

Sein/Ihr Talk: „<Talk-Titel>" <Emoji>

<Abschlussblock aus den Caption-Regeln mit Datum, Ort und Stadt-Hashtag>
```

Bei AI-Woman-Nights-Events zusätzlich `#aiwomannights` und `#womenintech`,
themenbezogene Hashtags (`#<thema1>`) dürfen nach dem Abschlussblock stehen.

## Danach

Kurz per `getScheduledPosts` verifizieren und dem Nutzer eine Tabelle (Datum,
Speaker, Netzwerk, Post-ID) zeigen. Nicht vergessen: Blogpost
(`announce-speakers`) und ggf. Voucher (`speaker-vouchers`) gehören zum
selben Anlass.
