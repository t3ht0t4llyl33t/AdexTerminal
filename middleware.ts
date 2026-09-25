import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 5;

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const IS_PROD = process.env.NODE_ENV === 'production';

function extractUnverifiedUserId(initData: string): string | null {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const userRaw = params.get('user');
    if (!userRaw) return null;
    const parsed = JSON.parse(userRaw);
    const rawId = parsed?.id;
    if (typeof rawId !== 'number' && typeof rawId !== 'string') return null;
    const id = String(rawId).trim();
    return /^[0-9]{1,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

async function checkRateLimit(key: string): Promise<boolean> {
  if (!supabaseUrl || !supabaseServiceKey) return true;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_key: key,
        p_max_requests: RATE_LIMIT_MAX,
        p_window_ms: RATE_LIMIT_WINDOW_MS,
      }),
    });

    if (!res.ok) return true;
    const data = (await res.json()) as { allowed?: boolean } | null;
    return data?.allowed !== false;
  } catch {
    return true;
  }
}

function buildProdCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https://telegram.org https://web.telegram.org`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://tonapi.io https://api.tonapi.io https://bridge.tonapi.io https://api.mainnet.ton.org https://rpc.ankr.com https://api.groq.com https://api.coingecko.com https://min-api.cryptocompare.com https://api.binance.com https://tonconnect.io https://bridge.tonapi.io",
    "frame-src https://t.me https://web.telegram.org",
    "frame-ancestors https://t.me https://web.telegram.org",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

function buildDevCsp(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://web.telegram.org",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' ws: wss: https: http:",
    "frame-src *",
    "frame-ancestors *",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

const RATE_LIMIT_EXCLUDED_PREFIXES = [
  '/api/support/webhook',
  '/api/partnerships/webhook',
  '/api/billing/crypto-pay-webhook',
  '/api/cron/',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = IS_PROD ? crypto.randomUUID().replace(/-/g, '') : '';
  const csp = IS_PROD ? buildProdCsp(nonce) : buildDevCsp();

  if (pathname.startsWith('/api/')) {
    const isExcluded = RATE_LIMIT_EXCLUDED_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix),
    );

    if (!isExcluded) {
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown';
      const initData = req.headers.get('x-telegram-init-data') || '';
      const tgId = extractUnverifiedUserId(initData);
      const key = tgId ? `tg:${tgId}` : `ip:${ip}`;

      const allowed = await checkRateLimit(key);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too Many Requests', retryAfter: RATE_LIMIT_WINDOW_MS },
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '1',
              'Content-Security-Policy': csp,
            },
          },
        );
      }
    }

    const apiRes = NextResponse.next();
    apiRes.headers.set('Content-Security-Policy', csp);
    return apiRes;
  }

  if (IS_PROD) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-nonce', nonce);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set('Content-Security-Policy', csp);
    return res;
  }

  const res = NextResponse.next();
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|icon.svg|.*\\.webp$|.*\\.png$|.*\\.svg$|.*\\.json$).*)',
  ],
};
