import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';
import { cachedJson } from '@/lib/edge-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_OPTS = { sMaxAge: 300, swr: 1800 };

const FALLBACK = {
  price_ton: 3.3,
  price_usd_target: 9.9,
  min_ton: 1.0,
  max_ton: 9.9,
  source: 'fallback',
  updated_at: null as string | null,
};

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('pro_pricing')
      .select('price_ton, price_usd_target, min_ton, max_ton, source, updated_at')
      .eq('id', 'monthly_pro')
      .maybeSingle();

    if (!data) {
      return cachedJson(
        req,
        { ok: true, ...FALLBACK },
        { ...CACHE_OPTS, staleReason: 'no_row' },
        'fallback',
      );
    }

    return cachedJson(
      req,
      {
        ok: true,
        price_ton: Number(data.price_ton),
        price_usd_target: Number(data.price_usd_target),
        min_ton: Number(data.min_ton),
        max_ton: Number(data.max_ton),
        source: data.source,
        updated_at: data.updated_at,
      },
      CACHE_OPTS,
      'live',
    );
  } catch {
    return cachedJson(
      req,
      { ok: true, ...FALLBACK },
      { ...CACHE_OPTS, staleReason: 'db_error' },
      'fallback',
    );
  }
}
