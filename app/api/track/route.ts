import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyInitDataString } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const ALLOWED_EVENTS = new Set([
  'app_opened',
  'tab_switched',
  'scan_started',
  'scan_completed',
  'paywall_shown',
  'paywall_dismissed',
  'pro_upgrade_started',
  'pro_upgrade_completed',
  'watchlist_added',
  'watchlist_removed',
  'watchlist_viewed',
  'digest_opened',
  'referral_shared',
  'referral_claimed',
  'welcome_visited',
]);

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_EVENTS = 60;
const rateBuckets = new Map<string, number[]>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key) ?? [];
  const fresh = bucket.filter((t) => now - t < RATE_WINDOW_MS);
  if (fresh.length >= RATE_MAX_EVENTS) {
    rateBuckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  rateBuckets.set(key, fresh);
  if (rateBuckets.size > 5000) {
    for (const [k, list] of rateBuckets) {
      if (list.every((t) => now - t >= RATE_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  return true;
}

function sanitizeProps(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') return {};
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const [rawKey, rawVal] of Object.entries(src)) {
    if (count >= 12) break;
    const key = rawKey.slice(0, 32);
    if (typeof rawVal === 'string') out[key] = rawVal.slice(0, 256);
    else if (typeof rawVal === 'number' && Number.isFinite(rawVal)) out[key] = rawVal;
    else if (typeof rawVal === 'boolean') out[key] = rawVal;
    else continue;
    count++;
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ ok: true });
    }

    const body = await req.json().catch(() => ({}));
    const eventName = String(body.event_name || '');
    if (!ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ ok: false, error: 'unknown_event' }, { status: 400 });
    }

    const headerInitData = req.headers.get('x-telegram-init-data') || '';
    const bodyInitData = typeof body.init_data === 'string' ? body.init_data : '';
    const initData = headerInitData || bodyInitData;
    const verified = initData ? await verifyInitDataString(initData) : null;
    const tgUserId = verified?.telegramUserId ?? null;
    const rateKey = tgUserId || req.headers.get('x-forwarded-for') || 'anon';
    if (!checkRateLimit(rateKey)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const props = sanitizeProps(body.props);
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    await supabase.from('product_events').insert({
      telegram_user_id: tgUserId,
      event_name: eventName,
      event_props: props,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
