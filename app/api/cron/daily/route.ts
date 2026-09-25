import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronRequest, lastSuccessAt, runSubtask } from '@/lib/cron-runner';
import {
  runDailyDigest,
  runDailyMetricsSnapshot,
  runDataRetentionCleanup,
  runRefreshTonPrice,
  runSubscriptionCheck,
} from '@/lib/cron-subtasks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const REFRESH_TON_PRICE_INTERVAL_MS = 12 * 60 * 60 * 1000;

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export async function GET(req: NextRequest) {
  if (!authorizeCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedIso = new Date().toISOString();
  const now = new Date();

  const [priceLast, subLast, digestLast, metricsLast, cleanupLast] = await Promise.all([
    lastSuccessAt('refresh-ton-price'),
    lastSuccessAt('subscription-check'),
    lastSuccessAt('daily-digest'),
    lastSuccessAt('daily-metrics-snapshot'),
    lastSuccessAt('data-retention-cleanup'),
  ]);

  const priceDue =
    !priceLast || now.getTime() - priceLast.getTime() >= REFRESH_TON_PRICE_INTERVAL_MS;
  const subDue = !subLast || !sameUtcDay(subLast, now);
  const digestDue = !digestLast || !sameUtcDay(digestLast, now);
  const metricsDue = !metricsLast || !sameUtcDay(metricsLast, now);
  const cleanupDue = !cleanupLast || !sameUtcDay(cleanupLast, now);

  const priceResult = priceDue
    ? await runSubtask({ jobName: 'refresh-ton-price', run: runRefreshTonPrice })
    : { status: 'skipped' as const };

  const metricsResult = metricsDue
    ? await runSubtask({ jobName: 'daily-metrics-snapshot', run: runDailyMetricsSnapshot })
    : { status: 'skipped' as const };

  const subResult = subDue
    ? await runSubtask({ jobName: 'subscription-check', run: runSubscriptionCheck })
    : { status: 'skipped' as const };

  const digestResult = digestDue
    ? await runSubtask({ jobName: 'daily-digest', run: runDailyDigest })
    : { status: 'skipped' as const };

  const cleanupResult = cleanupDue
    ? await runSubtask({ jobName: 'data-retention-cleanup', run: runDataRetentionCleanup })
    : { status: 'skipped' as const };

  await runSubtask({
    jobName: 'daily',
    run: async () => ({
      summary: {
        started_at: startedIso,
        refresh_ton_price: priceResult.status,
        daily_metrics_snapshot: metricsResult.status,
        subscription_check: subResult.status,
        daily_digest: digestResult.status,
        data_retention_cleanup: cleanupResult.status,
      },
    }),
  });

  return NextResponse.json({
    ok: true,
    started_at: startedIso,
    subtasks: {
      'refresh-ton-price': priceResult,
      'daily-metrics-snapshot': metricsResult,
      'subscription-check': subResult,
      'daily-digest': digestResult,
      'data-retention-cleanup': cleanupResult,
    },
  });
}
