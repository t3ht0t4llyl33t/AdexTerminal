import { NextRequest } from 'next/server';
import { fetchRadarData } from '@/selectors/apiConfig';
import { cachedJson, PUBLIC_READ_CACHE } from '@/lib/edge-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const data = await fetchRadarData();
    return cachedJson(
      req,
      {
        data: data.tokens,
        cached: false,
        timestamp: data.timestamp,
        source: data.source,
        whales: data.whales,
      },
      PUBLIC_READ_CACHE,
      'live',
    );
  } catch (err) {
    console.error('[radar] route error:', err);
    return cachedJson(
      req,
      { data: [], cached: true, timestamp: Date.now(), source: 'cache' },
      { ...PUBLIC_READ_CACHE, staleReason: 'upstream_failed' },
      'fallback',
    );
  }
}
