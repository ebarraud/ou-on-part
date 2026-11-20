import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TravelProfile, Destination, Itinerary, Route } from './types';
import type { LockedSearch } from './api-types';

const initialProfile: TravelProfile = {
  month: '',
  monthIndex: -1,
  monthHalf: null,
  year: 0,
  nights: null,
  budget: null,
  tripContext: null,
  travelStyle: null,
  group: null,
  kidsAges: [],
  departureCity: '',
  transport: [],
  flightRange: [],
  vibe: [],
  waterTemp: null,
  mountainLevel: [],
  priority: [],
  sportActivities: [],
  climate: [],
  accommodation: [],
  constraints: [],
  language: null,
  visited: [],
};

interface TravelStore {
  // Profile
  profile: TravelProfile;
  setField: <K extends keyof TravelProfile>(key: K, value: TravelProfile[K]) => void;
  resetProfile: () => void;

  // Flow
  currentStep: number;
  setCurrentStep: (step: number) => void;

  // Results
  destinations: Destination[];
  setDestinations: (d: Destination[]) => void;
  nearMisses: Destination[];
  suggestions: string[];
  setOutcome: (o: { nearMisses: Destination[]; suggestions: string[] }) => void;

  // Paywall
  lockedSearch: LockedSearch | null;
  setLockedSearch: (s: LockedSearch | null) => void;
  unlock: { token: string; searchId: string; expiresAt: number } | null;
  setUnlock: (u: { token: string; searchId: string; expiresAt: number } | null) => void;
  clearResults: () => void;
  selectedDestination: Destination | null;
  setSelectedDestination: (d: Destination | null) => void;

  // Itinerary
  itinerary: Itinerary | null;
  setItinerary: (i: Itinerary | null) => void;
  route: Route | null;
  setRoute: (r: Route | null) => void;

  // Loading states
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;

  // API cost tracking
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  addUsage: (cost: number, inputTokens: number, outputTokens: number) => void;
}

export const useTravelStore = create<TravelStore>()(
  persist(
    (set) => ({
      profile: { ...initialProfile },
      setField: (key, value) =>
        set((state) => ({
          profile: { ...state.profile, [key]: value },
        })),
      resetProfile: () => set((state) => ({
        profile: { ...initialProfile, visited: state.profile.visited },
        currentStep: 0,
        destinations: [],
        nearMisses: [],
        suggestions: [],
        lockedSearch: null,
        selectedDestination: null,
        itinerary: null,
        route: null,
      })),

      currentStep: 0,
      setCurrentStep: (step) => set({ currentStep: step }),

      destinations: [],
      setDestinations: (d) => set({ destinations: d }),
      nearMisses: [],
      suggestions: [],
      setOutcome: (o) => set({ nearMisses: o.nearMisses, suggestions: o.suggestions }),

      lockedSearch: null,
      setLockedSearch: (s) => set({ lockedSearch: s }),
      unlock: null,
      setUnlock: (u) => set({ unlock: u }),
      clearResults: () =>
        set({
          destinations: [],
          nearMisses: [],
          suggestions: [],
          lockedSearch: null,
          selectedDestination: null,
          itinerary: null,
          route: null,
        }),
      selectedDestination: null,
      setSelectedDestination: (d) => set({ selectedDestination: d }),

      itinerary: null,
      setItinerary: (i) => set({ itinerary: i }),
      route: null,
      setRoute: (r) => set({ route: r }),

      isGenerating: false,
      setIsGenerating: (v) => set({ isGenerating: v }),

      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      addUsage: (cost, inputTokens, outputTokens) =>
        set((state) => ({
          totalCost: state.totalCost + cost,
          totalInputTokens: state.totalInputTokens + inputTokens,
          totalOutputTokens: state.totalOutputTokens + outputTokens,
        })),
    }),
    {
      name: 'ou-on-part-storage',
      partialize: (state) => ({
        profile: state.profile,
        currentStep: state.currentStep,
        destinations: state.destinations,
        nearMisses: state.nearMisses,
        suggestions: state.suggestions,
        lockedSearch: state.lockedSearch,
        unlock: state.unlock,
        selectedDestination: state.selectedDestination,
        itinerary: state.itinerary,
        route: state.route,
        totalCost: state.totalCost,
        totalInputTokens: state.totalInputTokens,
        totalOutputTokens: state.totalOutputTokens,
      }),
    }
  )
);

// Vrai une fois l'état restauré depuis le stockage du navigateur (indispensable au retour de Stripe,
// qui recharge la page : sans ça, la recherche verrouillée n'est pas encore connue).
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useTravelStore.persist.onFinishHydration(() => setHydrated(true));
    if (useTravelStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}
