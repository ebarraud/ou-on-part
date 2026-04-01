export interface CarCostEstimate {
  fuel: number;
  tolls: number;
  parking: number;
  total: number;
  totalRounded: number;
}

// Pays accessibles en voiture depuis la France (Europe + Maghreb proche)
const DRIVEABLE_COUNTRIES = new Set([
  'FR', 'ES', 'PT', 'IT', 'DE', 'BE', 'NL', 'LU', 'CH', 'AT',
  'GB', 'IE', 'DK', 'SE', 'NO', 'PL', 'CZ', 'SK', 'HU', 'HR',
  'SI', 'BA', 'RS', 'ME', 'AL', 'MK', 'BG', 'RO', 'GR', 'TR',
  'MA', 'AD', 'MC', 'MT', // Malta via ferry
]);

// Distances approximatives (km, aller simple) — ville de départ → destination (ville/pays)
// Clé = "departure|destination_country_or_city" en minuscule
const DISTANCE_TABLE: Record<string, number> = {
  // Depuis Paris
  'paris|barcelona': 1050, 'paris|es': 1050,
  'paris|madrid': 1270,
  'paris|rome': 1420, 'paris|it': 1420,
  'paris|amsterdam': 500, 'paris|nl': 500,
  'paris|berlin': 1050, 'paris|de': 1050,
  'paris|lisbon': 1800, 'paris|pt': 1800,
  'paris|nice': 930,
  'paris|marseille': 775,
  'paris|lyon': 465,
  'paris|bordeaux': 585,
  'paris|gr': 2500, 'paris|athens': 2500, 'paris|crete': 3200,
  'paris|hr': 1350, 'paris|dubrovnik': 1700, 'paris|split': 1500,
  'paris|ch': 550, 'paris|at': 1250,
  'paris|be': 300, 'paris|brussels': 300,
  'paris|gb': 450, 'paris|london': 450,
  'paris|dk': 1250, 'paris|copenhagen': 1250,
  'paris|se': 1850, 'paris|stockholm': 1850,
  'paris|pl': 1550, 'paris|warsaw': 1550,
  'paris|cz': 1050, 'paris|prague': 1050,
  'paris|hu': 1450, 'paris|budapest': 1450,
  'paris|ma': 2100, 'paris|marrakech': 2600, 'paris|morocco': 2100,
  'paris|tr': 3000, 'paris|istanbul': 2800,
  'paris|si': 1200, 'paris|ljubljana': 1200,
  'paris|me': 1800, 'paris|montenegro': 1800,
  'paris|al': 2000, 'paris|albania': 2000,
  'paris|bg': 2200, 'paris|sofia': 2200,
  'paris|ro': 2100, 'paris|bucharest': 2100,

  // Depuis Lyon
  'lyon|barcelona': 650, 'lyon|es': 650,
  'lyon|rome': 1100, 'lyon|it': 1100,
  'lyon|nice': 470, 'lyon|marseille': 315,
  'lyon|gr': 2100, 'lyon|hr': 1000,
  'lyon|ch': 350, 'lyon|de': 750,
  'lyon|at': 950,

  // Depuis Marseille
  'marseille|barcelona': 500, 'marseille|es': 500,
  'marseille|rome': 1000, 'marseille|it': 1000,
  'marseille|nice': 200,
  'marseille|gr': 2200, 'marseille|hr': 1200,

  // Depuis Bordeaux
  'bordeaux|madrid': 650, 'bordeaux|es': 650,
  'bordeaux|barcelona': 650,
  'bordeaux|lisbon': 1200, 'bordeaux|pt': 1200,
  'bordeaux|rome': 1600, 'bordeaux|it': 1600,

  // Depuis Nantes
  'nantes|es': 1000, 'nantes|barcelona': 1100,
  'nantes|pt': 1400, 'nantes|lisbon': 1500,
  'nantes|gb': 550, 'nantes|london': 550,

  // Depuis Strasbourg
  'strasbourg|de': 250, 'strasbourg|berlin': 750,
  'strasbourg|ch': 200, 'strasbourg|at': 650,
  'strasbourg|it': 900, 'strasbourg|rome': 1200,
  'strasbourg|cz': 550, 'strasbourg|prague': 550,
  'strasbourg|pl': 1000,

  // Depuis Toulouse
  'toulouse|barcelona': 350, 'toulouse|es': 350,
  'toulouse|madrid': 800,
  'toulouse|it': 1000,

  // Depuis Nice
  'nice|it': 550, 'nice|rome': 950,
  'nice|barcelona': 700, 'nice|es': 700,
  'nice|hr': 900,
};

function getDistance(departure: string, destinationCity: string, countryCode: string): number {
  const dep = departure.toLowerCase();
  const city = destinationCity.toLowerCase();
  const country = countryCode.toLowerCase();

  // Try exact city match first
  const byCity = DISTANCE_TABLE[`${dep}|${city}`];
  if (byCity) return byCity;

  // Try country code match
  const byCountry = DISTANCE_TABLE[`${dep}|${country}`];
  if (byCountry) return byCountry;

  // Fallback: try from Paris if departure not in table
  const fallbackCity = DISTANCE_TABLE[`paris|${city}`];
  if (fallbackCity) return fallbackCity;
  const fallbackCountry = DISTANCE_TABLE[`paris|${country}`];
  if (fallbackCountry) return fallbackCountry;

  // Last resort: rough estimate
  return 1200;
}

export function isDriveable(countryCode: string): boolean {
  return DRIVEABLE_COUNTRIES.has(countryCode.toUpperCase());
}

export function calculateCarCost(
  departure: string,
  destinationCity: string,
  countryCode: string,
  nights: string
): CarCostEstimate {
  const distance = getDistance(departure, destinationCity, countryCode);
  const fuel = Math.round(distance * 2 * 0.07 * 1.75);       // 7L/100km, 1.75€/L, aller-retour
  const tolls = Math.round(distance * 2 * 0.06);               // ~6cts/km, aller-retour
  const nightsNum = nights === '10+' ? 10 : nights === '2-3' ? 3 : nights === '4-6' ? 5 : parseInt(nights) || 7;
  const parking = nightsNum <= 7 ? 40 : 80;
  const total = fuel + tolls + parking;
  const totalRounded = Math.round(total / 10) * 10; // arrondi à la dizaine

  return { fuel, tolls, parking, total, totalRounded };
}

export function getCarCostLine(
  departure: string,
  destinationCity: string,
  countryCode: string,
  nights: string
): { text: string; detail: string; available: boolean } {
  if (!isDriveable(countryCode)) {
    return {
      text: '🚗 Non recommandé pour cette distance',
      detail: '',
      available: false,
    };
  }

  const cost = calculateCarCost(departure, destinationCity, countryCode, nights);
  return {
    text: `🚗 En voiture depuis ${departure} : ~${cost.totalRounded}€ aller-retour`,
    detail: `⛽ ${cost.fuel}€ carburant + 🛣️ ${cost.tolls}€ péages + 🅿️ ${cost.parking}€ parking`,
    available: true,
  };
}
