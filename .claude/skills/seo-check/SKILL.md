---
name: seo-check
description: SEO-Experten-Checkliste für dieses Repo — stellt sicher, dass JEDE Seite Title, Meta-Description, OpenGraph/Twitter-Tags (Share-Vorschau für WhatsApp, Instagram, LinkedIn & Co.), Canonical und Alt-Texte hat. Proaktiv nach dem Anlegen/Ändern von Seiten, Templates oder Inhalten anwenden — vor jedem Push das Audit laufen lassen.
---

# SEO-Check (ainights.ai)

Die Seite hat bestehende Rankings — SEO ist Pflicht, nicht Kür. Jede neue oder
geänderte Seite durchläuft vor dem Push das Audit.

## Audit ausführen (Pflicht vor Push bei Seiten-/Template-Änderungen)

```bash
npm run build && node scripts/seo-audit.mjs
```

Das Skript prüft **jede** gebaute Seite auf: `<title>` (≤ 70 Zeichen),
Meta-Description (50–160 Zeichen, nicht leer), Canonical, `og:title`,
`og:description`, `og:image`, `og:url`, `og:site_name`, `twitter:card`,
`<img>` ohne `alt`-Attribut und fehlende `<h1>`. Exit-Code 1 bei Problemen —
erst pushen, wenn es grün ist.

## Was das Layout schon automatisch erledigt

`src/layouts/Layout.astro` rendert für jede Seite: Meta-Description, Canonical,
hreflang (bei de/en-Paaren), OpenGraph (inkl. `og:image` als absolute URL,
`og:image:alt`, `og:locale`), Twitter-Card `summary_large_image` und optionales
JSON-LD. Außerdem **normalisiert** es zentral:

- Description wird auf 50–160 Zeichen gebracht (zu lange am Wortende gekürzt,
  zu kurze mit Brand-Suffix aufgefüllt) — für Meta, OG und Twitter.
- `<title>` wird auf ~65 Zeichen gekürzt; `og:title`/`twitter:title` behalten
  den vollen Titel (Share-Vorschauen zeigen mehr Zeichen).

**Deshalb:** Neue Seiten IMMER über `<Layout …>` bauen und `title`,
`description`, `path` (mit führendem+abschließendem Slash) und möglichst
`image` übergeben. Nie eigene `<head>`-Metas basteln.

## Checkliste für neue Seiten/Inhalte

1. **Title**: Thema zuerst, dann Brand (`Thema — AI Nights`). Keine
   Zeitfenster/Füllwörter am Anfang.
2. **Description**: einzigartig pro Seite, 50–160 Zeichen, beantwortet
   „Was bekomme ich hier?" — kein Duplicate Content zwischen Seiten.
3. **`path` + `alternates`** an Layout übergeben (Canonical + hreflang).
   URLs bleiben stabil — Umzüge nur mit Redirect in `astro.config.mjs`.
4. **`image`** übergeben (Share-Vorschau WhatsApp/LinkedIn/Instagram):
   sprechendes Motiv, ideal ~1200×630; Pfad reicht, Layout macht die URL absolut.
5. **Alt-Texte**: jedes `<img>` bekommt `alt` — beschreibend („Publikum bei
   AI Nights Nürnberg"), nicht „Bild1". Rein dekorative Bilder: `alt=""`.
   Bilder über den Skill `optimize-images` verkleinern (WebP-Varianten).
6. **JSON-LD** wo sinnvoll: Events (`@type: Event`), Blogposts
   (`BlogPosting`), Speaker (`Person`) — Vorbilder in den bestehenden Seiten.
7. **Eine `<h1>` pro Seite**, Thema vorn; Zwischenüberschriften als h2/h3.
8. **Daten-Quellen**: Bei Seiten aus `src/data/pages/*.json` leere
   `description`-Felder direkt im JSON füllen (der Renderer hat zwar einen
   Content-Fallback, ein handgeschriebener Text ist aber immer besser).

## Nicht tun

- Keine Seite ohne Layout-Props veröffentlichen („kommt später" = vergessen).
- Keine Descriptions per Copy-Paste über mehrere Seiten duplizieren.
- `noindex` nur für Danke-/Utility-Seiten erwägen, nie für Inhalte.
