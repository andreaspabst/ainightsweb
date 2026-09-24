// Sprach-abhängige URLs für die geteilten Bereiche.
//
// Hintergrund: Städte, Speaker, Events, Sessions & Co. liegen historisch ohne
// Sprachpräfix (`/stadt/`, `/speaker/`, …) — exakt wie in WordPress. Diese URLs
// bleiben unverändert und deutsch. Für die Übersichtsseiten gibt es zusätzlich
// eine englische Fassung unter `/en/…`; welche Variante verlinkt wird, hängt an
// der Sprache der aufrufenden Seite.

export type Lang = 'de' | 'en';

/** Städte-Übersicht */
export const citiesHref = (lang: Lang) => (lang === 'en' ? '/en/cities/' : '/stadt/');

/** Einzelne Stadt */
export const cityHref = (slug: string, lang: Lang) =>
  lang === 'en' ? `/en/cities/${slug}/` : `/stadt/${slug}/`;

/** Speaker-Übersicht */
export const speakersHref = (lang: Lang) => (lang === 'en' ? '/en/speakers/' : '/speaker/');

/**
 * Seiten, die es nur auf Deutsch gibt (Speaker-Profile, Sessions, Events,
 * Sponsoren, Blog) — die Inhalte selbst sind deutsch verfasst. Von einer
 * englischen Seite aus werden solche Links mit hreflang="de" ausgezeichnet,
 * damit Sprachwechsel für Browser, Screenreader und Suchmaschinen erkennbar
 * ist, statt unangekündigt zu passieren.
 */
export const foreignLang = (lang: Lang): 'de' | undefined => (lang === 'en' ? 'de' : undefined);
