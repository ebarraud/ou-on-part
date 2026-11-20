import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, paywallEnabled } from '@/lib/server/stripe';
import { unseal } from '@/lib/server/seal';

export const dynamic = 'force-dynamic';

// POST /api/checkout { sealed, waiver: true } → { url } (page de paiement Stripe)
export async function POST(request: NextRequest) {
  if (!paywallEnabled()) return NextResponse.json({ error: 'Paiement non configuré' }, { status: 400 });
  try {
    const { sealed, waiver } = await request.json();
    if (waiver !== true) {
      return NextResponse.json({ error: 'Merci de cocher la case de renonciation au droit de rétractation.' }, { status: 400 });
    }
    const data = unseal<{ searchId: string }>(sealed);
    if (!data?.searchId) return NextResponse.json({ error: 'Recherche introuvable, relance-la.' }, { status: 400 });
    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const url = await createCheckoutSession({ searchId: data.searchId, origin });
    return NextResponse.json({ url });
  } catch (error) {
    console.error('[checkout] erreur', error);
    return NextResponse.json({ error: 'Paiement indisponible, réessaie dans un instant.' }, { status: 500 });
  }
}
