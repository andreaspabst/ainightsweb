---
name: speaker-intro-posts
description: >-
  Plant für jeden bestätigten Speaker eines Events den #speakerintro-Post auf
  Instagram in Linkrex ein (Karte generieren, hochladen, terminieren nach dem
  5/4/3-Wochen-Schema, dienstags 9:00). Proaktiv anwenden, sobald ein Event
  neue bestätigte Speaker/Sessions bekommt — zusammen mit announce-speakers
  (Blogpost) und event-lineup-graphic (Line-up-Grafik).
---

# #speakerintro-Posts generieren und in Linkrex einplanen

Jeder bestätigte Speaker bekommt einen Instagram-Post mit seiner
#speakerintro-Karte — automatisch terminiert im Wochenrhythmus vor dem Event.

## Wann anwenden

**Proaktiv daran denken**, wenn in diesem Repo ein Event unter
`src/content/events/` neue bestätigte Speaker bekommt (Platzhalter
`ai-nights-speaker-…` zählen nicht). Dann prüfen, ob für jeden Speaker schon
ein Intro-Post in Linkrex geplant/veröffentlicht ist — fehlende ergänzen.

## Schritt 1: Assets generieren und deployen

```bash
node scripts/generate-speaker-intro-cards.mjs <event-slug>
node scripts/generate-event-carousel.mjs <event-slug>
node scripts/generate-topic-carousels.mjs <event-slug>
```

Ergebnis committen und deployen (PR → Merge → Forge) — **wichtig**, denn der
Linkrex-Upload zieht die Karte per URL von der Live-Site:
`https://ainights.ai/media/speaker-intro-cards/<event-slug>/<speaker-slug>.png`

## Schritt 2: Termin bestimmen

- Grundregel: **Dienstag 09:00 Uhr**, Speaker in Slot-Reihenfolge auf die
  Dienstage **~5, ~4 und ~3 Wochen vor dem Event** (bei Nicht-Dienstag-Events
  zählt der Dienstag der jeweiligen Woche).
- **Kollision** (in derselben Woche ist bereits ein Post einer anderen Serie
  geplant, oder der Dienstag ist selbst ein Event-Tag): **anderen Wochentag
  derselben Woche nehmen** — bevorzugt Donnerstag 09:00.
- Vorher mit `list_scheduled_posts` (Connection s. u.) prüfen, was schon
  geplant ist. Ist das Schema zeitlich nicht mehr möglich (< 3 Wochen
  Vorlauf), kurz beim Nutzer nachfragen statt still zu quetschen.
- Kommt ein Speaker nachträglich dazu, bekommt er den nächsten freien
  Dienstag im Schema (oder Ausweichtag).

## Schritt 3: In Linkrex einplanen

Es gibt **zwei Linkrex-MCP-Konnektoren** — den verwenden, dessen
`list_social_decks` das Deck **„AI Nights"** enthält (Deck-ID 3, Instagram-
Connection-ID 1001; im Zweifel per `list_deck_connections` verifizieren —
niemals ins falsche Deck wie „DerMannImKleid" planen).

1. `upload_media_from_url` mit der Live-URL der Karte,
   Dateiname `speakerintro-<speaker-slug>.png` → `upload_id` merken.
2. `create_scheduled_post` mit:
   - `connection_id`: die AI-Nights-Instagram-Connection
   - **nur Instagram** — kein TikTok, kein LinkedIn (Stand: bewusst so
     entschieden; LinkedIn ist in Linkrex ohnehin nicht verbunden)
   - `scheduled_at`: `YYYY-MM-DD 09:00:00` (Linkrex rechnet Berlin-Zeit)
   - `title`: `Speakerintro <Name> (<Event-Kürzel>)`
   - `upload_ids`: [upload_id]
   - `content` nach diesem Muster (Ton wie bestehende Posts, keine
     erfundenen Fakten):

     ```
     #speakerintro <Emoji> <Einstiegszeile mit Event + Datum>: <Name>, <Rolle/Unternehmen>.

     Sein/Ihr Talk: „<Talk-Titel>" <Emoji>

     Tickets & alle Infos auf ainights.ai — Link in Bio! 🎟️
     ```
   - `hashtags`: immer `ainights` + `ki` + Stadt + 1–2 Themen-Tags;
     bei AI-Woman-Nights-Events zusätzlich `aiwomannights` + `womenintech`.

## Danach

Kurz per `list_scheduled_posts` verifizieren und dem Nutzer eine Tabelle
(Datum, Speaker, Event, Linkrex-ID) zeigen. Nicht vergessen: Blogpost
(`announce-speakers`) und ggf. Voucher (`speaker-vouchers`) gehören zum
selben Anlass.
