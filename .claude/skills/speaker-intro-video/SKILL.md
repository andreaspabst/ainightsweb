---
name: speaker-intro-video
description: Rendert pro Speaker ein 35-Sekunden-Talk-Intro-Video (1920×1080, ohne Ton) im AI-Nights-Look — rundes S/W-Portrait, Name, Rolle, Talk-Titel und Job-Titel, auf Basis der Vorlage aus "SPEAKERS INTRO AIN05.zip". Proaktiv anwenden, sobald ein Event-Line-up für die nächsten AI Nights Nürnberg steht — jeder Talk-Slot braucht so ein Video.
---

# Speaker-Intro-Videos rendern

Für jeden bestätigten Talk bei den AI Nights Nürnberg gehört ein kurzes
Intro-Video (wird vor dem Talk auf dem Bildschirm gezeigt). Vorlage und
Referenz kamen vom Nutzer als `SPEAKERS INTRO AIN05.zip` (enthält
`SPEAKER-INTRO-BLANK.mp4` als leere Vorlage und `ANDREAS PABST.mp4` als
fertiges Referenzbeispiel).

## Ablauf

```bash
node scripts/render-speaker-intro.mjs <speaker-slug> [event-slug]
```

Beispiel:

```bash
node scripts/render-speaker-intro.mjs martin-hofmann ai-nights-nuernberg-05
```

- Liest Name, Foto, Rolle (`role: speaker|moderator`) und Jobtitel aus
  `src/content/speaker/<slug>.json`.
- Sucht optional (wenn `event-slug` angegeben ist) den Talk-Titel: durchsucht
  `src/content/sessions/*.json` nach der Session, die sowohl in
  `events/<event-slug>.json` → `sessionIds` als auch beim Speaker in
  `speakerIds` auftaucht.
- Rendert das Ergebnis nach `public/media/speaker-intros/<slug>.mp4` —
  Website-Asset wie die Speaker-Announcement-Grafiken, wird Teil des Repos
  und taucht automatisch pro Event auf `/tools/` auf
  (`src/pages/tools/index.astro`, noindex, nirgends verlinkt — interne
  Übersicht, prüft per `fs.existsSync`, ob die Datei existiert).

## Aufbau

Basis ist `scripts/assets/speaker-intro/template-blank.mp4` (35s, 1920×1080,
ohne Ton, animierter Partikel-Hintergrund + Logo, diagonal in Violett/Magenta
geteilt, **ohne** eingebrannte Platzhalterform — **nicht verändern**, das ist
die Design-Vorlage). Das Skript legt einen einzigen statischen Overlay-Frame
(transparentes PNG, per `sharp`/Pango-Text gerendert, dann mit `ffmpeg
overlay` für die volle Videolänge draufgelegt) mit folgenden Elementen drauf:

| Element | Position (x,y) | Schrift |
| --- | --- | --- |
| Rundes S/W-Portrait | Kreis-Zentrum (380, 540), Radius 340, vollständig im Bild | — |
| Name | (800, 280) | Inter Black, groß |
| Rolle ("AI Nights Speaker" / "AI Nights Host & Moderator") | (800, 415) | Inter Medium |
| Talk-Titel | (800, 625) | Inter Bold, bricht bei Bedarf auf 2 Zeilen um |
| Job-Titel | (800, 800) | Inter Medium |

Talk-Titel/Job-Titel liegen bewusst unterhalb y≈600 — dort beginnt im
Hintergrundvideo der magenta Bereich, in den diese beiden Zeilen optisch
gehören (Name/Rolle bleiben im dunkelvioletten oberen Bereich).

`NAME_X` wird im Skript relativ zum Kreis berechnet (`CIRCLE.cx + CIRCLE.r +
80`), damit Foto und Text bei einer künftigen Größenänderung des Kreises
automatisch im Abstand zueinander bleiben.

Alle Textgrößen schrumpfen automatisch, bis sie in die vorgesehene Breite/Höhe
passen (wie bei `scripts/generate-speaker-announcements.mjs`).

Foto, Name, Rolle, Talk-Titel und Job-Titel blenden nacheinander gestaffelt
ein statt von Frame 0 an fertig dazustehen — mit drei unterschiedlichen,
moderneren Eintritts-Effekten statt eines einheitlichen Fades:

- **Foto: Ken-Burns-Zoom** — durchgehender, langsamer Zoom übers ganze Video
  (`buildKenBurnsPhoto`, PNG-Sequenz statt alpha-codiertem Video, um
  Codec-Fallstricke zu vermeiden).
- **Name: Kinetic Typography** — wortweise gerendert und nacheinander
  eingeblendet statt der ganzen Zeile auf einmal. Da jedes Wort einzeln
  leicht in `maxWidth` passt, wird zusätzlich die GESAMTBREITE aller Wörter
  zusammen geprüft und bei Bedarf die Schrift für alle Wörter gemeinsam
  verkleinert — sonst laufen lange Namen wie „Andreas Pabst („IT Pabst“)“
  rechts aus dem Bild.
- **Talk-Titel: Wipe-Reveal** — wächst von links nach rechts ein (`geq` mit
  `alpha(X,Y)*if(lt(X,(T-ST)/DUR*W),1,0)` direkt auf dem RGBA-Textlayer;
  **nicht** über `crop` mit wachsender Breite — dessen `w`/`h`-Parameter
  akzeptieren in dieser ffmpeg-Version keine Zeitausdrücke mit `t` — und
  **nicht** über eine separate Masken-Datei + `alphamerge`, das den
  Alphakanal komplett ERSETZEN statt MULTIPLIZIEREN würde und dadurch die
  eigentlich transparenten Bereiche zwischen den Buchstaben nach dem Reveal
  zu undurchsichtigem Schwarz macht).
- **Rolle/Job-Titel**: bisheriger Fade + dezenter Slide-in aus ~28px von
  links nach rechts (`SLIDE_PX` im Skript, `overlay=x=<Ausdruck>`-
  Zeitfunktion je Layer).

Für Moderator:innen ohne eigenen Talk-Slot kann `moderatorLabel` im
Speaker-JSON (z. B. `"Event Host & Moderator"`, `"Moderatorin"`) den
generischen Rollentext überschreiben — hat die Person einen Talk-Slot
(`findTalk` liefert einen Titel), wird das Feld ignoriert und der
generische Text `"AI Nights Host & Moderator"` verwendet.

**Bekannte Abweichungen vom Original** (bewusste Vereinfachung für Version 1,
bei Bedarf verfeinern):
- Schrift ist Inter (Website-Schrift) statt der etwas runderen Schrift im
  Original — visuell nah dran, aber nicht pixelgleich.

## Voraussetzungen

- `ffmpeg` im `PATH`.
- Die Schriften "Inter" (mehrere Schnitte: Regular/Medium/SemiBold/Bold/
  Black) müssen als Systemschrift installiert sein — Pango/`sharp` rendert
  den Text, genau wie bei `scripts/generate-speaker-announcements.mjs`. Falls
  `Inter Black` o. ä. nicht gefunden wird, fällt Pango auf eine andere Schrift
  zurück (kein Fehler, aber optisch abweichend) — mit `fc-list | grep Inter`
  prüfen.

## Nicht anfassen

- `scripts/assets/speaker-intro/template-blank.mp4` — das ist die Design-
  Vorlage, nicht neu erzeugen oder überschreiben.
