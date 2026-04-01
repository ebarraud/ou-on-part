import type { TravelProfile } from './types';

export function calculateBudget(
  profile: TravelProfile,
  baseEstimate: { min: number; max: number }
): { min: number; max: number } {
  let multiplier = 1;

  // Ajustement saison
  const highSeasonMonths = [6, 7]; // juillet (6), août (7) — 0-indexed
  const shoulderMonths = [5, 8]; // juin (5), septembre (8)

  if (highSeasonMonths.includes(profile.monthIndex)) multiplier *= 1.3;
  else if (shoulderMonths.includes(profile.monthIndex)) multiplier *= 1.1;

  // Ajustement groupe
  if (profile.group === 'family') multiplier *= 1.2;
  if (profile.group === 'friends') multiplier *= 0.9; // partage frais

  // Ajustement hébergement
  if (profile.accommodation.includes('allinclusive')) multiplier *= 1.4;
  if (profile.accommodation.includes('hostel')) multiplier *= 0.6;
  if (profile.accommodation.includes('boutique')) multiplier *= 1.2;

  return {
    min: Math.round(baseEstimate.min * multiplier),
    max: Math.round(baseEstimate.max * multiplier),
  };
}
