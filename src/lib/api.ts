import type { Destination, Itinerary, Route, TravelProfile } from './types';
import type { SearchResponse, UnlockResponse } from './api-types';

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data as T;
}

export const searchDestinations = (profile: TravelProfile) =>
  post<SearchResponse>('/api/search', { profile });

export const replaceDestination = (profile: TravelProfile, excludedCodes: string[], token?: string) =>
  post<SearchResponse>('/api/search', { profile, count: 1, excludedCodes, token });

export const startCheckout = (sealed: string) =>
  post<{ url: string }>('/api/checkout', { sealed, waiver: true });

export const unlockResults = (sessionId: string, sealed: string) =>
  post<UnlockResponse>('/api/unlock', { sessionId, sealed });

export const fetchItinerary = (profile: TravelProfile, destination: Destination, token?: string) =>
  post<{ itinerary?: Itinerary; route?: Route }>('/api/itinerary', { profile, destination, token });
