# CLAUDE.md

Projektspezifische Anweisungen für Claude Code (CLI und Desktop App) in diesem Repository.

Dieses Repo (`ainightsweb`) ist die neue, in **Astro** gebaute Version von **ainights.ai** — der Website der AI Nights (KI-Event-Reihe in Nürnberg/München). Sie ersetzt die bisherige WordPress-Seite (Divi). Alle Inhalte, Bilder und URLs wurden 1:1 übernommen, das Design ist modernisiert (dunkles Theme, Magenta→Blau-Gradients).

## Kommandos

- `npm run dev` — Dev-Server auf http://localhost:4321
- `npm run build` — statischer Build nach `dist/`
- `npm run preview` — gebautes `dist/` lokal servieren

## Struktur

- `src/pages/` — Routen. Sprachpräfix `de/` + `en/` für Seiten; Custom-Post-Type-Archive und -Detailseiten (`speaker/`, `sessions/`, `events/`, `sponsor/`, `stadt/`, `ai-assistants/`) ohne Präfix — exakt wie die alten WordPress-URLs.
- `src/components/` — wiederverwendbare Sektionen (Header, Hero, Footer, Karten …)
- `src/layouts/Layout.astro` — HTML-Gerüst, globale Styles und Design-Tokens (CSS Custom Properties), SEO-Meta, hreflang.
- `src/content/` — Inhalte der Custom Post Types als Datendateien (Speaker, Sessions, Events, Sponsoren, Städte, AI-Assistants), aus WordPress migriert.
- `src/data/` — Seiteninhalte/Navigation.
- `public/img/` — alle Bilder (aus WordPress `wp-content/uploads` übernommen, per cURL geladen).

## Konventionen

- Vanilla CSS in Astro Scoped Styles, kein CSS-Framework.
- Design-Tokens (Farben, Gradients) ausschließlich in `Layout.astro` unter `:root` definieren und via `var(--…)` verwenden.
- Primärfarben: Magenta `#dc2777` / `#ff2d7a` und Blau `#326bff` / `#2ea3f2` auf dunklem Violett `#0f0122` (aus dem AI-Nights-Branding).
- Sprachen: Deutsch (Default) + Englisch. Seiten liegen unter `de/` und `en/`.
- Fonts: Inter (Body) + Space Grotesk (Display, Klasse `display-font`).

## SEO — nicht kaputt machen

Die Seite hat bestehende Rankings. Beim Ändern beachten:

- **URLs bleiben stabil.** Keine bestehende URL verschieben oder umbenennen ohne 301-Redirect. `trailingSlash: 'always'` ist gesetzt.
- Jede Seite braucht `<title>`, `meta description`, Canonical, OpenGraph und (bei de/en-Paaren) `hreflang`-Verweise — das erledigt `Layout.astro` über Props.
- `public/robots.txt` und die generierte `sitemap-index.xml` aktuell halten.

## Git-Workflow

**Niemals direkt auf `master` committen oder pushen.** Jede Änderung läuft über einen Feature-Branch und einen Pull Request.

### Aktualität prüfen nach längerer Pause

Wenn seit der letzten Aktivität eine Weile vergangen ist (neue Session, Arbeit evtl. auf einem anderen Rechner), vor Beginn erst `git status` und `git fetch` laufen lassen. Bei Rückstand kurz Bescheid geben und fragen, ob `master` aktualisiert werden soll (`git pull`), bevor ein neuer Feature-Branch angelegt wird.

### Branch-Namensschema

`<mac-username>/feature-<kurzbeschreibung>`

- `<mac-username>`: Ergebnis von `whoami` auf dem jeweiligen Rechner.
- `<kurzbeschreibung>`: kurz, kebab-case.

**Fallback:** Falls Git mit dem `/` Probleme macht, stattdessen einen Bindestrich verwenden (`mariaheindorf-feature-impressum`).

### Ablauf

1. Von einem aktuellen `master` aus einen Feature-Branch anlegen: `git checkout -b <branch-name>`.
2. Änderungen normal committen.
3. Vor `git push` und vor dem Erstellen eines Pull Requests: kurz beim Nutzer bestätigen lassen.
4. Branch pushen: `git push -u origin <branch-name>`.
5. Pull Request gegen `master` erstellen.
6. Den Pull Request **nicht selbstständig mergen** — das entscheidet der Nutzer.
7. Nach dem Merge: warten, bis das Forge-Deployment durch ist, dann fragen, ob die Änderung live passt.
8. Erst nach Bestätigung den Feature-Branch löschen (lokal und remote) und zurück auf `master`.

### Kommunikation, wenn der PR mergefertig ist

Konkret erklären: was fertig ist, dass ein Merge auf `master` automatisch **live** geht (Forge Quick Deploy zieht `master`, baut und serviert `dist/` auf ainights.ai, siehe `DEPLOY.md`), und eine klare Ja/Nein-Frage stellen, ob gemerged/live geschaltet werden soll.

## Skills

Skills für dieses Repository liegen ausschließlich unter `.claude/skills/` in diesem Repo (nicht global unter `~/.claude/skills`).

## Was in Claude Code / Desktop mit diesem Projekt geht

Diese Seite ist eine Astro-Website (statisches HTML, kein Backend), der Code liegt lesbar in `src/`.

- **Bilder austauschen oder neu einfügen.** Eine Bilddatei in den Chat ziehen (Drag & Drop) und dazuschreiben, wo sie hin soll. Bilder liegen unter `public/img/`.
- **Texte und Inhalte ändern.** In normaler Sprache beschreiben, was sich ändern soll. Seiteninhalte stecken in den `.astro`-Dateien unter `src/components/` und `src/pages/`, die Inhalte der Speaker/Sessions/Events/Sponsoren in `src/content/`.
- **Neue Speaker/Sessions/Sponsoren etc. hinzufügen.** Eine neue Datendatei unter `src/content/<typ>/` anlegen — die Detailseite und die Übersicht entstehen automatisch.
- **Neue Seiten oder Abschnitte hinzufügen.** Normale Anfrage.
- **Lokale Vorschau starten.** Claude Code fragt nach einer Änderung automatisch (Skill `local-preview`), ob die Seite im Hintergrund gestartet werden soll.
- **Design/Styling anpassen.** Farben, Abstände, Schriftgrößen liegen als CSS in den `.astro`-Dateien bzw. als Tokens in `Layout.astro`.
- **Nichts geht ungefragt live.** Änderungen werden immer erst auf einem Branch als Pull Request vorgelegt.
