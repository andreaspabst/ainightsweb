// Badge-Farben pro Stadt (Nürnberg rot, München blau, …).
// Fallback für unbekannte Städte: Magenta aus dem Branding.
const CITY_COLORS: Record<string, string> = {
  nürnberg: '#e5484d',
  münchen: '#326bff',
  erlangen: '#30a46c',
  hamburg: '#12a5b8',
  bayreuth: '#f76b15',
  frankfurt: '#8e4ec6',
  barcelona: '#d9910c',
};

export function cityColor(city?: string): string {
  if (!city) return '#dc2777';
  return CITY_COLORS[city.trim().toLowerCase()] ?? '#dc2777';
}
