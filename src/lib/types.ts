// =============================================
// Travel Profile — état global du questionnaire
// =============================================

export interface TravelProfile {
  // Temporel
  month: string;
  monthIndex: number; // 0-11
  monthHalf: '1' | '2' | null; // 1 = première quinzaine, 2 = deuxième quinzaine
  year: number;
  nights: '2-3' | '4-6' | '7' | '10+' | null;

  // Budget
  budget: 'tight' | 'moderate' | 'comfort' | 'unlimited' | null;

  // Contexte
  tripContext: 'vacation' | 'honeymoon' | 'special' | 'friends' | 'workation' | null;
  travelStyle: 'base' | 'moving' | null;

  // Groupe
  group: 'solo' | 'couple' | 'family' | 'friends' | null;
  kidsAges: ('baby' | 'young' | 'child' | 'teen')[];

  // Départ & transport
  departureCity: string;
  departureLat?: number;
  departureLng?: number;
  transport: ('plane' | 'train' | 'car' | 'ferry')[];

  // Ambiance
  vibe: ('sea' | 'mountain' | 'city' | 'nature' | 'culture' | 'food')[];

  // Questions contextuelles
  waterTemp: 'any' | 'fresh' | 'warm' | 'tropical' | null;
  mountainLevel: ('walk' | 'hike' | 'trek' | 'climb')[];

  // Priorités
  priority: ('rest' | 'discover' | 'sport' | 'food' | 'scenery' | 'nightlife')[];

  // Activités sportives (si priority inclut 'sport')
  sportActivities: ('surf' | 'windsurf' | 'watersports' | 'diving' | 'cycling' | 'mtb' | 'climbing' | 'trail' | 'ski' | 'paragliding' | 'skydiving' | 'kayak')[];

  // Climat (multi-select)
  climate: ('hot-dry' | 'tropical' | 'temperate' | 'cold')[];

  // Hébergement
  accommodation: ('hotel' | 'apartment' | 'allinclusive' | 'nature' | 'boutique' | 'hostel')[];

  // Contraintes
  constraints: ('vegetarian' | 'halal' | 'glutenfree' | 'pmr' | 'noaltitude' | 'noheat')[];

  // Langue
  language: 'any' | 'english' | 'french' | 'nearby' | null;

  // Destinations déjà visitées
  visited: string[];

  // Mode "on bouge"
  stopsCount?: 2 | 3 | 4 | 5;
  region?: string;
}

// =============================================
// Destinations & Résultats
// =============================================

export type WarningLevel = 'red' | 'orange' | 'green';

export interface Warning {
  level: WarningLevel;
  text: string;
}

export interface Destination {
  id: string;
  country: string;
  countryCode: string; // ISO 2-letter code (e.g. "GR", "ES", "TH")
  city: string;
  flag: string;
  matchScore: number;
  matchReasons: string[];
  budget: {
    min: number;
    max: number;
    currency: string;
    includes: string;
  };
  flightDuration: string;
  flightType: string;
  airTemp: number;
  waterTemp: number | null;
  visaRequired: boolean;
  mainLanguage: string;
  warnings: Warning[];
  pills: string[];
  highlights: string[];
  bookingLinks: {
    flights: string;
    hotels: string;
    activities: string;
  };
}

// =============================================
// Itinéraire
// =============================================

export interface DayActivity {
  activity: string;
  duration: string;
  tip: string;
  restaurant?: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  morning: DayActivity;
  afternoon: DayActivity;
  evening: DayActivity;
  accommodation: {
    name: string;
    area: string;
    type: string;
  };
  budget_day: number;
}

export interface Itinerary {
  itinerary: ItineraryDay[];
  total_budget: { min: number; max: number };
  packing_tips: string[];
  best_transport_local: string;
}

export interface RouteStop {
  stop: number;
  city: string;
  country: string;
  flag: string;
  nights: number;
  transport_in: {
    type: string;
    from: string;
    duration: string;
    estimated_cost: number;
  };
  transport_to_next?: {
    type: string;
    to: string;
    duration: string;
    estimated_cost: number;
  };
  highlights: string[];
  accommodation_area: string;
}

export interface Route {
  route: RouteStop[];
  total_transport_cost: number;
  total_budget: { min: number; max: number };
}

// =============================================
// Question Flow
// =============================================

export interface QuestionOption {
  icon: string;
  label: string;
  detail?: string;
  value: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface QuestionConfig {
  id: string;
  question: string;
  subtitle?: string;
  contextBadge?: string;
  options: QuestionOption[];
  multi?: boolean;
  columns?: 2 | 3 | 4;
  layout?: 'grid' | 'list';
  skipLabel?: string;
  field: keyof TravelProfile;
}
