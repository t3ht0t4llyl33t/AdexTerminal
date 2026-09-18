import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CRON_SECRET = process.env.CRON_SECRET || '';
const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd';

async function fetchTonUsd(): Promise<{ rate: number; source: string } | null> {
  try {
    const res = await fetch(COINGECKO_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, { usd?: number }>;
    const rate = json['the-open-network']?.usd;
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null;
    return { rate, source: 'coingecko' };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const feed = await fetchTonUsd();
  if (!feed) {
    return NextResponse.json({ ok: false, error: 'rate_feed_unavailable' }, { status: 502 });
  }

  const supabase = getSupabase();

  const { data: pricingRow } = await supabase
    .from('pro_pricing')
    .select('price_usd_target, min_ton, max_ton')
    .eq('id', 'monthly_pro')
    .maybeSingle();

  const usdTarget = Number(pricingRow?.price_usd_target ?? 9.9);
  const minTon = Number(pricingRow?.min_ton ?? 1.0);
  const maxTon = Number(pricingRow?.max_ton ?? 9.9);

  const rawTon = usdTarget / feed.rate;
  const flooredTon = Math.floor(rawTon * 10) / 10;
  const priceTon = Math.min(Math.max(flooredTon, minTon), maxTon);

  const now = new Date().toISOString();

  await supabase.from('ton_price_cache').upsert(
    { id: 'ton_usd', usd_per_ton: feed.rate, source: feed.source, updated_at: now },
    { onConflict: 'id' },
  );

  await supabase.from('pro_pricing').upsert(
    {
      id: 'monthly_pro',
      price_ton: priceTon,
      price_usd_target: usdTarget,
      min_ton: minTon,
      max_ton: maxTon,
      source: `coingecko@${feed.rate.toFixed(4)}`,
      updated_at: now,
    },
    { onConflict: 'id' },
  );

  return NextResponse.json({
    ok: true,
    usd_per_ton: feed.rate,
    price_ton: priceTon,
    price_usd_target: usdTarget,
    updated_at: now,
  });
}
