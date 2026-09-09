---
name: event-recap
description: Nachbereitung eines AI-Nights-Events — Recap-Deckblätter aus der Event-Galerie bauen und die drei Recap-Karussells (je Instagram und LinkedIn) in Metricool einplanen. Proaktiv anwenden, sobald ein Event vorbei ist und Galeriebilder dazu in src/data/gallery.json stehen.
---

# Nach dem Event: Recap-Karussells

Abgeschaut bei „Agents im Weggla" (`~/gitrepos/agenticnuremberg`,
Skill `event-recap`) und auf die AI Nights übertragen: Nach jedem Event
laufen **drei Recap-Posts** im Abstand einer knappen Woche, jeder als
Karussell aus Deckblatt plus vier Fotos des Abends.

Auslöser: Ein Event in `src/content/events/` liegt in der Vergangenheit **und**
`src/data/gallery.json` hat einen Eintrag mit `event: "<slug>"`.

Nichts erfinden: Speaker, Talks, Datum, Location und Sponsoren kommen aus dem
Event-JSON und den verknüpften `src/content/{speaker,sessions,sponsor}/`-Dateien.

## Schritt 1: Deckblätter erzeugen

```bash
node scripts/generate-event-day.mjs <event-slug> --recap 3
```

Ergebnis: `public/media/recap/<event-slug>-<1..3>-instagram.png` (1080×1350)
und `-linkedin.png` (1200×627) — dieselbe Duotone-Optik wie Event-Tag- und
Countdown-Karte, Headline **RECAP / #<nr>**, darunter die **Stadt groß** und
das Event-Datum.

- Die Motive kommen aus der Galerie **genau dieses Events**, nicht aus der
  kuratierten Publikumsliste — ein Recap zeigt den Abend, um den es geht.
  Jedes der drei Deckblätter bekommt automatisch ein anderes Foto.
- AI Woman Nights bekommen das Woman-Lockup und Lila statt Magenta; das
  erkennt das Script am Slug.
- Passt ein Motiv nicht, mit `--seed <n>` neu würfeln oder mit `--image <pfad>`
  setzen. **Jedes PNG vor dem Einplanen ansehen.**

## Schritt 2: Ausliefern — Pflicht vor dem Planen

Branch → PR → Merge → Forge-Deploy abwarten, dann jede Bild-URL per
`curl -I` auf 200 prüfen. **Metricool zieht die Bilder per öffentlicher URL.**

Muss ein Post vor dem Merge angelegt werden, geht auch die Roh-URL des
Feature-Branches (`https://raw.githubusercontent.com/andreaspabst/ainightsweb/<branch>/public/media/…`) —
Metricool kopiert das Bild sofort in die eigene Mediathek.

## Schritt 3: Sechs Posts in Metricool einplanen

Brand **„ainights.ai Social Media", `blogId` 5545128**, Zeitzone
`Europe/Berlin`. Vorher `getScheduledPosts` prüfen, keine Duplikate.

| Wann | Post | Deckblatt |
|---|---|---|
| **Tag nach dem Event, 10:00** | Recap 1: volles Haus, alle Talks in Slot-Reihenfolge, Dank an Location und Sponsoren | `-1` |
| **Montag drauf, 10:00** | Recap 2: was hängen geblieben ist, warum das Format funktioniert | `-2` |
| **Donnerstag drauf, 10:00** | Recap 3: die Talk-Themen im Detail | `-3` |

Je Termin **zwei Posts** (Instagram + LinkedIn) — sechs insgesamt.

- **Karussell:** Deckblatt + 4 Galeriemotive aus `src/data/gallery.json`,
  über die drei Recaps hinweg **nicht wiederholen**.
- **Instagram:** `instagramData: {"type":"POST","showReelOnFeed":true,"isAiGenerated":false}`,
  Ticket-Hinweis „Link in Bio" — plus **Collab mit dem Stadt-Account**, wenn
  es für die Stadt des Events einen gibt (Nürnberg: `ainights.ai_nuernberg`;
  München: keiner). Tabelle und Regeln stehen im Skill `event-social-posts`
  unter „Instagram-Collab mit dem Stadt-Account"; gepostet wird immer vom
  Haupt-Account, der Stadt-Account kommt nur als Co-Absender dazu.
- **LinkedIn:** die `-linkedin.png`-Zuschnitte, volle URL im Text und
  **`linkedinData: {"previewIncluded": false, "type":"post"}`** — sonst baut
  LinkedIn eine Link-Vorschau und zeigt die Bilder gar nicht.
- **In jedem Recap aufs nächste Event hinweisen** (Termin + Ticket-Link) —
  das ist der eigentliche Zweck der Serie.
- **Sponsoren gehören in jeden Post.** Namen aus `sponsorIds` des Events.
  Instagram-Handles stehen **nicht** in den Sponsor-Datensätzen: bekannte
  Handles taggen, sonst den Namen ausschreiben — nicht raten.
- `mediaAltText` je Slide setzen.

⚠️ **JSON-Falle:** Keine geraden Anführungszeichen (`"`) im `text` — sie
brechen das `info`-JSON. Typografische (`„ "`) verwenden oder umformulieren.

## Save the Date

Die Save-the-Date-Karte fürs Folge-Event läuft **nicht** hier, sondern über
den Skill `event-social-posts` (`node scripts/generate-save-the-date.mjs`,
rund zwei Monate vor dem Event). Bei Weggla hängt sie am Recap-Block; bei den
AI Nights hat sie ihren eigenen Rhythmus im Vorlauf.

## Danach

`getScheduledPosts` zur Kontrolle und dem Nutzer eine Tabelle zeigen
(Datum, Netzwerk, Inhalt, Post-ID).
