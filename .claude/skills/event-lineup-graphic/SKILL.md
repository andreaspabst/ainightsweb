---
name: event-lineup-graphic
description: Rendert pro Event eine Line-up-Grafik (Instagram 1080×1080 + LinkedIn 1200×627), die alle bestätigten Speaker nebeneinander mit Foto, Name und Jobtitel zeigt. Proaktiv anwenden, sobald ein Event sein volles Speaker-Line-up (i. d. R. 3 Speaker) beisammen hat — für die "Line-up komplett"-Ankündigung auf Social Media.
---

# Event-Line-up-Grafik rendern

Zeigt alle Speaker eines Events auf einen Blick — für den Social-Media-Post,
wenn das Line-up komplett ist (ergänzt die Einzel-Speaker-Grafiken aus
`scripts/generate-speaker-announcements.mjs`).

## Ablauf

```bash
node scripts/generate-event-lineup.mjs <event-slug>
```

Beispiel:

```bash
node scripts/generate-event-lineup.mjs ai-nights-nuernberg-05
```

- Liest `speakerIds` aus `src/content/events/<event-slug>.json`, löst sie zu
  Speaker-Profilen auf und blendet Platzhalter-Slots (`ai-nights-speaker-*`)
  aus — nur bestätigte Speaker landen im Bild.
- Rendert nach `public/media/event-lineups/<event-slug>-instagram.png` und
  `-linkedin.png` — Website-Assets, tauchen automatisch pro Event auf
  `/tools/` auf (`src/pages/tools/index.astro`).
- Ohne mindestens einen bestätigten Speaker bricht das Skript mit einer
  klaren Meldung ab, statt eine leere Grafik zu erzeugen.

## Layout

Gleiche Bausteine wie `scripts/generate-speaker-announcements.mjs` (Logo,
Verlaufsring ums Portrait, Footer mit Datum/Ort/ainights.ai/#AINIGHTS) —
zusätzlich der Event-Titel oben und eine Reihe aus Foto+Name+Jobtitel pro
Speaker. Die Spaltenbreite ergibt sich aus `(verfügbare Breite) / Anzahl
Speaker`; jeder Name/Jobtitel schrumpft automatisch in seine Spalte hinein
(gleiche Auto-Shrink-Technik wie bei den Einzel-Grafiken) — das verhindert
Überlappungen bei langen Namen, langen Jobtiteln oder mehr als 3 Speakern.
Getestet mit 1, 2 und 3 Speakern.

## Nicht anfassen

- Layout ist bewusst variabel (kein fester Speaker-Zähler) — bei 4+ Speakern
  werden die Spalten einfach schmaler statt umzubrechen. Bei sehr vielen
  Speakern (5+) vorher kurz gegenprüfen, ob es noch lesbar bleibt.
