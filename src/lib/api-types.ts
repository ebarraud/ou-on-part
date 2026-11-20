import type { Destination } from './types';

// Aperçu non sensible d'une destination verrouillée (ni nom, ni pays, ni drapeau)
export interface DestinationTeaser {
  matchScore: number;
  budgetMin: number;
  budgetMax: number;
  flightDuration: string;
  airTemp: number;
  waterTemp: number | null;
  hasFerry: boolean;
  realFlightPrice: boolean;
  highlightsCount: number;
}

export interface LockedSearch {
  searchId: string;
  sealed: string;
  teasers: DestinationTeaser[];
  noMatch: boolean; // aucune destination ne respecte tous les critères (aperçu = les plus proches)
  suggestions: string[];
  priceCents: number;
  hours: number;
}

export type SearchResponse =
  | { locked: true; search: LockedSearch }
  | {
      locked: false;
      destinations: Destination[];
      nearMisses: Destination[];
      suggestions: string[];
    };

export interface UnlockResponse {
  destinations: Destination[];
  nearMisses: Destination[];
  suggestions: string[];
  token: string;
  searchId: string;
  expiresAt: number;
}
