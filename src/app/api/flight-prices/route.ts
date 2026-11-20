import { NextRequest, NextResponse } from 'next/server';
import { flightPriceFromParams } from '@/lib/server/flights';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const r = await flightPriceFromParams(request.nextUrl.searchParams);
  return NextResponse.json(r.body, r.init);
}
