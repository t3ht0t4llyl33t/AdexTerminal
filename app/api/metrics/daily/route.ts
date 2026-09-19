import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || '';
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get('days') || '30');
  const days = Math.max(1, Math.min(365, Number.isFinite(daysParam) ? daysParam : 30));

  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('daily_metrics_snapshot')
    .select('*')
    .gte('metric_date', cutoff)
    .order('metric_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const totals = rows.reduce(
    (acc, r) => ({
      dau_avg: acc.dau_avg + (r.dau as number),
      new_users: acc.new_users + (r.new_users as number),
      scans_total: acc.scans_total + (r.scans_total as number),
      scans_ton: acc.scans_ton + (r.scans_ton as number),
      scans_evm: acc.scans_evm + (r.scans_evm as number),
      dangerous_hits: acc.dangerous_hits + (r.dangerous_hits as number),
      ton_cache_hits: acc.ton_cache_hits + (r.ton_cache_hits as number),
      whale_alerts_shown: acc.whale_alerts_shown + (r.whale_alerts_shown as number),
    }),
    {
      dau_avg: 0,
      new_users: 0,
      scans_total: 0,
      scans_ton: 0,
      scans_evm: 0,
      dangerous_hits: 0,
      ton_cache_hits: 0,
      whale_alerts_shown: 0,
    },
  );
  const dauAvg = rows.length ? Math.round(totals.dau_avg / rows.length) : 0;

  return NextResponse.json({
    ok: true,
    window_days: days,
    row_count: rows.length,
    totals: { ...totals, dau_avg: dauAvg },
    rows,
  });
}
