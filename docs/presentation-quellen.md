# Quellen der Event-Präsentation

Stand: 17. September 2026. Die Folien verwenden die bestehenden AI-Nights-Farben und Original-Logos.

- `agents-im-weggla.svg`: unverändert aus `agenticnuremberg/public/img/logo-full.svg`. Formatbeschreibung: `agenticnuremberg/src/pages/index.astro`, https://agentsimweggla.de/.
- `axdn.svg`: unverändert aus `axdnwebsite/public/img/logo-full.svg`.
- `korns-hall.jpg`: unverändert aus `axdnwebsite/public/img/location/hall.jpg`.
- AXDN-Konferenzdatum, Veranstaltungsort und Tracks: `axdnwebsite/src/components/conference/Tracks.astro`, https://axdn.io/. Sechs Tracks einschließlich „Expo & Partners“, dazu Main Stage. Die ältere Seite in `ainightsweb/src/pages/conference/axdn-2027.astro` nennt noch vier Tracks und ist hierfür keine aktuelle Quelle.
- `fabian-mehring.jpg`: https://www.stmd.bayern.de/api/media/file/Fabian%20Mehring.jpg, verlinkt im offiziellen Ministerporträt https://www.stmd.bayern.de/ministerium/staatsminister. Dort bestätigt: Bayerischer Staatsminister für Digitales seit November 2023. Bildquelle auf der Folie angegeben.
- AI-Nights-Logo und Communityfoto: bestehende Dateien unter `public/wp-content/uploads/2026/01/` und `2026/04/`.
- AI Woman Nights: bestehendes Original-Logo `public/wp-content/uploads/2026/09/AI-Woman-Nights-Logo-w.svg` und Eventdaten in `src/content/events/ai-woman-nights-01.json`.
- Design Offices: vorhandenes Logo und `src/content/sponsor/design-offices.json`, https://www.designoffices.de/. Hinweise zu Toiletten, Getränken und Essen vom Veranstalter für diese Präsentation geliefert.
- mAIke Today: vorhandenes Original-Logo und `src/content/sponsor/maike.json`, https://maike.today/.
- AXDN-App-Funktionen: `axdn_app/app/store/de.md`. Video vom Veranstalter: https://www.youtube.com/watch?v=grbwODPjShs.
- AI Woman Nights #01: Datum (27.10.2026), Location und Ticketlink aus `src/content/events/ai-woman-nights-01.json`. Der Veranstalter bestätigt Dr. Dina Barbian, Anni Schramm und Dilara Zwanzig als die drei Speakerinnen. Die drei neuen Porträts `1695500720118.jpeg`, `1770044091000.jpeg` und `1734078943527.jpeg` wurden unverändert aus Downloads übernommen. Da die Dateinamen keine Einzelzuordnung enthalten, erhalten sie eine gemeinsame Bildunterschrift.
- `ai-woman-nights-01-tickets.svg`: lokal erzeugter QR-Code zum Ticketlink https://joinify.net/app/products/x5jehqew/tickets, Fehlerkorrektur M, vier Module weißer Rand. Der Ticketlink wurde durch Dekodierung des QR-Codes und seiner Browserdarstellung überprüft.

## Videobotschaft und Anpassungen pro Event

Die konkrete Mehring-Videobotschaft wurde noch nicht mitgeliefert. Die Folie zeigt daher eine lokale Dateiauswahl. Die ausgewählte Datei bleibt im Browser und wird nicht hochgeladen oder dauerhaft gespeichert. Sie kann vor dem Event geladen und bei Bedarf erneut gestartet werden.

Für ein dauerhaft eingebettetes Video in `src/data/presentation.ts` bei `eventOverrides` den betreffenden Event-Slug ergänzen:

```ts
'ai-nights-nuernberg-05': {
  greetingVideo: { kind: 'file', src: '/media/presentation/mehring-grusswort.mp4' },
  // oder: greetingVideo: { kind: 'youtube', id: 'ECHTE_VIDEO_ID' },
}
```

Die Toilet­tenbeschreibung lässt sich dort ebenfalls pro Event mit `toilets` überschreiben. Die Standardvorlage enthält die vom Veranstalter gelieferten Hinweise. Eventname, Datum und Location stammen automatisch aus dem jeweiligen Event.

## Bedienung

Klick auf freie Folienfläche, Pfeiltasten, Leertaste oder Page Down: weiter. Pfeil links oder Page Up: zurück. Home/End: erste/letzte Folie. F: Vollbild. O oder Klick auf die Foliennummer: Übersicht. Mobile Geräte unterstützen horizontales Wischen. Direkte Folienlinks verwenden `#slide-1` bis `#slide-7`.

YouTube lädt erst nach Klick auf den Videobutton. Beim Folienwechsel stoppt die Wiedergabe. Präsentationsseiten sind `noindex` und von der Sitemap ausgeschlossen.
