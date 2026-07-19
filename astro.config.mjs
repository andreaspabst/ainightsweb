import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// ainights.ai — statische Astro-Site. URLs bleiben 1:1 zur WordPress-Version
// erhalten (trailing slash, /de/ + /en/ Sprachpräfixe, CPT-Archive ohne Präfix).
export default defineConfig({
  site: 'https://ainights.ai',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  vite: {
    server: {
      allowedHosts: ['ainights.loc'],
    },
  },
  redirects: {
    '/': '/de/',
    // Doppelter Speaker-Eintrag wurde in /speaker/der-pabst/ fusioniert
    '/speaker/andreas-pabst/': '/speaker/der-pabst/',
    // Entfernte Platzhalter-Speaker (waren live indexiert)
    '/speaker/ai-nights-speaker-01/': '/speaker/',
    '/speaker/ai-nights-speaker-02/': '/speaker/',
    '/speaker/ai-nights-speaker-03/': '/speaker/',
    '/speaker/ai-nights-speaker-04/': '/speaker/',
    // Podcast-Seite wurde entfernt
    '/de/podcast/': '/de/',
    // Alias für die Städte-Übersicht (kanonisch: /stadt/)
    '/cities/': '/stadt/',
    '/staedte/': '/stadt/',
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'de',
        locales: { de: 'de-DE', en: 'en-US' },
      },
    }),
  ],
});
