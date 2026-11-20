import type { TravelProfile } from './types';

// Dates au format YYYY-MM-DD, manipulées en UTC pour éviter les décalages d'heure d'été.

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toYmd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function addDays(s: string, days: number): string {
  const d = parseYmd(s);
  d.setUTCDate(d.getUTCDate() + days);
  return toYmd(d);
}

export function nightsBetween(start: string, end: string): number {
  return Math.round((parseYmd(end).getTime() - parseYmd(start).getTime()) / 86_400_000);
}

export function bucketNights(n: number): '2-3' | '4-6' | '7' | '10+' {
  if (n <= 3) return '2-3';
  if (n <= 6) return '4-6';
  if (n <= 9) return '7';
  return '10+';
}

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** "du 20 au 27 décembre 2026", "du 28 décembre 2026 au 4 janvier 2027" */
export function formatRange(start: string, end: string): string {
  const a = parseYmd(start);
  const b = parseYmd(end);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const sameMonth = sameYear && a.getUTCMonth() === b.getUTCMonth();
  const startLabel = sameMonth
    ? `${a.getUTCDate()}`
    : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]}${sameYear ? '' : ' ' + a.getUTCFullYear()}`;
  return `du ${startLabel} au ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

/** "20 déc. → 27 déc." */
export function formatShortRange(start: string, end: string): string {
  const a = parseYmd(start);
  const b = parseYmd(end);
  return `${a.getUTCDate()} ${MONTHS_SHORT[a.getUTCMonth()]} → ${b.getUTCDate()} ${MONTHS_SHORT[b.getUTCMonth()]}`;
}

export function hasExactDates(p: TravelProfile): p is TravelProfile & { startDate: string; endDate: string } {
  return !!p.startDate && !!p.endDate;
}

/** Nombre de nuits réel si dates précises, sinon une valeur représentative du choix. */
export function getNightsCount(p: TravelProfile): number {
  if (hasExactDates(p)) return nightsBetween(p.startDate, p.endDate);
  return { '2-3': 3, '4-6': 5, '7': 7, '10+': 10 }[p.nights || '7'] ?? 7;
}

/** Le séjour chevauche-t-il la période des fêtes (22 déc. – 4 janv.) ? */
export function overlapsHolidays(start: string, end: string): boolean {
  const s = parseYmd(start).getTime();
  const e = parseYmd(end).getTime();
  const y = parseYmd(start).getUTCFullYear();
  for (const year of [y - 1, y]) {
    const hs = Date.UTC(year, 11, 22);
    const he = Date.UTC(year + 1, 0, 4);
    if (s <= he && e >= hs) return true;
  }
  return false;
}

/** Champs du profil déduits de dates précises. */
export function profileFieldsFromDates(start: string, end: string): Partial<TravelProfile> {
  const d = parseYmd(start);
  const day = d.getUTCDate();
  return {
    startDate: start,
    endDate: end,
    month: formatRange(start, end),
    monthIndex: d.getUTCMonth(),
    year: d.getUTCFullYear(),
    monthHalf: day <= 15 ? '1' : '2',
    nights: bucketNights(nightsBetween(start, end)),
  };
}
