import { NextRequest, NextResponse } from 'next/server';

// Prix réels des vols via Travelpayouts / Aviasales Data API.
// Données issues du cache des recherches Aviasales (quelques jours d'ancienneté).
//
// GET /api/flight-prices?origin=PAR&destination=TYO&month=2026-12&half=2&nights=7

export const dynamic = 'force-dynamic';

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

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function buildLink(link: string | undefined, marker: string | undefined): string | null {
  if (!link) return null;
  const url = new URL(link, 'https://www.aviasales.com');
  if (marker) url.searchParams.set('marker', marker);
  return url.toString();
}

export async function GET(request: NextRequest) {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) {
    return NextResponse.json({ found: false, reason: 'TRAVELPAYOUTS_TOKEN non configuré' }, { status: 200 });
  }

  const params = request.nextUrl.searchParams;
  const origin = (params.get('origin') || '').toUpperCase();
  const destination = (params.get('destination') || '').toUpperCase();
  const month = params.get('month') || ''; // YYYY-MM
  const half = params.get('half'); // '1' | '2' | null
  const nights = params.get('nights') || '7';

  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination) || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ found: false, reason: 'paramètres invalides' }, { status: 400 });
  }
  if (origin === destination) {
    return NextResponse.json({ found: false, reason: 'même ville' });
  }

  const url = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', destination);
  url.searchParams.set('departure_at', month);
  url.searchParams.set('one_way', 'false');
  url.searchParams.set('sorting', 'price');
  url.searchParams.set('currency', 'eur');
  url.searchParams.set('market', 'fr');
  url.searchParams.set('limit', '200');

  try {
    const res = await fetch(url, {
      headers: { 'X-Access-Token': token, 'Accept-Encoding': 'gzip, deflate' },
      next: { revalidate: 21600 }, // 6h
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[flight-prices] Travelpayouts', res.status, text.slice(0, 300));
      return NextResponse.json({ found: false, reason: `Travelpayouts ${res.status}` });
    }

    const body = (await res.json()) as { success?: boolean; data?: TpTicket[]; error?: string | null };
    const tickets = Array.isArray(body.data) ? body.data.filter((t) => t.price > 0 && t.return_at) : [];

    const inHalf = (t: TpTicket) => {
      if (!half) return true;
      const day = new Date(t.departure_at).getUTCDate();
      return half === '1' ? day <= 15 : day >= 16;
    };
    const [minStay, maxStay] = STAY_RANGE[nights] || STAY_RANGE['7'];
    const goodStay = (t: TpTicket) => {
      const stay = daysBetween(t.departure_at, t.return_at!);
      return stay >= minStay && stay <= maxStay;
    };

    // Du plus précis au plus large : bonne quinzaine + bonne durée, puis quinzaine seule, puis mois
    const exact = tickets.filter((t) => inHalf(t) && goodStay(t));
    const halfOnly = tickets.filter(inHalf);
    const pick = exact[0] ?? halfOnly[0] ?? tickets[0];

    if (!pick) {
      return NextResponse.json(
        { found: false, reason: 'aucun prix en cache pour ce trajet' },
        { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400' } }
      );
    }

    return NextResponse.json(
      {
        found: true,
        price: Math.round(pick.price),
        approx: pick !== exact[0], // dates ou durée différentes de la demande
        departureAt: pick.departure_at,
        returnAt: pick.return_at,
        transfers: pick.transfers ?? null,
        durationTo: pick.duration_to ?? null,
        link: buildLink(pick.link, process.env.TRAVELPAYOUTS_MARKER),
        samples: tickets.length,
      },
      { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400' } }
    );
  } catch (error) {
    console.error('[flight-prices] erreur', error);
    return NextResponse.json({ found: false, reason: 'erreur serveur' });
  }
}
