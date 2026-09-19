import { NextRequest, NextResponse } from 'next/server';

export interface EdgeCacheOptions {
  sMaxAge: number;
  swr: number;
  staleReason?: string | null;
}

function stableHash(input: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  );
}

export function computeEtag(payload: unknown): string {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return `W/"${stableHash(body)}"`;
}

function buildHeaders(etag: string, opts: EdgeCacheOptions, cacheSource: string): HeadersInit {
  const cache = opts.staleReason
    ? 'public, s-maxage=5, stale-while-revalidate=30'
    : `public, s-maxage=${opts.sMaxAge}, stale-while-revalidate=${opts.swr}`;
  const headers: Record<string, string> = {
    'Cache-Control': cache,
    'CDN-Cache-Control': cache,
    'Vary': 'Accept-Encoding',
    'ETag': etag,
    'X-Cache-Source': cacheSource,
  };
  if (opts.staleReason) {
    headers['X-Stale-Reason'] = opts.staleReason;
  }
  return headers;
}

export function cachedJson(
  req: NextRequest,
  payload: unknown,
  opts: EdgeCacheOptions,
  cacheSource: 'live' | 'stale' | 'fallback' = 'live',
): NextResponse {
  const etag = computeEtag(payload);
  const ifNone = req.headers.get('if-none-match');
  const headers = buildHeaders(etag, opts, cacheSource);
  if (ifNone && ifNone === etag) {
    return new NextResponse(null, { status: 304, headers });
  }
  return NextResponse.json(payload, { headers });
}

export function privateNoStore(payload: unknown, status = 200): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'CDN-Cache-Control': 'no-store',
    },
  });
}
