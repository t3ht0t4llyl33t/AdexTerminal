import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';
import { computeDailyMetricsForDate } from '@/lib/cron-subtasks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const BACKFILL_DAYS = 7;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || '';
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const written: string[] = [];
  const failed: Array<{ date: string; error: string }> = [];

  for (let offset = 1; offset <= BACKFILL_DAYS; offset++) {
    const day = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    try {
      const row = await computeDailyMetricsForDate(day);
      const { error } = await supabase
        .from('daily_metrics_snapshot')
        .upsert(row, { onConflict: 'metric_date' });
      if (error) {
        failed.push({ date: row.metric_date, error: error.message });
      } else {
        written.push(row.metric_date);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push({ date: day.toISOString().slice(0, 10), error: msg });
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    written,
    failed,
    window_days: BACKFILL_DAYS,
  });
}
