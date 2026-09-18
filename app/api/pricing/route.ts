import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FALLBACK = {
  price_ton: 3.3,
  price_usd_target: 9.9,
  min_ton: 1.0,
  max_ton: 9.9,
  source: 'fallback',
  updated_at: null as string | null,
};

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('pro_pricing')
      .select('price_ton, price_usd_target, min_ton, max_ton, source, updated_at')
      .eq('id', 'monthly_pro')
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ ok: true, ...FALLBACK }, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' },
      });
    }

    return NextResponse.json(
      {
        ok: true,
        price_ton: Number(data.price_ton),
        price_usd_target: Number(data.price_usd_target),
        min_ton: Number(data.min_ton),
        max_ton: Number(data.max_ton),
        source: data.source,
        updated_at: data.updated_at,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' } },
    );
  } catch {
    return NextResponse.json({ ok: true, ...FALLBACK });
  }
}
