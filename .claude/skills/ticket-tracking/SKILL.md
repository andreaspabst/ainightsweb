---
name: ticket-tracking
description: Konvention für Kampagnen-/Button-Tracking auf Ticket-Links (Digistore24 & Joinify). Anwenden, wenn ein neuer Button/Link auf ein Ticket-Checkout (d.ticketUrl, ticketUrl-Prop o.ä.) hinzukommt, oder wenn nach Attributions-/Tracking-Parametern für Ticketverkäufe gefragt wird.
---

# Ticket-Tracking (ainights.ai)

Jeder Button, der auf einen echten Ticket-Checkout verlinkt (Digistore24,
Joinify, künftige Anbieter), muss trackbar sein: woher kam der Klick
(Kampagne) und/oder von welcher Button-Position auf der Website.

## Funktionsweise

Ein globales Inline-Script in [src/layouts/Layout.astro](../../src/layouts/Layout.astro)
(direkt nach `<slot />`) macht zwei Dinge bei jedem Seitenaufruf:

1. **Eingehendes Kampagnen-Tracking merken:** Ist in der URL ein
   `?jtr=WERT` vorhanden (z. B. weil ein Newsletter/ActiveCampaign-Link mit
   `?jtr=AC_MAILING_12345` auf die Seite verlinkt hat), wird `WERT` in
   `sessionStorage` unter dem Key `ainights_jtr` gespeichert. Das gilt für
   die gesamte Browser-Session, auch über mehrere Seitenaufrufe hinweg —
   so bleibt die Kampagnen-Quelle erhalten, selbst wenn der Nutzer erst
   noch durch die Seite klickt, bevor er ein Ticket kauft.
2. **Ausgehende Ticket-Links markieren:** Jeder `<a>` mit einem
   `data-btn-pos="..."`-Attribut bekommt beim Laden der Seite einen
   Tracking-Parameter an die `href` angehängt:
   - **Digistore24** (Hostname enthält `ds24`/`digistore`) → `ds24tr=WERT`
   - **alles andere (z. B. Joinify)** → `jtr=WERT`

   `WERT` ist der gespeicherte Kampagnen-Wert aus Schritt 1, falls
   vorhanden — sonst der Fallback `AINWEB_<BTN_POSITION>` aus dem
   `data-btn-pos`-Attribut selbst.

   Interne Links (gleicher Hostname, z. B. der Fallback `/de/tickets/` bei
   vergangenen Events) werden dabei ignoriert.

## Neuen Ticket-Button hinzufügen

Jeden `<a href={ticketUrl}>` (oder `d.ticketUrl`) mit einem eindeutigen
`data-btn-pos` versehen, z. B.:

```astro
<a href={d.ticketUrl} data-btn-pos="EVENT_HERO" target="_blank" rel="noopener">
  Tickets sichern
</a>
```

Bestehende Positionen (siehe [src/pages/events/[slug].astro](../../src/pages/events/%5Bslug%5D.astro),
[src/components/EventCard.astro](../../src/components/EventCard.astro)):

| Position | Wo |
| --- | --- |
| `EVENT_HERO` | Hero-Bar auf der Event-Detailseite |
| `EVENT_FACTS` | CTA im "Das Afterwork-Event in Kürze"-Block |
| `EVENT_HOST` | CTA im Gastgeber/Host-Block |
| `EVENT_FINALCTA` | Abschluss-CTA am Seitenende |
| `EVENT_STICKY` | Sticky-CTA-Leiste (Footer-Bar) |
| `HOME_EVENTCARD` | EventCard auf der Startseite |
| `STADT_EVENTCARD` | EventCard auf den Stadtseiten |

Kein `data-btn-pos` nötig bei internen Links (z. B. Header-"Tickets"-Button
→ `/de/tickets/`), da dort kein direkter Checkout passiert — das Tracking
greift erst beim tatsächlichen Klick auf den externen Ticket-Anbieter.

## Wichtig

- Positions-Namen sind frei wählbar, aber sollten stabil & eindeutig
  bleiben (nicht pro Event neu erfinden — sonst wird die Auswertung
  unübersichtlich).
- Der Fallback-Wert hat das Format `AINWEB_<POSITION>` (Präfix `AINWEB_`
  identifiziert die Quelle als ainights.ai-Website).
- Das Script arbeitet rein client-seitig (kein Server, statische Seite) —
  ohne JavaScript bleibt der Link nutzbar, nur ohne Tracking-Parameter.
