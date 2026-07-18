---
title: 'Beispiel-Artikel: So schreibst du einen AI Nights Blogpost'
description: 'Vorlage für neue Blogbeiträge — Frontmatter-Felder, Bilder und Formatierung. Dieser Entwurf erscheint nicht auf der Website.'
pubDate: 2026-07-18
author: 'AI Nights Team'
image:
  src: '/wp-content/uploads/2026/01/1-34-publikum.jpg'
  alt: 'Publikum bei den AI Nights'
tags:
  - vorlage
draft: true
---

Dieser Beitrag ist eine **Vorlage** (`draft: true` — er wird weder gelistet noch gebaut).

## So legst du einen neuen Beitrag an

1. Neue Datei unter `src/content/blog/<slug>.md` anlegen — der Dateiname wird die URL (`/blog/<slug>/`).
2. Frontmatter ausfüllen: `title`, `description`, `pubDate` sind Pflicht; `image`, `tags`, `author`, `updatedDate` optional.
3. `draft: true` entfernen (oder auf `false`), sobald der Beitrag live gehen soll.

## Formatierung

Normaler Markdown funktioniert: **fett**, *kursiv*, [Links](https://ainights.ai), Listen, Zitate:

> Live Events. Community. Austausch.

Bilder vorher mit `node scripts/optimize-images.mjs` optimieren und die WebP-Variante einbinden.
