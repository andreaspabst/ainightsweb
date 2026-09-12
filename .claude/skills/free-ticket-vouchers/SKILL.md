---
name: free-ticket-vouchers
description: >-
  Legt Joinify-Gutscheincodes für 5 Freitickets an — für Speaker/Moderatoren
  UND Sponsoren, pro Event, in dem sie auftreten. Proaktiv prüfen, sobald bei
  einem Event ein neuer Speaker/Moderator bestätigt wird ODER sich das
  Sponsoren-Line-up ändert (speakerIds/moderatorIds/sponsorIds in
  src/content/events/<slug>.json). Vor dem tatsächlichen Anlegen eines
  Gutscheins immer beim Nutzer bestätigen lassen (echte, live nutzbare
  Freitickets auf einer produktiven Ticket-Plattform).
---

# Freiticket-Gutscheine (Speaker & Sponsoren)

Jeder Speaker/Moderator und jeder Sponsor bekommt pro Event, bei dem er
auftritt bzw. sponsert, **einen Joinify-Gutschein für 5 Freitickets** (100 %
Rabatt, 5-mal einlösbar).

## Wann prüfen

- Ein Event bekommt einen neuen Eintrag in `speakerIds`/`moderatorIds`
  oder `sponsorIds` (z. B. im Zuge eines Speaker-Wechsels oder eines neuen
  Sponsoring-Deals).
- Ein komplett neuer Speaker/Sponsor wird angelegt und direkt einem Event
  zugeordnet.

Nicht bei jeder Kleinigkeit erneut prüfen — nur wenn sich das Line-up eines
Events tatsächlich ändert.

## Ablauf

1. **Betroffene Entities ermitteln:** für das geänderte Event alle
   Speaker/Moderatoren (`src/content/speaker/<id>.json`, per `id`-Feld
   gematcht) und Sponsoren (`src/content/sponsor/<id>.json`) laden.
2. **Bereits vorhanden?** Prüfen, ob `voucherCodes` im jeweiligen JSON
   schon einen Eintrag mit `eventSlug` = Event-Slug enthält. Falls ja:
   nichts tun, überspringen.
3. **Ticket-Shop des Events ermitteln** (`platforms` im Event-JSON, siehe
   Skill `event-platforms`):
   - **Joinify vorhanden** (`platforms.joinify` = die *reference*, z. B.
     `vsjz372c`, wie sie auch in der Checkout-URL steht): weiter mit
     Schritt 4.
   - **Nur Digistore24:** Digistore24 hat keinen MCP/keine API hier —
     Gutscheine dort müssten manuell im Digistore24-Backend angelegt
     werden (Chrome-Fernsteuerung, kein fertiges Playbook). Das dem Nutzer
     explizit sagen statt es stillschweigend zu überspringen.
4. **Reference → Joinify-Slug auflösen:** `create_voucher` erwartet den
   internen Joinify-*Slug* des Events (z. B. `ai-nights-nurnberg-05-autumn`),
   NICHT die *reference* aus dem Event-JSON (`vsjz372c`). Auflösen über
   `list_events` (MCP) — dort `reference` mit `platforms.joinify`
   abgleichen und das zugehörige `slug`-Feld nehmen.
5. **Code nach Schema erzeugen:**
   - Speaker/Moderator (Person): `VOR-NAC-000-000` — je 3 Großbuchstaben
     von Vor- und Nachname (aus `title`, z. B. „Martin Hofmann" →
     `MAR-HOF`), gefolgt von zwei zufälligen 3-stelligen Zahlenblöcken.
     Bei Namen mit Umlauten transliterieren (ä→AE Kürzel vermeiden, einfach
     auf 3 Buchstaben ohne Sonderzeichen kürzen).
   - Sponsor (Unternehmen): gleiches Schema, aus den ersten beiden
     "sprechenden" Wörtern des Firmennamens (`title`), z. B. „Infra Fürth"
     → `INF-FUR-000-000`. Bei einem einzelnen Wort die ersten 6 Buchstaben
     in zwei 3er-Blöcke teilen. Das ist eine Heuristik — bei unklaren
     Firmennamen (Abkürzungen, Rechtsform voran/hinten wie „GmbH") das
     Ergebnis kurz gegenlesen, bevor es angelegt wird.
   - Vor dem Anlegen `list_vouchers` (MCP) prüfen, dass der generierte Code
     nicht schon existiert — sonst neue Zufallszahlen ziehen.
6. **Beim Nutzer bestätigen**, bevor der Gutschein tatsächlich live
   angelegt wird (Name/Firma, Event, generierter Code) — das ist ein echter,
   sofort einlösbarer Freiticket-Code auf einer produktiven Plattform.
7. **Anlegen** per `create_voucher`:
   ```
   type: "percent"
   value: 100
   code: "<generierter Code>"
   max_redemptions: 5
   product_slug: "<aufgelöster Joinify-Slug>"
   ```
8. **Zurückschreiben** in `src/content/speaker/<id>.json` bzw.
   `src/content/sponsor/<id>.json`:
   ```json
   "voucherCodes": [
     { "eventSlug": "ai-nights-nuernberg-05", "code": "MAR-HOF-482-761" }
   ]
   ```
   (`eventSlug` = Slug aus `src/content/events/`, nicht der Joinify-Slug.)
9. Ergebnis dem Nutzer mitteilen (wer, welches Event, welcher Code) — für
   die Weitergabe an Speaker/Sponsor per E-Mail o. ä. ist der Nutzer
   zuständig, das übernimmt dieser Skill nicht automatisch.

## Bereits vergebene Codes (zur Orientierung/Kollisionsprüfung)

Aus `list_vouchers` bekannt (Stand bei Skill-Erstellung), Schema bestätigt:
`AND-PAB-557-707` (Andreas Pabst), `AND-HEC-242-278`, `ALE-KEY-774-981`,
`PHI-RIE-648-661` (dort `max_redemptions: 2`, also ein Sonderfall — beim
neuen Anlegen trotzdem immer 5 verwenden, außer der Nutzer sagt etwas
anderes).

## Nicht anfassen / Grenzen

- Keine Gutscheine ohne Bestätigung des Nutzers live anlegen.
- Keine Digistore24-Gutscheine automatisiert anlegen (keine API/kein MCP
  dafür vorhanden) — nur benennen, dass das manuell nötig wäre.
- `product_slug` bei `create_voucher` ist der Joinify-*Slug*, nicht die in
  `platforms.joinify` gespeicherte *reference* — immer über `list_events`
  auflösen, sonst landet der Gutschein ungewollt eventübergreifend gültig
  (Parameter weggelassen) oder der Aufruf schlägt fehl.
