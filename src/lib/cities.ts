// Zentrale Städte-Daten: Badge-Farben, Status und Geokoordinaten für die
// Europakarte (public/img/europe-map.svg, generiert aus Natural Earth 110m).

export type CityStatus = 'active' | 'soon';

export type City = {
  slug: string;
  name: string;
  status: CityStatus;
  lat: number;
  lon: number;
  /** Auf der Städte-Übersichtskarte anzeigen (Erlangen/Frankfurt: nur auf eigener Seite) */
  onOverview: boolean;
  labelPos?: 'left' | 'right';
};

export const CITIES: City[] = [
  { slug: 'nuernberg', name: 'Nürnberg', status: 'active', lat: 49.45, lon: 11.08, onOverview: true, labelPos: 'left' },
  { slug: 'muenchen', name: 'München', status: 'active', lat: 48.14, lon: 11.58, onOverview: true, labelPos: 'right' },
  { slug: 'erlangen', name: 'Erlangen', status: 'active', lat: 49.6, lon: 11.0, onOverview: false, labelPos: 'left' },
  { slug: 'hamburg', name: 'Hamburg', status: 'soon', lat: 53.55, lon: 9.99, onOverview: true, labelPos: 'left' },
  { slug: 'leipzig', name: 'Leipzig', status: 'soon', lat: 51.34, lon: 12.37, onOverview: true, labelPos: 'right' },
  { slug: 'bayreuth', name: 'Bayreuth', status: 'soon', lat: 49.95, lon: 11.58, onOverview: true, labelPos: 'right' },
  { slug: 'frankfurt', name: 'Frankfurt', status: 'soon', lat: 50.11, lon: 8.68, onOverview: false, labelPos: 'left' },
  { slug: 'barcelona', name: 'Barcelona', status: 'soon', lat: 41.39, lon: 2.17, onOverview: true, labelPos: 'right' },
];

// Projektion — muss zu public/img/europe-map.svg passen (siehe Generator)
const LON0 = -10.5;
const LON1 = 19.5;
const LAT0 = 35.5;
const LAT1 = 54.8;

/** Position auf der Karte in Prozent (x/y) aus Geokoordinaten. */
export function mapPosition(lat: number, lon: number): { x: number; y: number } {
  return {
    x: ((lon - LON0) / (LON1 - LON0)) * 100,
    y: ((LAT1 - lat) / (LAT1 - LAT0)) * 100,
  };
}

// Badge-Farben pro Stadt (Nürnberg rot, München blau, …).
// Fallback für unbekannte Städte: Magenta aus dem Branding.
const CITY_COLORS: Record<string, string> = {
  nürnberg: '#e5484d',
  münchen: '#326bff',
  erlangen: '#30a46c',
  hamburg: '#12a5b8',
  leipzig: '#f2555a',
  bayreuth: '#f76b15',
  frankfurt: '#8e4ec6',
  barcelona: '#d9910c',
};

export function cityColor(city?: string): string {
  if (!city) return '#dc2777';
  return CITY_COLORS[city.trim().toLowerCase()] ?? '#dc2777';
}
