import { NextRequest, NextResponse } from 'next/server';
import type { Destination } from '@/lib/types';
import type { UnlockResponse } from '@/lib/api-types';
import { getPaidSearchId, UNLOCK_HOURS } from '@/lib/server/stripe';
import { signToken, unseal } from '@/lib/server/seal';

export const dynamic = 'force-dynamic';

// POST /api/unlock { sessionId, sealed } → résultats en clair + jeton valable 24 h
export async function POST(request: NextRequest) {
  try {
    const { sessionId, sealed } = await request.json();
    const data = unseal<{ searchId: string; destinations: Destination[]; nearMisses: Destination[]; suggestions: string[] }>(sealed);
    if (!data) return NextResponse.json({ error: 'Recherche introuvable' }, { status: 400 });

    const paidSearchId = await getPaidSearchId(String(sessionId || ''));
    if (!paidSearchId || paidSearchId !== data.searchId) {
      return NextResponse.json({ error: 'Paiement non confirmé pour cette recherche' }, { status: 402 });
    }

    const expiresAt = Date.now() + UNLOCK_HOURS * 3600 * 1000;
    const res: UnlockResponse = {
      destinations: data.destinations,
      nearMisses: data.nearMisses,
      suggestions: data.suggestions,
      searchId: data.searchId,
      token: signToken({ searchId: data.searchId, exp: expiresAt }),
      expiresAt,
    };
    return NextResponse.json(res);
  } catch (error) {
    console.error('[unlock] erreur', error);
    return NextResponse.json({ error: 'Vérification du paiement impossible, réessaie.' }, { status: 500 });
  }
}
