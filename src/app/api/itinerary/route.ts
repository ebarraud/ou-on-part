import { NextRequest, NextResponse } from 'next/server';
import type { Destination, TravelProfile } from '@/lib/types';
import { generateItinerary, generateRoute } from '@/lib/server/generate';
import { verifyToken } from '@/lib/server/seal';
import { paywallEnabled } from '@/lib/server/stripe';
import { rateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/itinerary { profile, destination, token } → itinéraire jour par jour ou circuit
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`itinerary:${ip}`, 15, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Trop de demandes, réessaie dans un moment.' }, { status: 429 });
  }
  try {
    const { profile, destination, token } = (await request.json()) as {
      profile: TravelProfile;
      destination: Destination;
      token?: string;
    };
    if (paywallEnabled() && !verifyToken(token)) {
      return NextResponse.json({ error: 'Résultats non débloqués' }, { status: 402 });
    }
    if (!profile || !destination?.city) return NextResponse.json({ error: 'Requête incomplète' }, { status: 400 });
    const data =
      profile.travelStyle === 'moving'
        ? { route: await generateRoute(profile, destination) }
        : { itinerary: await generateItinerary(profile, destination) };
    return NextResponse.json(data);
  } catch (error) {
    console.error('[itinerary] erreur', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur serveur' }, { status: 500 });
  }
}
