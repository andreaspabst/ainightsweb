---
name: speaker-vouchers
description: Prüft, ob Speaker und Partner einen Joinify-Voucher haben, legt fehlende nach dem Namensschema an und schreibt die fertige LinkedIn-Einladungsnachricht mit Code und Ankündigungsbild. Anwenden, wenn ein Speaker bestätigt wird, wenn nach Voucher-Codes gefragt wird ("Hat X schon einen Code?") oder wenn eine Einladungs-/Danke-Nachricht an Speaker oder Partner rausgehen soll.
---

# Voucher-Codes & Einladungsnachrichten

Jeder bestätigte Speaker bekommt einen eigenen Voucher-Code und eine
persönliche Nachricht mit Code und Ankündigungsbild. Ziel: der Nutzer muss auf
LinkedIn nur noch Copy & Paste machen.

## Namensschema

`<Präfix>-<3 Buchstaben Vorname>-<3 Buchstaben Nachname>-<3 Ziffern>-<3 Ziffern>`

- **`S-`** für Speaker, **`P-`** für Partner. Beispiel: `S-COR-HEB-274-905`.
- Umlaute auflösen (Grünthanner → `GRU`), alles in Großbuchstaben.
- Standardkonditionen wie bei den bestehenden Codes: **100 %**, **max. 5
  Einlösungen**, kein Event-Scope (gilt also auch für die nächste Ausgabe).
- Bestehende Codes ohne Präfix (`ALE-KEY-…`, `AND-PAB-…`) bleiben, wie sie
  sind — das Präfix gilt für neue Codes.
- Gruppen-Talks: pro Person ein eigener Code, damit jede:r die eigenen 5
  Tickets hat.

## Ablauf

1. **Prüfen, was es schon gibt** — Joinify MCP, `list_vouchers`. Der Abgleich
   läuft über das Namensschema (z. B. `COR-HEB` für Cornelia Hebrank); die
   Liste enthält alle Codes des Kontos, weitere Teams gibt es nicht.
2. **Fehlende anlegen** — `create_voucher` mit `type: percent`, `value: 100`,
   `max_redemptions: 5` und dem Code nach Schema.
   **Achtung:** Das Joinify-Token hatte zeitweise nur `mcp:read`. Kommt der
   Fehler „token only has read access", nicht weiterprobieren, sondern dem
   Nutzer sagen, dass er die Joinify-Integration mit `mcp:write` neu verbinden
   muss — und die vorgeschlagenen Codes zum manuellen Anlegen mitliefern.
3. **Bild bereitstellen** — die Ankündigungsgrafiken liegen unter
   `public/media/speaker-announcements/<slug>-linkedin.png` (quer, für die DM)
   und `-instagram.png` (quadratisch). Fehlen sie, vorher
   `node scripts/generate-speaker-announcements.mjs <slug>` laufen lassen.
   Das Querformat mit in den Chat geben, damit es direkt angehängt werden kann.
4. **Nachricht schreiben** (siehe unten) und im Chat als Codeblock ausgeben —
   fertig zum Kopieren, ohne Platzhalter, mit eingesetztem Code.
5. **Warnen**, falls der Code noch nicht existiert: erst senden, wenn er
   angelegt ist, sonst läuft der Speaker beim Checkout ins Leere.

## Daten, die in die Nachricht gehören

Alles aus dem Repo, nichts erfinden:

- Event: `src/content/events/<slug>.json` → Titel, `eventDate`, `startTime`
  (Einlass), `locationName`, `ticketUrl`
- Talk: `src/content/sessions/*.json` über `speakerIds`/`speakerSlugs` →
  Titel und `startTime`. Kein Talk hinterlegt? Dann ohne Talk-Titel schreiben.
- Speaker: `src/content/speaker/<slug>.json` → Vorname für die Anrede

## Vorlage (kommendes Event)

```
Hi <Vorname>,

wir freuen uns sehr, dass du bei den <Event-Kurzname> dabei bist! 🎉
<Talk-Satz oder Event-Satz mit Datum, Uhrzeit, Ort und Einlass>

Zwei Dinge für dich:

🎟️ Dein Speaker-Code: <CODE>
Damit bekommst du bis zu 5 Tickets kostenlos – für dich und alle, die du mitbringen möchtest. Einfach beim Checkout eingeben: <ticketUrl>

📣 Im Anhang dein Speaker-Bild – gern teilen, wenn du magst. Wir reposten natürlich.

Wenn du Fragen zu Ablauf, Technik oder Folien hast, melde dich jederzeit.

Bis <Monat>!
Andreas
```

Talk-Satz mit Session: „Dein Talk „<Titel>" steht am <Wochentag, Datum> um
<Zeit> Uhr auf der Bühne – Einlass ab <startTime> Uhr, <locationName>."
Ohne Session nur der Event-Satz: „<Wochentag, Datum>, <locationName>, Einlass
ab <startTime> Uhr."

## Vorlage (Talk liegt schon hinter uns)

Bei Speakern vergangener Events passt kein „wir freuen uns auf deinen Talk".
Stattdessen: Danke für den Talk (Titel nennen), Code als Einladung zur
nächsten Ausgabe, Bild zum Teilen, Einladungssatz zum Wiedersehen.

## Ton

Du-Form, herzlich, kurz — eine LinkedIn-DM, kein Newsletter. Keine
Superlative, keine erfundenen Details (Technik-Zusagen, Honorare, Zeiten, die
nicht im Repo stehen). Unterschrift „Andreas".
