import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 900;

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ ok: true, items: [] });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('contract_blacklist')
      .select('contract_address, network, reason, token_symbol, risk_score, created_at')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(6);

    const items = (data ?? []).map((row) => ({
      address: row.contract_address as string,
      network: row.network as string,
      reason: (row.reason as string | null) || null,
      symbol: (row.token_symbol as string | null) || null,
      score: (row.risk_score as number | null) ?? null,
      created_at: row.created_at as string,
    }));

    return NextResponse.json(
      { ok: true, items },
      {
        headers: {
          'Cache-Control': 's-maxage=900, stale-while-revalidate=1800',
        },
      },
    );
  } catch {
    return NextResponse.json({ ok: true, items: [] });
  }
}
