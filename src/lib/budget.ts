import type { TravelProfile, Destination } from './types';
import { hasExactDates, overlapsHolidays } from './dates';

// Période des fêtes (22 déc. – 4 janv.) : la semaine la plus chère de l'année,
// surtout en long-courrier.
export function isHolidayPeak(profile: TravelProfile): boolean {
  if (hasExactDates(profile)) return overlapsHolidays(profile.startDate, profile.endDate);
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
  d: Pick<Destination, 'budget' | 'flightPrice' | 'ferry'>
): { min: number; max: number; realFlight: boolean } {
  // Parts « réelles » : on retire l'estimation de Claude et on ajoute le prix vu (non majoré)
  let removed = 0;
  let added = 0;
  let realFlight = false;
  const flightReal = d.flightPrice?.price;
  const flightEst = d.budget.flight;
  if (flightReal && flightReal > 0 && flightEst && flightEst > 0) {
    removed += flightEst;
    added += flightReal;
    realFlight = true;
  }
  const ferryReal = d.ferry?.real?.price;
  const ferryEst = d.ferry?.pricePerPerson;
  if (ferryReal && ferryReal > 0 && ferryEst && ferryEst > 0 && d.ferry?.real?.roundTrip) {
    removed += ferryEst;
    added += ferryReal;
  }
  if (removed > 0 && removed < d.budget.max) {
    const land = calculateBudget(profile, {
      min: Math.max(0, d.budget.min - removed),
      max: Math.max(0, d.budget.max - removed),
    });
    return { min: land.min + added, max: land.max + added, realFlight };
  }
  return { ...calculateBudget(profile, d.budget), realFlight: false };
}
