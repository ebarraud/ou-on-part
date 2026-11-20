import type { TravelProfile, Destination } from './types';
import { BUDGET_MAX_BY_NIGHTS } from './questions';
import { getBudgetMultiplier, getDisplayedBudget, isHolidayPeak } from './budget';
import { formatRange, getNightsCount, hasExactDates } from './dates';

// =============================================
// Contraintes éliminatoires — vérifiées par le code,
// indépendamment de ce que Claude a répondu.
// =============================================

// Trajet max (aller, trajet principal) par défaut selon la durée du séjour
const DEFAULT_MAX_HOURS: Record<string, number> = {
  '2-3': 3,
  '4-6': 5,
  '7': 6,
  '10+': 10,
};

const FLIGHT_RANGE_HOURS: Record<string, number> = {
  short: 3,
  medium: 6,
  long: Infinity,
};

/** Durée de trajet max acceptée (heures, aller). Infinity = pas de limite. */
export function getMaxTravelHours(profile: TravelProfile): number {
  const ranges = profile.transport.includes('plane') ? profile.flightRange ?? [] : [];
  if (ranges.length > 0) {
    // Choix explicite de l'utilisateur : la plus grande distance cochée
    return Math.max(...ranges.map((r) => FLIGHT_RANGE_HOURS[r] ?? 0));
  }
  return DEFAULT_MAX_HOURS[profile.nights || '7'] ?? 6;
}

/** Budget max par personne, tout compris (€). Infinity = pas de plafond. */
export function getBudgetCap(profile: TravelProfile): number {
  if (!profile.budget || profile.budget === 'unlimited') return Infinity;
  const caps = BUDGET_MAX_BY_NIGHTS[profile.nights || '7'] || BUDGET_MAX_BY_NIGHTS['7'];
  return caps[profile.budget];
}

/** Plafond à donner à Claude, avant les majorations appliquées par l'app. */
export function getBaseBudgetCap(profile: TravelProfile): number {
  const cap = getBudgetCap(profile);
  if (!isFinite(cap)) return cap;
  return Math.floor(cap / getBudgetMultiplier(profile) / 10) * 10;
}

/** "3h30" → 3.5, "45min" → 0.75, "13h (1 escale)" → 13. null si illisible. */
export function parseHours(text: string | undefined | null): number | null {
  if (!text) return null;
  const s = text.toLowerCase().replace(/\s+/g, '');
  const h = s.match(/(\d+(?:[.,]\d+)?)h(\d{1,2})?/);
  if (h) {
    const hours = parseFloat(h[1].replace(',', '.'));
    const minutes = h[2] ? parseInt(h[2], 10) : 0;
    return hours + minutes / 60;
  }
  const m = s.match(/(\d+)min/);
  if (m) return parseInt(m[1], 10) / 60;
  return null;
}

export function getTravelHours(d: Destination): number | null {
  if (typeof d.travelHours === 'number' && isFinite(d.travelHours) && d.travelHours > 0) {
    return d.travelHours;
  }
  return parseHours(d.flightDuration);
}

export type RejectionKind = 'budget' | 'travel' | 'excluded';

export interface Rejection {
  destination: Destination;
  kind: RejectionKind;
  reason: string;
  overshoot: number; // € au-dessus du budget, ou heures au-dessus de la limite
}

export function formatHours(h: number): string {
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  return minutes > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`;
}

/** Renvoie null si la destination respecte les contraintes, sinon la raison du rejet. */
export function checkDestination(
  profile: TravelProfile,
  d: Destination,
  excludedCodes: string[] = []
): Rejection | null {
  const code = (d.countryCode || '').toUpperCase();
  if (profile.visited.includes(code) || excludedCodes.includes(code)) {
    return { destination: d, kind: 'excluded', reason: 'pays exclu', overshoot: 0 };
  }

  const cap = getBudgetCap(profile);
  const budget = getDisplayedBudget(profile, d);
  if (budget.min > cap) {
    return {
      destination: d,
      kind: 'budget',
      reason: `budget minimum ${budget.min}€${budget.realFlight ? ` (dont vol vu à ${d.flightPrice!.price}€)` : ''} au-dessus du maximum de ${cap}€`,
      overshoot: budget.min - cap,
    };
  }

  const maxHours = getMaxTravelHours(profile);
  const hours = getTravelHours(d);
  if (hours !== null && hours > maxHours) {
    return {
      destination: d,
      kind: 'travel',
      reason: `trajet de ${formatHours(hours)} au-delà de la limite de ${formatHours(maxHours)}`,
      overshoot: hours - maxHours,
    };
  }

  return null;
}

// =============================================
// Message quand aucune destination ne passe
// =============================================

const NIGHTS_LABEL: Record<string, string> = {
  '2-3': 'un week-end',
  '4-6': 'quelques jours',
  '7': '1 semaine',
  '10+': '10 nuits et plus',
};

export function describeCriteria(profile: TravelProfile): string {
  const parts: string[] = [];
  if (hasExactDates(profile)) {
    parts.push(`Pour ${getNightsCount(profile)} nuits ${formatRange(profile.startDate, profile.endDate)}`);
  } else {
    parts.push(`Pour ${NIGHTS_LABEL[profile.nights || '7'] || 'ton séjour'}`);
  }
  if (profile.month && !hasExactDates(profile)) {
    // Le libellé du MonthPicker contient déjà la quinzaine : « fin décembre 2026 »
    const label = profile.month.toLowerCase();
    parts.push(/^(début|fin|en|du) /.test(label) ? label : `en ${label}`);
  }
  const limits: string[] = [];
  const cap = getBudgetCap(profile);
  if (isFinite(cap)) limits.push(`${cap.toLocaleString('fr-FR')}€`);
  const maxHours = getMaxTravelHours(profile);
  if (isFinite(maxHours)) limits.push(`${formatHours(maxHours)} de trajet`);
  const head = parts.join(' ');
  return limits.length > 0 ? `${head}, à moins de ${limits.join(' et ')}` : head;
}

export function buildRelaxSuggestions(profile: TravelProfile, rejections: Rejection[]): string[] {
  const suggestions: string[] = [];

  const budgetMiss = rejections.filter((r) => r.kind === 'budget');
  if (budgetMiss.length > 0) {
    const smallest = Math.min(...budgetMiss.map((r) => r.overshoot));
    const rounded = Math.ceil(smallest / 50) * 50;
    suggestions.push(`+${rounded.toLocaleString('fr-FR')}€ de budget par personne`);
  }

  const travelMiss = rejections.filter((r) => r.kind === 'travel');
  if (travelMiss.length > 0) {
    if (profile.transport.includes('plane') && !(profile.flightRange ?? []).includes('long')) {
      suggestions.push('accepter un vol plus long');
    }
    if (profile.nights !== '10+') {
      suggestions.push('partir quelques jours de plus');
    }
  }

  if (isHolidayPeak(profile)) {
    suggestions.push('décaler après les fêtes (les prix baissent dès début janvier)');
  }

  return suggestions;
}
