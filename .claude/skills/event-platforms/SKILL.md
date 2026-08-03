---
name: event-platforms
description: >-
  Hält AI-Nights-Events über alle Plattformen synchron (Ticket-Shop: Joinify
  oder Digistore24; Listings: Eventbrite, Meetup, Luma). Anwenden, sobald ein
  neues Event unter src/content/events/ angelegt wird ODER sich bei einem
  bestehenden Event Datum, Uhrzeit, Titel, Preis, Venue oder das
  Line-up (speakerIds/sessionIds) ändert. Fragt den Nutzer, welche Plattformen
  angelegt/aktualisiert werden sollen, erledigt das per MCP bzw.
  Chrome-Fernsteuerung und pflegt die Plattform-IDs im Event-JSON.
---

# Event-Plattformen (AI Nights)

Jedes AI-Nights-Event existiert auf mehreren Plattformen. Dieses Skill sorgt
dafür, dass beim Anlegen und bei Änderungen nichts auseinanderläuft.

## Rollen der Plattformen

| Plattform | Rolle | Steuerung |
| --- | --- | --- |
| **Joinify** (joinify.net) | Ticket-Shop — **bevorzugt** | MCP-Connector nur lesend; Anlegen/Ändern per Chrome-Fernsteuerung |
| **Digistore24** (checkout-ds24.com) | Ticket-Shop — Alt/Fallback | Chrome-Fernsteuerung |
| **Eventbrite** (eventbrite.de) | Reichweite + eigener Ticketverkauf | Chrome-Fernsteuerung |
| **Meetup** (meetup.com/ai-nights-nurnberg) | Reichweite, KEIN Verkauf — verlinkt den Shop | Chrome-Fernsteuerung |
| **Luma** (lu.ma) | Reichweite (optional) | Chrome-Fernsteuerung |

**Die Website verlinkt IMMER GENAU EINEN Shop** (`ticketUrl` im Event-JSON):
Joinify, falls das Event dort existiert — sonst Digistore24. Niemals
Eventbrite/Meetup/Luma als `ticketUrl` eintragen.

## Ablauf bei einem NEUEN Event

1. **Fragen (AskUserQuestion):**
   - Ticket-Shop: **Joinify.net** (empfohlen) oder **Digistore24**?
   - Soll das Event dort **gleich angelegt** werden?
   - Zusätzlich anlegen/prüfen (Mehrfachauswahl): **Eventbrite**?
     **Meetup**? **Luma**?
2. Shop anlegen (Joinify bzw. Digistore24, siehe Playbooks unten),
   Referenz/ID notieren.
3. `ticketUrl` im Event-JSON auf die Shop-URL setzen (Joinify:
   `https://joinify.net/app/products/<ref>/tickets`). Nackte URL ohne
   Tracking-Parameter — das Tracking übernimmt das `jtr=`/`ds24tr=`-Script
   (siehe Skill `ticket-tracking`).
4. Gewünschte Listings anlegen (Eventbrite/Meetup/Luma, Playbooks unten).
5. **Alle IDs im Event-JSON unter `platforms` speichern** (siehe unten).
6. Preis-Parität prüfen (siehe unten), dann Build + `check-links` +
   `seo-audit` laufen lassen und pushen (Repo-Workflow).

## Ablauf bei ÄNDERUNGEN (Datum, Uhrzeit, Titel, Preis, Venue, Line-up)

1. Anhand `platforms` im Event-JSON ermitteln, wo das Event überall existiert.
2. **Fragen**, ob die Änderung auf den jeweiligen Plattformen gleich
   „glattgezogen" werden soll (pro Plattform bestätigen lassen).
3. Änderungen per MCP/Browser ausführen und verifizieren (Publish-Status,
   Datum, Ort, Preis nach dem Speichern gegenlesen).

## Plattform-IDs im Event-JSON

Im jeweiligen `src/content/events/<slug>.json` (Schema:
`src/content.config.ts`, Feld `platforms` — alle Einträge optional):

```json
"platforms": {
  "joinify": "z796hp9d",
  "digistore": "https://www.checkout-ds24.com/product/693461",
  "eventbrite": "1996516290971",
  "meetup": "314819026",
  "luma": "https://lu.ma/<slug>"
}
```

## Preis-Parität

Eventbrite und der in Meetup verlinkte Shop müssen **denselben Ticketpreis**
zeigen wie der Shop (Joinify/Digistore24) — Teilnehmer sollen nirgends mehr
oder weniger zahlen. Nach jedem Anlegen/Preisänderung:

- Shop-Preis als Referenz nehmen (Joinify-Adminseite bzw. Digistore).
- Eventbrite: Preis unter „Tickets" vergleichen und ggf. angleichen.
  Achtung: „Event kopieren" erbt Preis/Kapazität des Quell-Events —
  nach dem Kopieren IMMER gegen den Shop-Preis prüfen.
- Meetup verkauft selbst nichts — dort zählt nur der korrekte Shop-Link.

## Playbook Joinify (Chrome)

MCP-Connector (`list_events`, `get_event`) nur zum Verifizieren nutzen —
**Anlegen geht nur per Browser** im eingeloggten Chrome:

1. `https://joinify.net/manage/products/create` — 5-Schritte-Wizard
   (Basic Info → Date & Time → Location → Capacity → Settings).
2. Schritt 1 per `form_input` (Titel, Beschreibung = Website-Titelzeile +
   Excerpt + Format-Absatz, Kategorie „meetup").
3. „Next" reagiert nicht zuverlässig auf ref-Klicks → JS:
   `[...document.querySelectorAll('button')].find(b=>/next/i.test(b.textContent)).click()`
   mit ~700 ms Wartezeit und Step-Assertion danach.
4. Datums-/Zeitfelder: `form_input` auf die `type=date`/`type=time`-Felder —
   **nach dem Wizard-Durchlauf im Summary-Screen das Datum gegenlesen**
   (der Wizard verwirft Werte gelegentlich).
5. Venue: bestehende per `<select>`-Value setzen (Native-Setter + change),
   neue über Radio „Neue Venue erstellen" + Name/Stadt/Land.
6. Nach „Create Event": Referenz aus der URL (`/manage/products/<ref>`).
7. Titelbild: `/manage/products/<ref>/images` — Datei-Upload per JS-Injektion
   (Chrome blockt lokale Pfade):
   `fetch('https://images.weserv.nl/?url=ainights.ai<bildpfad>&output=png')`
   → Blob → `File` → `DataTransfer` → `input.files` + `change`-Event.
   Erfolg = „Header-Bild entfernen"-Button erscheint.
8. Publish auf der Eventseite per JS-Klick, danach Status `published`
   verifizieren (auch via MCP `list_events`).
9. Öffentliche Ticketseite: `https://joinify.net/app/products/<ref>/tickets`.

## Playbook Digistore24 (Chrome)

Kein MCP. Im eingeloggten Chrome ein bestehendes AI-Nights-Produkt
duplizieren, Titel/Termin/Preis anpassen, Checkout-URL
(`https://www.checkout-ds24.com/product/<id>`) notieren.

## Playbook Eventbrite (Chrome)

1. Quell-Event wählen (letztes vergleichbares Event) und kopieren:
   `https://www.eventbrite.de/myevent/<quell-id>/copy/` — übernimmt
   Beschreibung, Agenda, FAQ, Referenten, Banner, Tags, Tickets.
2. Formularfelder im Kopier-Dialog sind React-kontrolliert →
   Native-Setter-JS (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,
   'value').set.call(el, wert)` + input/change/blur-Events).
   Titel-Muster: `AI Nights | INSPIRE ✨ #NN - <Motto>!`
   (München: `AI Nights München | INSPIRE ✨ #NN - <Motto>!`).
3. Neue Event-ID aus der Dashboard-URL nach dem Kopieren.
4. Venue ändern: `/manage/events/<id>/details` → Ort-Karte anklicken →
   Suchfeld leeren, neuen Ort tippen, Google-Vorschlag anklicken, Speichern.
5. Ortsbezogene Textstellen anpassen (z. B. „im Herzen Nürnbergs",
   „in den Design Offices"): im aktivierten Editor die Textknoten per
   TreeWalker-JS ersetzen (erhält Formatierung), dann Speichern.
6. Publish: `/manage/events/<id>/preview_publish` → „Sofort veröffentlichen",
   Erfolg = Redirect auf `invite-and-promote` + „veröffentlicht".
7. Preis/Kapazität gegen den Shop prüfen (siehe Preis-Parität) —
   Verkaufsstart wird beim Kopieren relativ mitverschoben.

## Playbook Meetup (Chrome)

Gruppe: `https://www.meetup.com/ai-nights-nurnberg/` (für München ggf.
eigene Gruppe erfragen).

1. Vergangenes Event öffnen (`/events/?type=past`) und **„Duplizieren"**
   nutzen — Beschreibung und Struktur bleiben erhalten.
2. Titel/Datum/Uhrzeit/Venue anpassen (Muster wie Eventbrite-Titel).
3. **Pflicht-Muster der Beschreibung** (bei den alten Events abgeschaut):
   Erste UND letzte Zeile lauten
   `⚠️ Bitte Tickets ausschließlich über unsere Eventplatform buchen! ⚠️`
   — dabei ist „Eventplatform" ein **Hyperlink auf den Shop** des Events
   (Joinify-Ticketseite bzw. Digistore-Checkout, je nachdem was das Event
   nutzt). Beim Duplizieren zeigt der Link noch auf den alten Shop →
   **immer auf den aktuellen Shop umbiegen.**
4. Keine Meetup-Tickets/Bezahlung aktivieren — Verkauf läuft nur im Shop.
5. Veröffentlichen und Event-ID aus der URL (`/events/<id>/`) notieren.

## Playbook Luma (Chrome)

1. Prüfen, ob das Event auf lu.ma existiert (Kalender des Accounts).
2. Falls gewünscht anlegen: Titel/Datum/Venue wie oben, Beschreibung kurz +
   Link auf den Shop. URL/ID notieren.

## Nacharbeiten (immer)

- `platforms` + `ticketUrl` im Event-JSON aktualisiert?
- `npm run build` + `node scripts/check-links.mjs` + `node scripts/seo-audit.mjs` grün?
- Push gemäß Repo-Workflow.
