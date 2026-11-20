import 'server-only';

// Paiement via Stripe Checkout (API REST, sans SDK).
// Le paywall n'est actif que si STRIPE_SECRET_KEY est configurée.

export const UNLOCK_PRICE_CENTS = parseInt(process.env.UNLOCK_PRICE_CENTS || '199', 10);
export const UNLOCK_HOURS = 24;

export function paywallEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

async function stripe(path: string, init?: { method?: string; form?: Record<string, string> }) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init?.method || 'GET',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(init?.form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: init?.form ? new URLSearchParams(init.form).toString() : undefined,
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[stripe]', res.status, JSON.stringify(data).slice(0, 500));
    throw new Error(data?.error?.message || `Stripe ${res.status}`);
  }
  return data;
}

export async function createCheckoutSession(opts: { searchId: string; origin: string }): Promise<string> {
  const session = await stripe('checkout/sessions', {
    method: 'POST',
    form: {
      mode: 'payment',
      locale: 'fr',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': String(UNLOCK_PRICE_CENTS),
      'line_items[0][price_data][product_data][name]': 'Où on part ? — tes destinations',
      'line_items[0][price_data][product_data][description]': `Tes destinations, les remplacements et l'itinéraire jour par jour, pendant ${UNLOCK_HOURS} h`,
      'metadata[searchId]': opts.searchId,
      'metadata[waiver]': 'renonciation-retractation-acceptee',
      success_url: `${opts.origin}/results?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${opts.origin}/results`,
    },
  });
  return session.url as string;
}

export async function getPaidSearchId(sessionId: string): Promise<string | null> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  const session = await stripe(`checkout/sessions/${sessionId}`);
  return session.payment_status === 'paid' ? (session.metadata?.searchId as string) || null : null;
}
