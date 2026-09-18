import { NextResponse } from 'next/server';
import { fetchRadarData, startPollingLoop } from '@/selectors/apiConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  startPollingLoop();

  try {
    const data = await fetchRadarData();
    return NextResponse.json(
      {
        data: data.tokens,
        cached: false,
        timestamp: data.timestamp,
        source: data.source,
        whales: data.whales,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
    );
  } catch (err) {
    console.error('[radar] route error:', err);
    return NextResponse.json(
      { data: [], cached: true, timestamp: Date.now(), source: 'cache' },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
    );
  }
}
