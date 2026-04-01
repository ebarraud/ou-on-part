export interface CarCostEstimate {
  fuel: number;
  tolls: number;
  parking: number;
  total: number;
}

const distancesFromParis: Record<string, number> = {
  Barcelona: 1050,
  Rome: 1420,
  Amsterdam: 500,
  Berlin: 1050,
  Madrid: 1270,
  Lisbon: 1800,
  Nice: 930,
  Lyon: 465,
};

export function calculateCarCost(
  departure: string,
  destination: string,
  nights: string
): CarCostEstimate {
  const distance = distancesFromParis[destination] || 800;
  const fuel = Math.round(distance * 2 * 0.07 * 1.75);
  const tolls = Math.round(distance * 0.06);
  const nightsNum = nights === '10+' ? 10 : parseInt(nights) || 7;
  const parking = nightsNum <= 7 ? 40 : 80;

  return { fuel, tolls, parking, total: fuel + tolls + parking };
}
