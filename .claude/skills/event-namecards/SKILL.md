---
name: event-namecards
description: Erzeugt druckfertige Namenskarten (Vorder-/Rückseite, 8 pro Bogen) für ein AI-Nights-Event, indem die Canva-Vorlage direkt bearbeitet wird — feste Crew immer zuerst, dann die echte Gästeliste. Anwenden, wenn vor einem Event Namensschilder gebraucht werden.
---

# Namenskarten für ein Event erzeugen

Bearbeitet die Canva-Namenskarten-Vorlage direkt (Platzhalterfelder
ausweißen, Name/Firma/Rolle reinschreiben) statt das Design nachzubauen —
Logo, Farbverlauf, Deko-Icons und die generische Rückseite bleiben dadurch
1:1 wie im Original. Reihenfolge im PDF immer Vorderseite → Rückseite →
Vorderseite → Rückseite, fürs Duplex-Drucken.

## Ablauf

```bash
node scripts/fetch-namenskarten-guests.mjs <event-slug>   # Gästeliste per API holen
node scripts/generate-namenskarten.mjs <event-slug>       # PDF rendern
```

Beispiel:

```bash
node scripts/fetch-namenskarten-guests.mjs ai-nights-nuernberg-05
node scripts/generate-namenskarten.mjs ai-nights-nuernberg-05
```

1. **Gästeliste zusammenstellen** unter
   `scripts/data/namenskarten/<event-slug>.json`:
   ```json
   {
     "staff": [{ "firstName": "...", "lastName": "...", "company": "Rolle/Firma" }],
     "attendees": [{ "firstName": "...", "lastName": "...", "company": "" }]
   }
   ```
   - `staff` ist die **feste Standard-Crew, die bei jedem Event dabei ist**
     und deshalb immer zuerst auf Karte 1 landet:
     Andreas Pabst (Founder AXDN & AI Consultant), Tom Duchow (Event Tech
     Manager), Orion Ada (Door Manager), Felix Rosenthal (Door Manager),
     Marko Börner (Design Offices), Cassandra Perl (Club Manager club199).
     Vor dem Rendern kurz gegenchecken, ob sich die Liste seit dem letzten
     Event geändert hat.
   - `attendees` ist die echte Gästeliste — **per API holen, nicht mehr
     manuell abtippen:**
     ```bash
     node scripts/fetch-namenskarten-guests.mjs <event-slug>
     ```
     Schreibt/ersetzt nur `attendees` in der Datei, `staff` bleibt
     unangetastet. Holt aus:
     - **Digistore24** (funktioniert): braucht `DIGISTORE24_API_KEY_READONLY`
       (oder `DIGISTORE24_API_KEY`) in `.env` im Repo-Root. Auth-Header ist
       **`X-DS-API-KEY`** (nicht `X-DS24-API-KEY` — leicht zu verwechseln).
       Filtert automatisch Testkäufe raus (`transaction_pay_method === 'Test'`
       — Digistore24s eigenes Kennzeichen; taucht in `listPurchases`
       standardmäßig mit auf, anders als im `sales.ainights.ai`-Dashboard).
       Produkt-ID kommt aus `platforms.digistore` im Event-JSON (die Zahl
       am Ende der Checkout-URL).
     - **Eventbrite** (optional, `EVENTBRITE_API_KEY` in `.env`): nur falls
       das Event dort tatsächlich verkauft (`platforms.eventbrite` im
       Event-JSON). **Wichtig:** Eventbrite hat mehrere Schlüsseltypen —
       nur der **Private Token** (Account-Settings → Developer Links → API
       Keys) funktioniert als Bearer-Token für `/v3/events/{id}/attendees/`.
       Der "API Key" / "Client Secret" von der App-Verwaltungsseite
       authentifiziert NICHT direkt (führt zu `401 INVALID_AUTH`) — das
       Skript erkennt das, warnt klar und macht mit den übrigen Kanälen
       weiter statt abzubrechen.
     - Joinify wird hier bewusst NICHT abgefragt — `list_ticket_holders`
       liefert für Events mit Digistore24-Checkout erwartungsgemäß `[]`
       (kein direkter Joinify-Checkout), das per MCP abzufragen bringt
       nichts zusätzliches. Falls ein Event doch über Joinify verkauft,
       braucht `list_ticket_holders` den Parameter **`slug`** (nicht
       `id`/`reference`!) — Joinify-Slug über `list_events` auflösen
       (Referenz ≠ Slug, siehe `free-ticket-vouchers`-Skill).
     - Kein Firmenfeld bei Digistore24 — bewusst leer lassen statt zu raten
       (nicht aus der E-Mail-Domain ableiten).
   - **Nach dem Abruf kurz gegenlesen**, bevor gerendert wird: Digistore24s
     `first_name`/`last_name`-Felder übernehmen offensichtliche Tippfehler
     der Käufer:innen 1:1 (z. B. "Domink" statt "Dominik", erkennbar am
     Abgleich mit der E-Mail-Adresse) — vor dem Drucken von Hand korrigieren.
2. Rendert nach `public/media/namenskarten/<event-slug>.pdf`:
   ```bash
   node scripts/generate-namenskarten.mjs <event-slug>
   ```
3. Ohne Gästeliste (Datei fehlt oder leer) bricht das Skript mit einer
   klaren Meldung ab, statt ein leeres PDF zu erzeugen.

## Datenschutz — niemals auf /tools/ verlinken

**Die Namenskarten-PDF enthält echte Namen von Ticketkäufer:innen (PII) und
darf deshalb NIEMALS auf `src/pages/tools/index.astro` verlinkt oder
gelistet werden**, obwohl diese Seite selbst schon `noindex` ist — `/tools/`
ist als offen durchsuchbare Übersicht aller Produktionsmedien gedacht, kein
Ort für personenbezogene Daten. Das war einmal versehentlich passiert (ein
`namenskartenFor()`-Helper + sichtbarer Link-Block dort) und wurde explizit
als Datenschutzproblem korrigiert — bei künftigen Änderungen an diesem
Skill oder an `/tools/` darauf achten, dass das nicht wieder passiert.

Der einzige vorgesehene Zugriffsweg ist der unsichtbare Kurzlink unten.

## Kurzlink fürs Türteam

`<event-page-url>/namecards/` (z. B. `/events/ai-nights-nuernberg-05/namecards/`)
leitet direkt auf die PDF weiter — `src/pages/events/[slug]/namecards.astro`,
generiert per `getStaticPaths()` nur für Events, die tatsächlich eine
gerenderte `public/media/namenskarten/<slug>.pdf` haben.

**Bewusst nirgendwo verlinkt und nicht auffindbar:**
- `noindex, nofollow` per Meta-Tag auf der Redirect-Seite selbst.
- Aus der Sitemap gefiltert (`filter` in der `sitemap()`-Integration,
  `astro.config.mjs`).
- Per `robots.txt` gesperrt (`Disallow: /events/*/namecards/`).

Bei einer neuen Route mit sensiblen/internen Dokumenten dieses Dreiklang
(noindex + Sitemap-Filter + robots.txt) als Vorlage nehmen.

## Layout

- Vorlage (**nicht anfassen**, Canva-Export mit 2×4-Karten-Raster pro
  Seite): `scripts/assets/namenskarten/template.pdf`.
- 8 Personen pro Vorderseite; bei mehr Personen als Plätzen entstehen
  mehrere Vorder-/Rückseiten-Paare. Nicht belegte Slots auf der letzten
  Seite bleiben leer (Logo/Datum/Footer bleiben stehen, nur die drei
  Namensfelder sind weiß).
- Datum kommt aus `event.eventDate`, kompakt als `TT.MM.JJJJ` (das
  Datumsfeld im Header ist nur ~68pt breit).
- Vorname/Nachname/Firma schrumpfen automatisch in ihre Boxbreite
  (gleiches Prinzip wie `textImg` in `scripts/lib/social-kit.mjs`, nur mit
  `pdf-lib`-Textmetriken) — verhindert Überlauf bei langen Namen wie „Paul
  Vicente Hernandez Moreno".
- Die Boxkoordinaten in `generate-namenskarten.mjs` (`SLOT`, `COL_DX`,
  `ROW_DY`) stammen aus `pdftotext -bbox-layout` der Vorlage. Ändert sich
  die Vorlage (neues Canva-Design), müssen diese Koordinaten neu
  abgemessen werden — am schnellsten so:
  ```bash
  pdftotext -bbox-layout scripts/assets/namenskarten/template.pdf -
  ```
- **MediaBox-Falle:** `pdftotext -bbox-layout` misst relativ zur CropBox
  (Ursprung oben links bei 0), `pdf-lib` zeichnet aber relativ zur
  MediaBox — und Canva-Exporte haben oft einen MediaBox-y-Ursprung ≠ 0
  (bei dieser Vorlage 7.92pt). Ohne den Ausgleich landen alle gezeichneten
  Boxen ein paar Punkte zu weit unten (führte hier dazu, dass das
  Ausweißen des Firmenfelds die durchgezogene Trennlinie darunter mit
  wegradierte — unterbrochen statt durchgezogen). Das Skript liest den
  Offset deshalb zur Laufzeit selbst aus (`template.getPage(0).getMediaBox().y`,
  Variable `PAGE_ORIGIN_Y`) statt ihn hart zu codieren — bei einem neuen
  Canva-Export bleibt das also automatisch korrekt. Gleiches Prinzip gilt
  für jedes andere Skript, das eine bestehende PDF per `pdf-lib` bearbeitet.

## Nicht anfassen

- Die Rückseite ist für jede Karte identisch und generisch (kein
  Namensfeld) — wird 1:1 aus der Vorlage kopiert, nie bearbeitet.
- Das Datumsfeld sitzt auf dem pinken Verlaufs-Header, nicht auf Weiß —
  deshalb wird dort mit der abgetasteten Verlauf-Hintergrundfarbe
  (`HEADER_BG`) ausgeweißt statt mit Weiß, sonst entsteht ein sichtbarer
  weißer Fleck.
