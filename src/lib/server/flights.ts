import 'server-only';

export interface Reply {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  init?: { status?: number; headers?: Record<string, string> };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reply = (body: any, init?: Reply['init']): Reply => ({ body, init });

// Prix réels des vols via Travelpayouts / Aviasales Data API.
// Données issues du cache des recherches Aviasales (quelques jours d'ancienneté).
//
// Période flexible : GET /api/flight-prices?origin=PAR&destination=TYO&month=2026-12&half=2&nights=7&maxHours=6
// Dates précises  : GET /api/flight-prices?origin=PAR&destination=TYO&month=2026-12&depart=2026-12-20&return=2026-12-27&maxHours=6


interface TpTicket {
  origin: string;
  destination: string;
  price: number;
  departure_at: string;
  return_at?: string;
  transfers?: number;
  return_transfers?: number;
  duration_to?: number;
  link?: string;
}

// Plage de durée de séjour (jours) acceptée pour chaque choix de nuits
const STAY_RANGE: Record<string, [number, number]> = {
  '2-3': [2, 4],
  '4-6': [3, 7],
  '7': [6, 9],
  '10+': [9, 21],
};

// Tolérance autour des dates précises
const DATE_TOLERANCE_DAYS = 3;

// Identifiant du programme Aviasales dans les redirections tp.media
const AVIASALES_PROGRAM_ID = 4114;

const DAY_MS = 86_400_000;
const CACHE_HEADERS = { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400' };

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS);
}

/** Date locale (YYYY-MM-DD) d'un horodatage ISO avec décalage, ex. "2026-12-20T10:30:00+01:00" */
function localDay(iso: string): string {
  return iso.slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  return Math.abs(Math.round((Date.parse(a) - Date.parse(b)) / DAY_MS));
}

function shiftMonth(ymd: string, days: number): string {
  const d = new Date(Date.parse(ymd) + days * DAY_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Lien vers une recherche Aviasales fraîche sur les dates du billet trouvé
 * (ex. /search/LYS2012TCI27121). On n'utilise pas le lien « billet » du cache :
 * il pointe vers une offre précise souvent déjà épuisée (« This ticket has sold out »).
 * Le tout passe par la redirection de suivi Travelpayouts (marker + programme Aviasales).
 */
function buildLink(
  origin: string,
  destination: string,
  depart: string, // YYYY-MM-DD
  ret: string,
  pax: string, // "2", "21", "211" : adultes, enfants, bébés
  marker: string | undefined
): string {
  const ddmm = (ymd: string) => `${ymd.slice(8, 10)}${ymd.slice(5, 7)}`;
  const search = `https://www.aviasales.com/search/${origin}${ddmm(depart)}${destination}${ddmm(ret)}${pax}`;
  if (!marker) return search;
  return `https://tp.media/r?marker=${encodeURIComponent(marker)}&p=${AVIASALES_PROGRAM_ID}&u=${encodeURIComponent(search)}`;
}

async function fetchTickets(token: string, origin: string, destination: string, month: string): Promise<TpTicket[]> {
  const url = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', destination);
  url.searchParams.set('departure_at', month);
  url.searchParams.set('one_way', 'false');
  url.searchParams.set('sorting', 'price');
  url.searchParams.set('currency', 'eur');
  url.searchParams.set('market', 'fr');
  url.searchParams.set('limit', '500');

  const res = await fetch(url, {
    headers: { 'X-Access-Token': token, 'Accept-Encoding': 'gzip, deflate' },
    next: { revalidate: 21600 }, // 6h
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[flight-prices] Travelpayouts', res.status, text.slice(0, 300));
    throw new Error(`Travelpayouts ${res.status}`);
  }
  const body = (await res.json()) as { data?: TpTicket[] };
  return Array.isArray(body.data) ? body.data.filter((t) => t.price > 0 && t.return_at) : [];
}

export async function flightPriceFromParams(params: URLSearchParams): Promise<Reply> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) {
    return reply({ found: false, reason: 'TRAVELPAYOUTS_TOKEN non configuré' });
  }

  const origin = (params.get('origin') || '').toUpperCase();
  const destination = (params.get('destination') || '').toUpperCase();
  const month = params.get('month') || ''; // YYYY-MM
  const half = params.get('half'); // '1' | '2' | null
  const nights = params.get('nights') || '7';
  const depart = params.get('depart'); // YYYY-MM-DD (dates précises)
  const ret = params.get('return');
  const adults = Math.min(9, Math.max(1, parseInt(params.get('adults') || '1', 10) || 1));
  const children = Math.min(8, Math.max(0, parseInt(params.get('children') || '0', 10) || 0));
  const infants = Math.min(adults, Math.max(0, parseInt(params.get('infants') || '0', 10) || 0));
  const pax = `${adults}${children || infants ? children : ''}${infants ? infants : ''}`;
  const marker = process.env.TRAVELPAYOUTS_MARKER;
  const maxHours = parseFloat(params.get('maxHours') || ''); // NaN = pas de limite
  const maxMinutes = isFinite(maxHours) && maxHours > 0 ? maxHours * 60 : Infinity;

  const exactDates =
    !!depart && !!ret && /^\d{4}-\d{2}-\d{2}$/.test(depart) && /^\d{4}-\d{2}-\d{2}$/.test(ret);

  if (
    !/^[A-Z]{3}$/.test(origin) ||
    !/^[A-Z]{3}$/.test(destination) ||
    (!exactDates && !/^\d{4}-\d{2}$/.test(month))
  ) {
    return reply({ found: false, reason: 'paramètres invalides' }, { status: 400 });
  }
  if (origin === destination) {
    return reply({ found: false, reason: 'même ville' });
  }

  try {
    let tiers: TpTicket[][];
    let exact: TpTicket[];

    if (exactDates) {
      // Mois couvrant la tolérance autour du départ (1 ou 2 appels)
      const months = Array.from(
        new Set([
          shiftMonth(depart!, -DATE_TOLERANCE_DAYS),
          shiftMonth(depart!, 0),
          shiftMonth(depart!, DATE_TOLERANCE_DAYS),
        ])
      );
      const all = (await Promise.all(months.map((m) => fetchTickets(token, origin, destination, m))))
        .flat()
        .sort((a, b) => a.price - b.price);
      exact = all.filter((t) => localDay(t.departure_at) === depart && localDay(t.return_at!) === ret);
      const close = all.filter(
        (t) =>
          dayDiff(localDay(t.departure_at), depart!) <= DATE_TOLERANCE_DAYS &&
          dayDiff(localDay(t.return_at!), ret!) <= DATE_TOLERANCE_DAYS
      );
      tiers = [exact, close];
    } else {
      const tickets = await fetchTickets(token, origin, destination, month);
      const inHalf = (t: TpTicket) => {
        if (!half) return true;
        const day = Number(localDay(t.departure_at).slice(8));
        return half === '1' ? day <= 15 : day >= 16;
      };
      const [minStay, maxStay] = STAY_RANGE[nights] || STAY_RANGE['7'];
      const goodStay = (t: TpTicket) => {
        const stay = daysBetween(t.departure_at, t.return_at!);
        return stay >= minStay && stay <= maxStay;
      };
      // Du plus précis au plus large : bonne quinzaine + bonne durée, puis quinzaine seule, puis mois
      exact = tickets.filter((t) => inHalf(t) && goodStay(t));
      tiers = [exact, tickets.filter(inHalf), tickets];
    }

    // Dans chaque niveau, on préfère le moins cher dont la durée aller respecte la limite
    const fits = (t: TpTicket) => typeof t.duration_to === 'number' && t.duration_to <= maxMinutes;
    const choose = (levels: TpTicket[][]): { t?: TpTicket; withinLimit: boolean } => {
      for (const level of levels) {
        const t = level.find(fits);
        if (t) return { t, withinLimit: true };
      }
      return { t: levels.find((l) => l.length > 0)?.[0], withinLimit: false };
    };
    const describe = (t: TpTicket, withinLimit: boolean, linkDates?: [string, string]) => ({
      price: Math.round(t.price),
      withinLimit,
      departureAt: t.departure_at,
      returnAt: t.return_at,
      transfers: t.transfers ?? null,
      durationTo: t.duration_to ?? null,
      link: buildLink(
        t.origin,
        t.destination,
        linkDates?.[0] ?? localDay(t.departure_at),
        linkDates?.[1] ?? localDay(t.return_at!),
        pax,
        marker
      ),
    });

    if (exactDates) {
      // Dates précises : seul un billet AUX dates demandées compte comme prix constaté.
      // Un billet à ±3 jours est proposé à part comme « autre date », jamais utilisé dans le budget
      // (autour des fêtes, 3 jours d'écart peuvent diviser le prix par deux).
      const main = choose([tiers[0]]);
      const others = tiers[1].filter((t) => !tiers[0].includes(t));
      const alt = choose([others]);
      const alternative =
        alt.t && (!main.t || alt.t.price < main.t.price * 0.85) ? describe(alt.t, alt.withinLimit) : null;
      return reply(
        main.t
          ? { found: true, approx: false, ...describe(main.t, main.withinLimit, [depart!, ret!]), alternative }
          : {
              found: false,
              reason: 'aucun prix en cache à ces dates',
              alternative,
              searchLink: buildLink(origin, destination, depart!, ret!, pax, marker),
            },
        { headers: CACHE_HEADERS }
      );
    }

    const { t: pick, withinLimit } = choose(tiers);
    if (!pick) {
      return reply({ found: false, reason: 'aucun prix en cache pour ce trajet' }, { headers: CACHE_HEADERS });
    }
    return reply(
      { found: true, approx: !exact.includes(pick), ...describe(pick, withinLimit) },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[flight-prices] erreur', error);
    return reply({ found: false, reason: 'erreur Travelpayouts' });
  }
}
