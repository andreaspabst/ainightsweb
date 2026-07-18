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
  redirects: {
    '/': '/de/',
    // Doppelter Speaker-Eintrag wurde in /speaker/der-pabst/ fusioniert
    '/speaker/andreas-pabst/': '/speaker/der-pabst/',
    // Podcast-Seite wurde entfernt
    '/de/podcast/': '/de/',
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
