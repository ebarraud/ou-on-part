import { NextRequest, NextResponse } from 'next/server';

// Traversées ferry via le serveur MCP public de Ferryhopper (prix indicatifs + lien de réservation).
// GET /api/ferry?from=Toulon&to=Ajaccio&date=2027-05-15&return=2027-05-22&passengers=2&vehicle=1

export const dynamic = 'force-dynamic';

const MCP_URL = 'https://mcp.ferryhopper.com/mcp';
const CACHE_HEADERS = { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400' };

/** Lit une réponse JSON-RPC, en JSON simple ou en flux SSE (« data: {...} »). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readRpc(res: Response): Promise<any> {
  const text = await res.text();
  if ((res.headers.get('content-type') || '').includes('text/event-stream')) {
    const lines = text.split('\n').filter((l) => l.startsWith('data:'));
    for (const line of lines.reverse()) {
      try {
        const msg = JSON.parse(line.slice(5).trim());
        if (msg.result || msg.error) return msg;
      } catch {}
    }
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function rpc(method: string, params: unknown, id: number | null, sessionId?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2025-06-18',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const body = id === null ? { jsonrpc: '2.0', method, params } : { jsonrpc: '2.0', id, method, params };
  const res = await fetch(MCP_URL, { method: 'POST', headers, body: JSON.stringify(body), cache: 'no-store' });
  return { res, sessionId: res.headers.get('mcp-session-id') || sessionId };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callTool(name: string, args: Record<string, unknown>): Promise<any> {
  const init = await rpc(
    'initialize',
    { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'ou-on-part', version: '1.0' } },
    1
  );
  if (!init.res.ok) throw new Error(`initialize ${init.res.status}`);
  await readRpc(init.res);
  const sessionId = init.sessionId || undefined;
  const notif = await rpc('notifications/initialized', {}, null, sessionId);
  await notif.res.text().catch(() => '');
  const call = await rpc('tools/call', { name, arguments: args }, 2, sessionId);
  if (!call.res.ok) throw new Error(`tools/call ${call.res.status}`);
  const msg = await readRpc(call.res);
  if (msg?.error) throw new Error(msg.error.message || 'erreur MCP');
  return msg?.result;
}

interface Leg {
  price: number; // € aller simple, 1 passager, hébergement le moins cher
  departure: string;
  durationHours: number;
  operator: string | null;
  fromCode: string | null;
  toCode: string | null;
  deepLink: string | null;
}

/** Itinéraire direct le moins cher d'une réponse search_trips (prix en centimes). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cheapestLeg(result: any): Leg | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itineraries: any[] = result?.structuredContent?.foundDirectItinerariesForTrip || [];
  let best: Leg | null = null;
  for (const it of itineraries) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const segments: any[] = it.segments || [];
    if (segments.length === 0) continue;
    let total = 0;
    for (const seg of segments) {
      const cents: number[] = (seg.accommodations || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((a: any) => a?.expectedPrice?.totalPriceInCents)
        .filter((c: unknown): c is number => typeof c === 'number' && c > 0);
      if (cents.length === 0) {
        total = NaN;
        break;
      }
      total += Math.min(...cents) / 100;
    }
    if (!isFinite(total)) continue;
    const first = segments[0];
    const last = segments[segments.length - 1];
    const hours = (Date.parse(last.arrivalDateTime) - Date.parse(first.departureDateTime)) / 3_600_000;
    let fromCode: string | null = null;
    let toCode: string | null = null;
    try {
      const itin = new URL(it.deepLink).searchParams.get('itinerary')?.split(',') || [];
      fromCode = itin[0] || null;
      toCode = itin[itin.length - 1] || null;
    } catch {}
    const leg: Leg = {
      price: total,
      departure: first.departureDateTime,
      durationHours: isFinite(hours) && hours > 0 ? Math.round(hours * 10) / 10 : 0,
      operator: first.ownerCompany?.name || first.marketingCompany?.name || null,
      fromCode,
      toCode,
      deepLink: it.deepLink || null,
    };
    if (!best || leg.price < best.price) best = leg;
  }
  return best;
}

function titleCase(s: string | null): string | null {
  if (!s) return null;
  return s
    .toLowerCase()
    .split(/([\s-])/)
    .map((w) => (w.length > 1 || /[a-zà-ÿ]/i.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join('');
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const from = (params.get('from') || '').trim();
  const to = (params.get('to') || '').trim();
  const date = params.get('date') || '';
  const returnDate = params.get('return') || '';
  const passengers = Math.min(9, Math.max(1, parseInt(params.get('passengers') || '1', 10) || 1));
  const vehicles = params.get('vehicle') === '1' ? 1 : 0;
  const debug = params.get('debug') === '1';

  if (!from || !to || !YMD.test(date) || (returnDate && !YMD.test(returnDate))) {
    return NextResponse.json({ found: false, reason: 'paramètres invalides' }, { status: 400 });
  }

  try {
    const [outRaw, backRaw] = await Promise.all([
      callTool('search_trips', { departureLocation: from, arrivalLocation: to, date }),
      returnDate
        ? callTool('search_trips', { departureLocation: to, arrivalLocation: from, date: returnDate }).catch(() => null)
        : Promise.resolve(null),
    ]);
    if (debug) {
      return NextResponse.json({ debug: true, raw: JSON.stringify(outRaw).slice(0, 6000) });
    }

    const out = cheapestLeg(outRaw);
    const back = backRaw ? cheapestLeg(backRaw) : null;
    if (!out) {
      return NextResponse.json({ found: false, reason: 'aucune traversée directe trouvée' }, { headers: CACHE_HEADERS });
    }

    // Lien Ferryhopper (fr) : aller-retour si possible, voyageurs et véhicule
    let link: string | null = null;
    if (out.deepLink) {
      const url = new URL(out.deepLink);
      url.pathname = url.pathname.replace(/^\/en\//, '/fr/');
      url.searchParams.delete('IDSCode');
      if (returnDate && out.fromCode && out.toCode) {
        url.searchParams.set('itinerary', `${out.fromCode},${out.toCode},${out.fromCode}`);
        url.searchParams.set('dates', `${date.replace(/-/g, '')},${returnDate.replace(/-/g, '')}`);
      }
      url.searchParams.set('passengers', String(passengers));
      url.searchParams.set('vehicles', String(vehicles));
      link = url.toString();
    }

    return NextResponse.json(
      {
        found: true,
        price: Math.round(out.price + (returnDate ? back?.price ?? out.price : 0)), // € / passager, hors véhicule
        roundTrip: !!returnDate,
        returnEstimated: !!returnDate && !back, // retour non trouvé : prix de l'aller doublé
        durationHours: out.durationHours,
        operator: titleCase(out.operator),
        link,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[ferry] erreur', error);
    return NextResponse.json({ found: false, reason: 'Ferryhopper indisponible' });
  }
}
