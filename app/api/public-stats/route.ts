import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';
import { cachedJson } from '@/lib/edge-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PUBLIC_FIELDS = [
  'metric_date',
  'dau',
  'new_users',
  'scans_total',
  'scans_ton',
  'scans_bsc',
  'scans_base',
  'scans_other',
  'dangerous_hits',
  'ton_cache_hits',
  'whale_alerts_shown',
  'whales_flagged',
  'scam_flags_new',
  'active_users_7d',
  'tokens_indexed',
  'payout_amount_usd',
  'pro_active',
] as const;

interface DailyRow {
  metric_date: string;
  dau: number;
  new_users: number;
  scans_total: number;
  scans_ton: number;
  scans_bsc: number;
  scans_base: number;
  scans_other: number;
  dangerous_hits: number;
  ton_cache_hits: number;
  whale_alerts_shown: number;
  whales_flagged: number;
  scam_flags_new: number;
  active_users_7d: number;
  tokens_indexed: number;
  payout_amount_usd: number;
  pro_active: number;
}

function aggregate(rows: DailyRow[], windowDays: number) {
  const slice = rows.slice(0, windowDays);
  const totals = {
    scans_total: 0,
    scans_ton: 0,
    scans_evm: 0,
    dangerous_hits: 0,
    whale_alerts_shown: 0,
    scam_flags_new: 0,
    payout_amount_usd: 0,
    new_users: 0,
  };
  let dauSum = 0;
  for (const r of slice) {
    totals.scans_total += r.scans_total;
    totals.scans_ton += r.scans_ton;
    totals.scans_evm += r.scans_bsc + r.scans_base + r.scans_other;
    totals.dangerous_hits += r.dangerous_hits;
    totals.whale_alerts_shown += r.whale_alerts_shown;
    totals.scam_flags_new += r.scam_flags_new;
    totals.payout_amount_usd += Number(r.payout_amount_usd || 0);
    totals.new_users += r.new_users;
    dauSum += r.dau;
  }
  return {
    days: slice.length,
    dau_avg: slice.length ? Math.round(dauSum / slice.length) : 0,
    ...totals,
    payout_amount_usd: Math.round(totals.payout_amount_usd * 100) / 100,
  };
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase();

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('daily_metrics_snapshot')
    .select(PUBLIC_FIELDS.join(','))
    .gte('metric_date', cutoff)
    .order('metric_date', { ascending: false })
    .limit(30);

  if (error) {
    return cachedJson(
      req,
      { ok: false, error: 'stats_unavailable' },
      { sMaxAge: 30, swr: 60, staleReason: 'db_error' },
      'fallback',
    );
  }

  const rows = (data as unknown as DailyRow[]) ?? [];
  const latest = rows[0] ?? null;

  const payload = {
    ok: true,
    updated_at: new Date().toISOString(),
    latest,
    aggregates: {
      last_7d: aggregate(rows, 7),
      last_30d: aggregate(rows, 30),
    },
    rows,
  };

  return cachedJson(req, payload, { sMaxAge: 60, swr: 300 }, 'live');
}
