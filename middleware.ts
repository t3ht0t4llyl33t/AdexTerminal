import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 5;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

declare global {
  var adexRateLimitMap: Map<string, RateLimitEntry> | undefined;
}

function getRateLimitMap(): Map<string, RateLimitEntry> {
  if (!globalThis.adexRateLimitMap) {
    globalThis.adexRateLimitMap = new Map();
  }
  return globalThis.adexRateLimitMap;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/support/webhook') || pathname.startsWith('/api/partnerships/webhook')) {
    return NextResponse.next();
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const tgUserId = req.headers.get('x-telegram-user-id') || '';
  const key = tgUserId || ip;

  const map = getRateLimitMap();
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || now > entry.resetAt) {
    if (map.size > 10000) {
      map.forEach((v, k) => {
        if (now > v.resetAt) map.delete(k);
      });
    }
    map.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return NextResponse.next();
  }

  entry.count++;

  if (entry.count > RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: 'Too Many Requests', retryAfter: RATE_LIMIT_WINDOW_MS },
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '1',
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
