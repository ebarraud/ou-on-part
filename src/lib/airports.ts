// Code IATA (ville) de l'aéroport de départ pour chaque ville proposée.
// Les villes sans aéroport utile pointent vers le plus proche.
const ORIGIN_IATA: Record<string, string> = {
  paris: 'PAR',
  lyon: 'LYS',
  grenoble: 'LYS',
  marseille: 'MRS',
  bordeaux: 'BOD',
  nantes: 'NTE',
  strasbourg: 'SXB',
  toulouse: 'TLS',
  nice: 'NCE',
  montpellier: 'MPL',
  lille: 'LIL',
  rennes: 'RNS',
  brest: 'BES',
  biarritz: 'BIQ',
  bale: 'BSL',
  mulhouse: 'BSL',
  geneve: 'GVA',
  annecy: 'GVA',
  chambery: 'GVA',
  clermont: 'CFE',
  'clermont-ferrand': 'CFE',
  ajaccio: 'AJA',
  bastia: 'BIA',
  pau: 'PUF',
  perpignan: 'PGF',
  limoges: 'LIG',
};

function normalize(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function getOriginIata(city: string): string | null {
  if (!city) return null;
  return ORIGIN_IATA[normalize(city)] ?? null;
}

// Principaux aéroports de départ (code IATA « ville » utilisé par Travelpayouts/Skyscanner)
export const DEPARTURE_AIRPORTS: { iata: string; name: string; lat: number; lng: number }[] = [
  { iata: 'PAR', name: 'Paris', lat: 48.86, lng: 2.35 },
  { iata: 'LYS', name: 'Lyon', lat: 45.7256, lng: 5.0811 },
  { iata: 'MRS', name: 'Marseille', lat: 43.4393, lng: 5.2214 },
  { iata: 'NCE', name: 'Nice', lat: 43.6584, lng: 7.2159 },
  { iata: 'TLS', name: 'Toulouse', lat: 43.6291, lng: 1.3638 },
  { iata: 'BOD', name: 'Bordeaux', lat: 44.8283, lng: -0.7156 },
  { iata: 'NTE', name: 'Nantes', lat: 47.1532, lng: -1.6107 },
  { iata: 'SXB', name: 'Strasbourg', lat: 48.5383, lng: 7.6282 },
  { iata: 'LIL', name: 'Lille', lat: 50.5633, lng: 3.0869 },
  { iata: 'MPL', name: 'Montpellier', lat: 43.5762, lng: 3.963 },
  { iata: 'BSL', name: 'Bâle-Mulhouse', lat: 47.59, lng: 7.5291 },
  { iata: 'GVA', name: 'Genève', lat: 46.2381, lng: 6.109 },
  { iata: 'BIQ', name: 'Biarritz', lat: 43.4684, lng: -1.5311 },
  { iata: 'RNS', name: 'Rennes', lat: 48.0695, lng: -1.7348 },
  { iata: 'BES', name: 'Brest', lat: 48.4479, lng: -4.4185 },
  { iata: 'CFE', name: 'Clermont-Ferrand', lat: 45.7867, lng: 3.1692 },
  { iata: 'AJA', name: 'Ajaccio', lat: 41.9236, lng: 8.8029 },
  { iata: 'BIA', name: 'Bastia', lat: 42.5527, lng: 9.4837 },
  { iata: 'PUF', name: 'Pau', lat: 43.38, lng: -0.4186 },
  { iata: 'PGF', name: 'Perpignan', lat: 42.7404, lng: 2.8707 },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface NearestAirport {
  iata: string;
  name: string;
  km: number; // distance à vol d'oiseau
}

export function nearestAirport(lat: number, lng: number): NearestAirport {
  let best: NearestAirport = { iata: 'PAR', name: 'Paris', km: Infinity };
  for (const a of DEPARTURE_AIRPORTS) {
    const km = haversineKm(lat, lng, a.lat, a.lng);
    if (km < best.km) best = { iata: a.iata, name: a.name, km: Math.round(km) };
  }
  return best;
}

/** Aéroport de départ du profil : celui choisi via la recherche de commune, sinon la table des villes. */
export function getDepartureIata(profile: { departureCity: string; departureAirport?: string }): string | null {
  return profile.departureAirport || getOriginIata(profile.departureCity);
}
