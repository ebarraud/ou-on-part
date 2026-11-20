import type { TravelProfile, Destination } from './types';

// Période des fêtes (22 déc. – 4 janv.) : la semaine la plus chère de l'année,
// surtout en long-courrier.
export function isHolidayPeak(profile: TravelProfile): boolean {
  // Décembre 2e quinzaine = départ entre le 16 et le 31 → chevauche le 22/12–04/01
  return profile.monthIndex === 11 && profile.monthHalf === '2';
}

export function getSeasonMultiplier(profile: TravelProfile): number {
  const highSeasonMonths = [6, 7]; // juillet (6), août (7) — 0-indexed
  const shoulderMonths = [5, 8]; // juin (5), septembre (8)

  if (isHolidayPeak(profile)) return 1.4;
  if (highSeasonMonths.includes(profile.monthIndex)) return 1.3;
  if (shoulderMonths.includes(profile.monthIndex)) return 1.1;
  return 1;
}

// Multiplicateur total appliqué à l'estimation de base de Claude
export function getBudgetMultiplier(profile: TravelProfile): number {
  let multiplier = getSeasonMultiplier(profile);

  // Ajustement groupe
  if (profile.group === 'family') multiplier *= 1.2;
  if (profile.group === 'friends') multiplier *= 0.9; // partage frais

  // Ajustement hébergement
  if (profile.accommodation.includes('allinclusive')) multiplier *= 1.4;
  if (profile.accommodation.includes('hostel')) multiplier *= 0.6;
  if (profile.accommodation.includes('boutique')) multiplier *= 1.2;

  return multiplier;
}

export function calculateBudget(
  profile: TravelProfile,
  baseEstimate: { min: number; max: number }
): { min: number; max: number } {
  const multiplier = getBudgetMultiplier(profile);
  return {
    min: Math.round(baseEstimate.min * multiplier),
    max: Math.round(baseEstimate.max * multiplier),
  };
}

/**
 * Budget affiché (et vérifié par le filtre) pour une destination.
 * Si un prix de vol réel est connu : estimation hors vol majorée + prix réel du vol
 * (le prix réel intègre déjà la saison, on ne le majore pas).
 */
export function getDisplayedBudget(
  profile: TravelProfile,
  d: Pick<Destination, 'budget' | 'flightPrice'>
): { min: number; max: number; realFlight: boolean } {
  const real = d.flightPrice?.price;
  const estimate = d.budget.flight;
  if (real && real > 0 && estimate && estimate > 0 && estimate < d.budget.max) {
    const land = calculateBudget(profile, {
      min: Math.max(0, d.budget.min - estimate),
      max: Math.max(0, d.budget.max - estimate),
    });
    return { min: land.min + real, max: land.max + real, realFlight: true };
  }
  return { ...calculateBudget(profile, d.budget), realFlight: false };
}
