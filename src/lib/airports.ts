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
