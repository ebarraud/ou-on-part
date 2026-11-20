import { NextRequest, NextResponse } from 'next/server';

// Traversées ferry via le serveur MCP public de Ferryhopper (prix indicatifs + lien de réservation).
// GET /api/ferry?from=Toulon&to=Ajaccio&date=2026-12-20

export const dynamic = 'force-dynamic';

const MCP_URL = 'https://mcp.ferryhopper.com/mcp';
const CACHE_HEADERS = { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400' };

/** Lit une réponse JSON-RPC, en JSON simple ou en flux SSE (« data: {...} »). */
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

async function callTool(name: string, args: Record<string, unknown>) {
  const init = await rpc(
    'initialize',
    {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'ou-on-part', version: '1.0' },
    },
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

/** Extrait les objets structurés de la réponse d'outil (structuredContent ou texte JSON). */
function extractPayload(result: any): any {
  if (!result) return null;
  if (result.structuredContent) return result.structuredContent;
  for (const c of result.content || []) {
    if (c.type === 'text') {
      try {
        return JSON.parse(c.text);
      } catch {}
    }
  }
  return result;
}

/** Parcourt récursivement la réponse pour trouver prix et liens Ferryhopper. */
function scan(node: any, found: { prices: number[]; links: string[]; durations: string[]; operators: string[] }) {
  if (node == null) return;
  if (Array.isArray(node)) {
    node.forEach((n) => scan(n, found));
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const key = k.toLowerCase();
      if (typeof v === 'number' && /price|amount|fare|cost/.test(key) && v > 0) found.prices.push(v);
      if (typeof v === 'string') {
        if (/ferryhopper\.com/.test(v) && /^https?:/.test(v)) found.links.push(v);
        if (/price|amount|fare/.test(key)) {
          const n = parseFloat(v.replace(',', '.').replace(/[^\d.]/g, ''));
          if (n > 0) found.prices.push(n);
        }
        if (/duration/.test(key)) found.durations.push(v);
        if (/operator|company/.test(key)) found.operators.push(v);
      }
      scan(v, found);
    }
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const from = (params.get('from') || '').trim();
  const to = (params.get('to') || '').trim();
  const date = params.get('date') || '';
  const debug = params.get('debug') === '1';

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ found: false, reason: 'paramètres invalides' }, { status: 400 });
  }

  try {
    const result = await callTool('search_trips', {
      departureLocation: from,
      arrivalLocation: to,
      date,
    });
    const payload = extractPayload(result);
    if (debug) {
      return NextResponse.json({ debug: true, raw: JSON.stringify(result).slice(0, 6000) });
    }

    const found = { prices: [] as number[], links: [] as string[], durations: [] as string[], operators: [] as string[] };
    scan(payload, found);
    const price = found.prices.length ? Math.round(Math.min(...found.prices)) : null;
    const link = found.links[0] || null;

    return NextResponse.json(
      {
        found: !!(price || link),
        price, // aller simple, passager, prix indicatif
        link,
        operators: Array.from(new Set(found.operators)).slice(0, 3),
        duration: found.durations[0] || null,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[ferry] erreur', error);
    return NextResponse.json({ found: false, reason: String(error).slice(0, 200) });
  }
}
