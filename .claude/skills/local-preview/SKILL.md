---
name: local-preview
description: Fragt proaktiv nach, ob der lokale Astro-Dev-Server im Hintergrund gestartet werden soll, damit Änderungen an diesem Repo im Browser auf diesem Rechner nachvollzogen werden können. Ermittelt die passende lokale URL (custom .loc-Domain aus /etc/hosts, sonst localhost). Nutze diesen Skill proaktiv nach Code-Änderungen an diesem Repo (ainightsweb), nicht nur wenn explizit danach gefragt wird.
---

# Lokale Vorschau starten

Gilt nur für dieses Repository (Astro-Projekt `ainightsweb`, Produktions-Domain ainights.ai).

## Wann anwenden

Proaktiv nachfragen, nachdem eine Code-Änderung an diesem Repo abgeschlossen wurde (z. B. neue Sektion, Styling, Textänderung) — nicht nur wenn explizit danach gefragt wird. Nicht erneut fragen, wenn in dieser Session bereits ein Dev-Server im Hintergrund läuft.

## Ablauf

1. **Nachfragen, nicht automatisch starten.** Den Nutzer fragen, ob die Seite im Hintergrund gestartet werden soll, um die Änderung lokal zu prüfen.

2. **Bei Zustimmung: Dev-Server im Hintergrund starten.**
   `npm run dev` (Skript aus `package.json`) im Hintergrund ausführen.

3. **Tatsächlichen Port ermitteln.**
   Astro gibt beim Start die echte URL aus (`Local: http://localhost:XXXX/`). Ist der Standardport (4321) belegt, wählt Astro automatisch den nächsten freien — deshalb Port aus der Ausgabe lesen, nicht fest annehmen.

4. **Passenden Hostnamen aus `/etc/hosts` ableiten.**
   - `/etc/hosts` nach Einträgen durchsuchen, die zu diesem Projekt passen. Die Produktions-Domain steht in `astro.config.mjs` (`site: '...'`, aktuell `ainights.ai`). Gesucht wird eine lokale Variante mit `.loc`-Endung, z. B. `ainights.loc`.
   - Ein gefundener Eintrag zählt nur, wenn er auch tatsächlich auflöst (z. B. per `dscacheutil -q host -a name <domain>` oder `ping -c 1 -t 1 <domain>` prüfen). Ein Eintrag in `/etc/hosts` ohne führende IP-Adresse ist ungültig und löst nicht auf — in diesem Fall NICHT verwenden.
   - Gültiger Eintrag vorhanden → URL: `http://<domain>:<port>`.
   - Kein gültiger Eintrag → Fallback: `http://localhost:<port>`.

5. **Ergebnis mitteilen.**
   Dem Nutzer die finale URL nennen, z. B.: „Lokaler Server läuft im Hintergrund unter http://localhost:4321 — dort kannst du die Änderung im Browser prüfen." Da die Site zweisprachig ist, ggf. direkt auf `/de/` bzw. `/en/` verweisen.

6. **Hinweis zum Aufräumen geben.**
   Kurz erwähnen, dass der Prozess im Hintergrund weiterläuft und wie er bei Bedarf beendet werden kann, damit nicht mehrere Dev-Server parallel offen bleiben.
