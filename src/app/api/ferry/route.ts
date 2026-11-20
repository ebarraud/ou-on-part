import { NextRequest, NextResponse } from 'next/server';
import { ferryFromParams } from '@/lib/server/ferry';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const r = await ferryFromParams(request.nextUrl.searchParams);
  return NextResponse.json(r.body, r.init);
}
