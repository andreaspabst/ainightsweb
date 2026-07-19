---
name: announce-speakers
description: Schreibt für jeden Talk-Slot eines AI-Nights-Events einen Ankündigungs-Blogpost (ca. 6–8 Wochen vor dem Event, drei Slots an drei verschiedenen Tagen). Proaktiv anwenden, sobald ein Event neue bestätigte Speaker/Sessions bekommt oder ein neues Event mit Speakern angelegt wird.
---

# Speaker-Slots als Blogposts ankündigen

Jeder Talk-Slot eines Events bekommt einen eigenen Ankündigungs-Blogpost —
für SEO-Content und damit die Community die Speaker kennenlernt.

## Wann anwenden

**Proaktiv daran denken**, wenn in diesem Repo:
- ein neues Event unter `src/content/events/` angelegt wird oder
- bei einem bestehenden Event Platzhalter-Speaker (`ai-nights-speaker-…`)
  durch echte Speaker ersetzt werden bzw. neue Sessions dazukommen.

Dann prüfen: Hat jeder Talk-Slot (Pausen und Welcome/Moderation zählen nicht)
schon einen Ankündigungspost unter `src/content/blog/`? Fehlende ergänzen.

## Timing

- Posts erscheinen **ca. 6–8 Wochen vor dem Event**.
- Die drei Slots werden **an drei verschiedenen Tagen** angekündigt
  (z. B. Event-Datum minus 8 Wochen, dann +5 Tage, dann +10 Tage).
- `pubDate` entsprechend setzen. Der Blog filtert Beiträge mit Datum in der
  Zukunft heraus — sie gehen mit dem nächsten Deploy nach ihrem Datum live.
  (Achtung: Statische Site — ohne neuen Deploy erscheint nichts. Bei geplanten
  Posts nach dem Datum einmal deployen oder direkt passend datieren.)
- Wird ein Speaker erst kurzfristig bestätigt, den Post einfach sofort datieren.

## Datenquellen

1. Event: `src/content/events/<slug>.json` (Datum, Ort, sessionIds, speakerIds)
2. Sessions: `src/content/sessions/*.json` (Titel, excerpt/contentHtml, Zeiten)
3. Speaker: `src/content/speaker/<slug>.json` (Bio/excerpt, jobTitle,
   `topics`, `keyTakeaways`, Bild)
4. Fehlt etwas, in der Airtable-Basis „AI Nights“ nachsehen (Tabelle *Speaker*:
   Bio, Talk Description, Topics, Key Takeaways) — nur Status
   „Genehmigt“/„Aufgetreten“ verwenden, nichts erfinden.
5. Ergänzend kurz im Netz recherchieren (Firmenwebsite, LinkedIn): Rolle,
   Unternehmen und Fakten zum Speaker verifizieren und ggf. anreichern —
   nur belegbare Fakten übernehmen, keine Superlative erfinden.

## Post-Format

Datei: `src/content/blog/<thema-kebab>-<speaker>-ai-nights-<nr>.md`
(Thema zuerst — SEO), Frontmatter wie in den bestehenden Ankündigungen:

- `title`: Talk-Thema + Speaker + Event (z. B. „KI als Produktmotor … – Tom
  Fischer bei den AI Nights #05“)
- `description`: 1–2 Sätze mit Speaker, Rolle, Thema
- `image`: Speaker-Foto (vorher ggf. Skill `optimize-images` laufen lassen)
- `tags`: immer `speaker-ankuendigung` + Stadt + 1–2 Themen-Tags

Aufbau des Textes (an bestehenden Posts orientieren, z. B.
`ki-kritische-infrastrukturen-martin-hofmann-ai-nights-05.md`):

1. Intro-Satz je nach Slot (Slot 1 „Auftakt“, Slot 2 „weiter geht's“,
   Slot 3 „Lineup komplett“)
2. `## Worum geht es in diesem Talk?` — 2 Absätze aus Session-Beschreibung
3. `## Das nimmst du mit` — Bullets aus `keyTakeaways` (nur falls vorhanden)
4. `## Über <Speaker>` — Bio + Link aufs Speaker-Profil
5. `## <Event> auf einen Blick` — Datum, Einlass, Ort + Ticket-Link zum Event

Ton: konkret und nahbar wie die Event-Texte, keine erfundenen Fakten,
keine Superlative, die nicht aus den Daten kommen.
