import { NextRequest, NextResponse } from 'next/server';
import type { TravelProfile, Destination } from '@/lib/types';
import type { DestinationTeaser, SearchResponse } from '@/lib/api-types';
import { generateValidDestinations } from '@/lib/server/generate';
import { buildRelaxSuggestions, closestMisses } from '@/lib/constraints';
import { getDisplayedBudget } from '@/lib/budget';
import { newSearchId, seal, verifyToken } from '@/lib/server/seal';
import { paywallEnabled, UNLOCK_HOURS, UNLOCK_PRICE_CENTS } from '@/lib/server/stripe';
import { rateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function teaser(profile: TravelProfile, d: Destination): DestinationTeaser {
  const b = getDisplayedBudget(profile, d);
  return {
    matchScore: d.matchScore,
    budgetMin: b.min,
    budgetMax: b.max,
    flightDuration: d.flightDuration,
    airTemp: d.airTemp,
    waterTemp: d.waterTemp,
    hasFerry: !!d.ferry,
    realFlightPrice: b.realFlight,
    highlightsCount: d.highlights?.length || 0,
  };
}

/**
 * POST /api/search
 * - Nouvelle recherche : { profile } → résultats verrouillés (paywall) ou en clair (paywall désactivé)
 * - Remplacement d'une destination : { profile, count: 1, excludedCodes, token } → en clair si le jeton est valide
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`search:${ip}`, 12, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Trop de recherches, réessaie dans un moment.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const profile = body.profile as TravelProfile;
    if (!profile || !profile.month) {
      return NextResponse.json({ error: 'Profil incomplet' }, { status: 400 });
    }
    const count = body.count === 1 ? 1 : 3;
    const excludedCodes: string[] = Array.isArray(body.excludedCodes) ? body.excludedCodes.slice(0, 50) : [];
    const claims = verifyToken(body.token);

    // Remplacement : réservé aux résultats débloqués (ou paywall désactivé)
    if (count === 1 && paywallEnabled() && !claims) {
      return NextResponse.json({ error: 'Résultats non débloqués' }, { status: 402 });
    }

    const { destinations, rejected } = await generateValidDestinations(profile, count, excludedCodes);
    const nearMisses = destinations.length === 0 ? closestMisses(profile, rejected) : [];
    const suggestions = destinations.length < count ? buildRelaxSuggestions(profile, rejected) : [];

    if (!paywallEnabled() || count === 1 || (destinations.length === 0 && nearMisses.length === 0)) {
      const res: SearchResponse = { locked: false, destinations, nearMisses, suggestions };
      return NextResponse.json(res);
    }

    const searchId = newSearchId();
    const shown = destinations.length > 0 ? destinations : nearMisses;
    const res: SearchResponse = {
      locked: true,
      search: {
        searchId,
        sealed: seal({ searchId, destinations, nearMisses, suggestions }),
        teasers: shown.map((d) => teaser(profile, d)),
        noMatch: destinations.length === 0,
        suggestions,
        priceCents: UNLOCK_PRICE_CENTS,
        hours: UNLOCK_HOURS,
      },
    };
    return NextResponse.json(res);
  } catch (error) {
    console.error('[search] erreur', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur serveur' }, { status: 500 });
  }
}
