---
name: event-namecards
description: Erzeugt druckfertige Namenskarten (Vorder-/Rückseite, 8 pro Bogen) für ein AI-Nights-Event, indem zwei Canva-Vorlagen direkt bearbeitet werden — Team/Speaker über die Team-Vorlage, echte Gästeliste über die Gäste-Vorlage, alles in einer PDF. Anwenden, wenn vor einem Event Namensschilder gebraucht werden.
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
node scripts/generate-namenskarten.mjs <event-slug> --guests-only --suffix v2   # Nachzügler
```

**Läuft nur lokal:** Der Abruf braucht `.env` mit dem Digistore24-Key, und
`digistore24.com` ist aus der Cloud-Session nicht erreichbar. Zum Rendern
selbst braucht es ausserdem `poppler-utils` (`pdftoppm`, `pdftotext`).

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
     "speakers": [{ "firstName": "...", "lastName": "...", "company": "Titel/Rolle" }],
     "attendees": [{ "firstName": "...", "lastName": "...", "company": "" }]
   }
   ```
   - `staff` ist die **feste Standard-Crew, die bei jedem Event dabei ist**:
     Andreas Pabst (Founder AXDN & AI Consultant), Tom Duchow (Event Tech
     Manager), Orion Ada (Door Manager), Felix Rosenthal (Door Manager),
     Marko Börner (Design Offices), Cassandra Perl (Club Manager club199).
     Vor dem Rendern kurz gegenchecken, ob sich die Liste seit dem letzten
     Event geändert hat.
   - `speakers` sind die Speaker des Abends (aus `event.speakerIds` /
     `src/content/speaker/`) — `company` trägt hier Titel/Rolle statt
     Firma (z. B. "CIO Infra Fürth"). Ein Speaker-Datensatz mit mehreren
     Personen (z. B. "Tim Junge & Markus Utomo") wird für die Karten in
     einzelne Einträge gesplittet — jede Person kriegt eine eigene Karte.
     `staff` + `speakers` laufen über die **Team-Vorlage**
     (`team-template.pdf`, siehe Layout-Abschnitt), nicht über die
     Gäste-Vorlage.
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
   - **Nachzügler-Druck (`_v2`)**: Kommen nach dem ersten Druck weitere
     Käufer:innen dazu, nur diese in `attendees` stehen lassen (die bereits
     gedruckten rausnehmen) und so rendern:
     ```bash
     node scripts/generate-namenskarten.mjs <event-slug> --guests-only --suffix v2
     ```
     `--guests-only` lässt die Team-/Speaker-Bögen weg (die sind beim ersten
     Druck schon rausgegangen — spart Papier), `--suffix v2` schreibt nach
     `<event-slug>_v2.pdf`, damit die erste Fassung erhalten bleibt. Die
     2 Blanko-Gästekarten laufen auch hier mit.
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

- **Zwei Vorlagen** (**nicht anfassen**, beide Canva-Exporte mit
  2×4-Karten-Raster pro Seite und identischem Koordinatenraster):
  - `scripts/assets/namenskarten/template.pdf` — für `attendees` (Gäste).
  - `scripts/assets/namenskarten/team-template.pdf` — für `staff` +
    `speakers`. Slots 0-3 pro Seite sind im Vorlagen-Artwork mit
    "SPEAKER" beschriftet (seitliche Vertikalschrift), Slots 4-7 mit
    "TEAM" — reine Deko, wird nie überschrieben. `speakers` und `staff`
    laufen darum als zwei getrennte 4er-Warteschlangen statt einer
    durchlaufenden Liste: Seite 1 füllt zuerst die 4 Speaker-Slots (aus
    `speakers`), dann die 4 Team-Slots (aus `staff`); reicht eine Gruppe
    über 4 Personen hinaus, entstehen weitere Seiten, auf denen die
    jeweils andere Gruppe leer bleibt.
  - Beide Vorlagen landen in **einer** Ausgabedatei: erst alle
    Team-/Speaker-Seiten, danach alle Gäste-Seiten, jeweils als
    Vorderseite→Rückseite-Paare.
- 8 Personen pro Vorderseite; bei mehr Personen als Plätzen entstehen
  mehrere Vorder-/Rückseiten-Paare. Nicht belegte Slots auf der letzten
  Seite bleiben leer (Logo/Datum/Footer bleiben stehen, nur die drei
  Namensfelder sind weiß).
- Jede Ausgabe bekommt automatisch **2 Blanko-Gästekarten** dazu
  (`BLANK_GUEST_CARDS` in `generate-namenskarten.mjs`) — Firmenfeld
  "Guest", Name leer, für Walk-ins ohne Vorab-Ticket zum Vor-Ort-Ausfüllen.
  Kein Eintrag in der `<event-slug>.json` nötig, läuft immer mit.
- Datum kommt aus `event.eventDate`, kompakt als `MON JJ` (z. B. "SEP 26")
  — das Datumsfeld im Header ist nur ~68pt breit, der volle Tag ist fürs
  Namensschild ohnehin nicht relevant.
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

- **Datumsfeld:** sitzt auf dem Verlaufs-Header, nicht auf Weiß. Ein
  flächiges Rechteck in EINER abgetasteten Farbe (die ursprüngliche
  Lösung) sah dort wie ein sichtbar falsch getönter Aufkleber aus — der
  Verlauf ändert sich leicht über die Feldbreite, und schon eine
  Abweichung von wenigen RGB-Werten fällt an einer scharfen Rechteckkante
  sofort auf. Fix: `buildDatePatch()`/`drawDatePatch()` schneiden einen
  echten, textfreien Streifen des Verlaufs aus einer gerasterten Version
  der Vorlage aus (`pdftoppm`, 300dpi) und strecken ihn über die
  Zielhöhe — der Verlauf ändert sich nur horizontal, nie vertikal, darum
  ist das Strecken verlustfrei und garantiert pixelgenau statt geraten.
  Die `padTop`/`padBottom`-Polsterung, die die Großbuchstaben-Oberlängen
  des alten "<AIN DATUM>"-Platzhalters abdeckt, darf dabei den echten
  oberen Rand des Headers (topdown y≈39,6pt) nicht überschreiten — sonst
  entsteht eine sichtbare zusätzliche Stufe oberhalb des Headers, weil
  der Patch dann über die eigentliche Kopfleiste hinausragt.

## Nicht anfassen

- Die Rückseite ist für jede Karte identisch und generisch (kein
  Namensfeld) — wird 1:1 aus der Vorlage kopiert, nie bearbeitet.
