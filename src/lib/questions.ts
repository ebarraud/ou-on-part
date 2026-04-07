import type { QuestionConfig, TravelProfile } from './types';

// =============================================
// Définition statique des 15+ questions
// =============================================

// Q1 (MonthPicker) est géré à part dans le flow

export const Q2_NIGHTS: QuestionConfig = {
  id: 'nights',
  question: '🌙 Combien de nuits ?',
  field: 'nights',
  columns: 2,
  options: [
    { icon: '⚡', label: 'Week-end', detail: '2–3 nuits', value: '2-3' },
    { icon: '🗓️', label: 'Semaine courte', detail: '4–6 nuits', value: '4-6' },
    { icon: '📅', label: '1 semaine', detail: '7 nuits', value: '7' },
    { icon: '🌍', label: 'Grand voyage', detail: '10 nuits et +', value: '10+' },
  ],
};

const BUDGET_BY_NIGHTS: Record<string, { tight: string; moderate: string; comfort: string; unlimited: string }> = {
  '2-3': { tight: '< 300€', moderate: '300–600€', comfort: '600–1 200€', unlimited: '1 200€+' },
  '4-6': { tight: '< 500€', moderate: '500–1 000€', comfort: '1 000–2 000€', unlimited: '2 000€+' },
  '7':   { tight: '< 700€', moderate: '700–1 500€', comfort: '1 500–3 000€', unlimited: '3 000€+' },
  '10+': { tight: '< 1 000€', moderate: '1 000–2 000€', comfort: '2 000–4 500€', unlimited: '4 500€+' },
};

export function getBudgetQuestion(nights: string | null): QuestionConfig {
  const ranges = BUDGET_BY_NIGHTS[nights || '7'] || BUDGET_BY_NIGHTS['7'];
  return {
    id: 'budget',
    question: '💰 Budget par personne ?',
    subtitle: 'Vols + hébergement + activités',
    field: 'budget',
    columns: 2,
    options: [
      { icon: '💸', label: 'Serré', detail: ranges.tight, value: 'tight' },
      { icon: '👍', label: 'Raisonnable', detail: ranges.moderate, value: 'moderate' },
      { icon: '✨', label: 'Confort', detail: ranges.comfort, value: 'comfort' },
      { icon: '💎', label: 'Sans limite', detail: ranges.unlimited, value: 'unlimited' },
    ],
  };
}

export const Q3_BUDGET: QuestionConfig = getBudgetQuestion('7');

export const Q4_TRIP_CONTEXT: QuestionConfig = {
  id: 'tripContext',
  question: '🎯 Type de voyage ?',
  field: 'tripContext',
  layout: 'list',
  options: [
    { icon: '✈️', label: 'Vacances classiques', detail: 'On décroche, on profite', value: 'vacation' },
    { icon: '💑', label: 'Lune de miel / Romantique', detail: 'Coup de cœur garanti', value: 'honeymoon' },
    { icon: '🎂', label: 'Occasion spéciale', detail: 'Anniversaire, retraite, diplôme', value: 'special' },
    { icon: '🎉', label: 'Entre potes / EVG / EVJF', detail: 'On fête, on s\'amuse', value: 'friends' },
  ],
};

// Note: spec has 5 options but QuestionStep component handles it fine
export const Q4_TRIP_CONTEXT_FULL: QuestionConfig = {
  ...Q4_TRIP_CONTEXT,
  options: [
    ...Q4_TRIP_CONTEXT.options,
    { icon: '💼', label: 'Voyage + télétravail', detail: 'Wifi solide indispensable', value: 'workation' },
  ],
};

export const Q5_TRAVEL_STYLE: QuestionConfig = {
  id: 'travelStyle',
  question: '🧳 Style de voyage ?',
  field: 'travelStyle',
  layout: 'list',
  options: [
    { icon: '⚓', label: 'On pose la valise', detail: 'Une destination, excursions à la journée', value: 'base' },
    { icon: '🗺️', label: 'On bouge', detail: 'Plusieurs étapes, on change d\'endroit', value: 'moving' },
  ],
};

export const Q6_GROUP: QuestionConfig = {
  id: 'group',
  question: '👥 On part à combien ?',
  field: 'group',
  columns: 2,
  options: [
    { icon: '🧍', label: 'Solo', value: 'solo' },
    { icon: '👫', label: 'En couple', value: 'couple' },
    { icon: '👨‍👩‍👧', label: 'En famille', value: 'family' },
    { icon: '🎉', label: 'En groupe', value: 'friends' },
  ],
};

export const Q6B_KIDS: QuestionConfig = {
  id: 'kidsAges',
  question: '👶 Âge des enfants ?',
  field: 'kidsAges',
  multi: true,
  columns: 2,
  options: [
    { icon: '🍼', label: 'Bébé', detail: '< 2 ans', value: 'baby' },
    { icon: '🧸', label: 'Petits', detail: '3–7 ans', value: 'young' },
    { icon: '⚽', label: 'Enfants', detail: '8–12 ans', value: 'child' },
    { icon: '🎧', label: 'Ados', detail: '13–17 ans', value: 'teen' },
  ],
};

export const Q7_DEPARTURE: QuestionConfig = {
  id: 'departureCity',
  question: '📍 Ville de départ ?',
  field: 'departureCity',
  layout: 'list',
  options: [
    { icon: '🗼', label: 'Paris', value: 'Paris' },
    { icon: '🦁', label: 'Lyon', value: 'Lyon' },
    { icon: '⛵', label: 'Marseille', value: 'Marseille' },
    { icon: '🍷', label: 'Bordeaux', value: 'Bordeaux' },
  ],
};

// Extra cities in a second "page" or we show all in list
export const Q7_DEPARTURE_FULL: QuestionConfig = {
  ...Q7_DEPARTURE,
  options: [
    { icon: '🗼', label: 'Paris', value: 'Paris' },
    { icon: '🦁', label: 'Lyon', value: 'Lyon' },
    { icon: '⛵', label: 'Marseille', value: 'Marseille' },
    { icon: '🍷', label: 'Bordeaux', value: 'Bordeaux' },
  ],
};

export const Q7B_DEPARTURE_MORE: QuestionConfig = {
  ...Q7_DEPARTURE,
  id: 'departureCityMore',
  options: [
    { icon: '🏰', label: 'Nantes', value: 'Nantes' },
    { icon: '🥨', label: 'Strasbourg', value: 'Strasbourg' },
    { icon: '🏔️', label: 'Toulouse', value: 'Toulouse' },
    { icon: '📍', label: 'Autre', value: 'Autre' },
  ],
};

export const Q8_TRANSPORT: QuestionConfig = {
  id: 'transport',
  question: '🚀 Mode de transport ?',
  subtitle: 'Sélectionne un ou plusieurs modes',
  field: 'transport',
  multi: true,
  layout: 'list',
  options: [
    { icon: '✈️', label: 'Avion', detail: 'Toujours disponible', value: 'plane' },
    { icon: '🚂', label: 'Train', detail: 'Selon destination', value: 'train' },
    { icon: '🚗', label: 'Voiture', detail: 'Toujours disponible', value: 'car' },
    { icon: '⛴️', label: 'Ferry', detail: 'Depuis un port — accès inclus dans le calcul', value: 'ferry' },
  ],
};

export const Q9_VIBE: QuestionConfig = {
  id: 'vibe',
  question: '✨ Quelle ambiance ?',
  subtitle: 'Choisis une ou plusieurs ambiances',
  field: 'vibe',
  multi: true,
  columns: 2,
  options: [
    { icon: '🏖️', label: 'Mer & plage', value: 'sea' },
    { icon: '🏔️', label: 'Montagne', value: 'mountain' },
    { icon: '🌆', label: 'Grande ville', value: 'city' },
    { icon: '🌿', label: 'Nature & calme', value: 'nature' },
    { icon: '🏛️', label: 'Culture', value: 'culture' },
    { icon: '🍽️', label: 'Gastronomie', value: 'food' },
  ],
};

export const Q9B_WATER_TEMP: QuestionConfig = {
  id: 'waterTemp',
  question: '🌊 Température de l\'eau ?',
  contextBadge: '🏖️ Spécifique mer',
  field: 'waterTemp',
  layout: 'list',
  options: [
    { icon: '🥶', label: 'Peu importe', detail: 'Je nage quand même', value: 'any' },
    { icon: '🌊', label: 'Fraîche OK', detail: '18–24°C', value: 'fresh' },
    { icon: '🔥', label: 'Chaude', detail: '25°C et plus', value: 'warm' },
    { icon: '♨️', label: 'Très chaude', detail: '28°C+ mer tropicale', value: 'tropical' },
  ],
};

export const Q9C_MOUNTAIN_LEVEL: QuestionConfig = {
  id: 'mountainLevel',
  question: '⛰️ Niveau montagne ?',
  subtitle: 'Un ou plusieurs niveaux',
  contextBadge: '🏔️ Spécifique montagne',
  field: 'mountainLevel',
  multi: true,
  layout: 'list',
  options: [
    { icon: '🚶', label: 'Balades tranquilles', detail: 'Pas d\'effort', value: 'walk' },
    { icon: '🥾', label: 'Randonnées', detail: 'Quelques heures / jour', value: 'hike' },
    { icon: '⛰️', label: 'Trek sérieux', detail: 'Multi-jours, refuge', value: 'trek' },
    { icon: '🧗', label: 'Alpinisme', detail: 'Technique, équipement', value: 'climb' },
  ],
};

export const Q10_VISITED: QuestionConfig = {
  id: 'visited',
  question: '🌍 Destinations déjà visitées ?',
  subtitle: 'On évitera de te les reproposer',
  field: 'visited',
  multi: true,
  columns: 3,
  skipLabel: 'Passer — première fois',
  options: [
    { icon: '🇬🇷', label: 'Grèce', value: 'GR' },
    { icon: '🇪🇸', label: 'Espagne', value: 'ES' },
    { icon: '🇮🇹', label: 'Italie', value: 'IT' },
    { icon: '🇵🇹', label: 'Portugal', value: 'PT' },
    { icon: '🇲🇦', label: 'Maroc', value: 'MA' },
    { icon: '🇹🇭', label: 'Thaïlande', value: 'TH' },
    { icon: '🇺🇸', label: 'USA', value: 'US' },
    { icon: '🇯🇵', label: 'Japon', value: 'JP' },
    { icon: '🇹🇷', label: 'Turquie', value: 'TR' },
    { icon: '🇲🇽', label: 'Mexique', value: 'MX' },
    { icon: '🇮🇩', label: 'Bali', value: 'ID' },
    { icon: '🌐', label: 'Autre', value: 'OTHER' },
  ],
};

export const Q11_PRIORITY: QuestionConfig = {
  id: 'priority',
  question: '🎯 Priorité du voyage ?',
  subtitle: 'Choisis tes priorités',
  field: 'priority',
  multi: true,
  columns: 2,
  options: [
    { icon: '😴', label: 'Se reposer', value: 'rest' },
    { icon: '🧭', label: 'Découvrir', value: 'discover' },
    { icon: '🤸', label: 'Sport & activités', value: 'sport' },
    { icon: '🍷', label: 'Gastronomie', value: 'food' },
    { icon: '📸', label: 'Paysages', value: 'scenery' },
    { icon: '🎭', label: 'Vie nocturne', value: 'nightlife' },
  ],
};

export const Q11B_SPORT_ACTIVITIES: QuestionConfig = {
  id: 'sportActivities',
  question: '🏅 Quelles activités sportives ?',
  subtitle: 'Choisis une ou plusieurs activités',
  contextBadge: '🤸 Spécifique sport',
  field: 'sportActivities',
  multi: true,
  columns: 2,
  options: [
    { icon: '🏄', label: 'Surf', value: 'surf' },
    { icon: '💨', label: 'Windsurf / wingfoil', value: 'windsurf' },
    { icon: '🚤', label: 'Sports nautiques', detail: 'Jet-ski, wake…', value: 'watersports' },
    { icon: '🤿', label: 'Plongée / snorkeling', value: 'diving' },
    { icon: '🚴', label: 'Vélo route', value: 'cycling' },
    { icon: '🚵', label: 'VTT', value: 'mtb' },
    { icon: '🚶', label: 'Balade en montagne', value: 'mountain_walk' },
    { icon: '🥾', label: 'Randonnée', value: 'hiking' },
    { icon: '🧗', label: 'Escalade / via ferrata', value: 'climbing' },
    { icon: '🏃', label: 'Trail / running', value: 'trail' },
    { icon: '🎿', label: 'Ski / snowboard', value: 'ski' },
    { icon: '🪂', label: 'Parapente', value: 'paragliding' },
    { icon: '🛩️', label: 'Saut en parachute / ULM', value: 'skydiving' },
    { icon: '🛶', label: 'Kayak / canoë / rafting', value: 'kayak' },
  ],
};

export const Q12_CLIMATE: QuestionConfig = {
  id: 'climate',
  question: '🌤️ Quel climat ?',
  subtitle: 'Un ou plusieurs choix possibles',
  field: 'climate',
  multi: true,
  columns: 2,
  options: [
    { icon: '☀️', label: 'Chaud & sec', detail: 'Méditerranée', value: 'hot-dry' },
    { icon: '🌴', label: 'Chaud & humide', detail: 'Tropical', value: 'tropical' },
    { icon: '🌥️', label: 'Tempéré', value: 'temperate' },
    { icon: '❄️', label: 'Froid', detail: 'Ski, neige', value: 'cold' },
  ],
};

export const Q13_ACCOMMODATION: QuestionConfig = {
  id: 'accommodation',
  question: '🏨 Hébergement ?',
  subtitle: 'Un ou plusieurs types',
  field: 'accommodation',
  multi: true,
  columns: 2,
  options: [
    { icon: '🏨', label: 'Hôtel', value: 'hotel' },
    { icon: '🏡', label: 'Appartement', value: 'apartment' },
    { icon: '♾️', label: 'All inclusive', value: 'allinclusive' },
    { icon: '🏕️', label: 'Nature', detail: 'Camping, cabane', value: 'nature' },
    { icon: '🛎️', label: 'Boutique-hôtel', value: 'boutique' },
    { icon: '💸', label: 'Auberge', value: 'hostel' },
  ],
};

export const Q14_CONSTRAINTS: QuestionConfig = {
  id: 'constraints',
  question: '⚠️ Contraintes ?',
  field: 'constraints',
  multi: true,
  columns: 2,
  skipLabel: 'Passer — aucune contrainte',
  options: [
    { icon: '🥦', label: 'Végétarien / Vegan', value: 'vegetarian' },
    { icon: '🕌', label: 'Halal / Casher', value: 'halal' },
    { icon: '🌾', label: 'Sans gluten', value: 'glutenfree' },
    { icon: '🦽', label: 'Mobilité réduite', value: 'pmr' },
    { icon: '⛰️', label: 'Éviter altitude', detail: '+ 2 000m', value: 'noaltitude' },
    { icon: '🌡️', label: 'Éviter chaleur', detail: '+ 35°C', value: 'noheat' },
  ],
};

export const Q15_LANGUAGE: QuestionConfig = {
  id: 'language',
  question: '🗣️ Barrière de la langue ?',
  field: 'language',
  layout: 'list',
  options: [
    { icon: '😌', label: 'Pas de souci', detail: 'J\'aime me débrouiller', value: 'any' },
    { icon: '🇬🇧', label: 'Anglais suffit', detail: 'Je veux pouvoir communiquer', value: 'english' },
    { icon: '🇫🇷', label: 'Français si possible', detail: 'Je préfère ma langue', value: 'french' },
    { icon: '📵', label: 'Pas trop dépaysant', detail: 'Culture proche de la France', value: 'nearby' },
  ],
};

export const Q16_STOPS: QuestionConfig = {
  id: 'stopsCount',
  question: '🗺️ Combien d\'étapes ?',
  contextBadge: '🗺️ Mode on bouge',
  field: 'stopsCount',
  columns: 4,
  options: [
    { icon: '2️⃣', label: '2 étapes', value: '2' },
    { icon: '3️⃣', label: '3 étapes', value: '3' },
    { icon: '4️⃣', label: '4 étapes', value: '4' },
    { icon: '5️⃣', label: '5 étapes', value: '5' },
  ],
};

// =============================================
// Build dynamic question queue
// =============================================

export type StepId =
  | 'month' | 'nights' | 'budget' | 'tripContext' | 'travelStyle'
  | 'group' | 'kidsAges' | 'departureCity' | 'transport'
  | 'vibe' | 'waterTemp' | 'visited'
  | 'priority' | 'sportActivities' | 'climate' | 'accommodation' | 'constraints'
  | 'language' | 'stopsCount';

export function buildQueue(profile: TravelProfile): StepId[] {
  const queue: StepId[] = [
    'month',
    'nights',
    'budget',
    'tripContext',
    'travelStyle',
    'group',
  ];

  // Q6b — kids ages if family
  if (profile.group === 'family') {
    queue.push('kidsAges');
  }

  queue.push('departureCity', 'transport');

  queue.push('vibe');

  // Q9b — water temp if sea selected
  if (profile.vibe.includes('sea')) {
    queue.push('waterTemp');
  }

  queue.push('visited', 'priority');

  // Q11b — sport activities if sport priority selected
  if (profile.priority.includes('sport')) {
    queue.push('sportActivities');
  }

  queue.push('climate', 'accommodation', 'constraints', 'language');

  // Q16 — stops count if moving style
  if (profile.travelStyle === 'moving') {
    queue.push('stopsCount');
  }

  return queue;
}
