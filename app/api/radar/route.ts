import { NextRequest } from 'next/server';
import { fetchRadarData } from '@/selectors/apiConfig';
import { cachedJson } from '@/lib/edge-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_OPTS = { sMaxAge: 30, swr: 120 };

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
      CACHE_OPTS,
      'live',
    );
  } catch (err) {
    console.error('[radar] route error:', err);
    return cachedJson(
      req,
      { data: [], cached: true, timestamp: Date.now(), source: 'cache' },
      { ...CACHE_OPTS, staleReason: 'upstream_failed' },
      'fallback',
    );
  }
}
