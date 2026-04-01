import { create } from 'zustand';
import type { TravelProfile, Destination, Itinerary, Route } from './types';

const initialProfile: TravelProfile = {
  month: '',
  monthIndex: -1,
  year: 0,
  nights: null,
  budget: null,
  tripContext: null,
  travelStyle: null,
  group: null,
  kidsAges: [],
  departureCity: '',
  transport: [],
  vibe: [],
  waterTemp: null,
  mountainLevel: null,
  priority: [],
  climate: null,
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
}

export const useTravelStore = create<TravelStore>((set) => ({
  profile: { ...initialProfile },
  setField: (key, value) =>
    set((state) => ({
      profile: { ...state.profile, [key]: value },
    })),
  resetProfile: () => set({ profile: { ...initialProfile }, currentStep: 0 }),

  currentStep: 0,
  setCurrentStep: (step) => set({ currentStep: step }),

  destinations: [],
  setDestinations: (d) => set({ destinations: d }),
  selectedDestination: null,
  setSelectedDestination: (d) => set({ selectedDestination: d }),

  itinerary: null,
  setItinerary: (i) => set({ itinerary: i }),
  route: null,
  setRoute: (r) => set({ route: r }),

  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),
}));
