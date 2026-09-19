import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronRequest, lastSuccessAt, runSubtask } from '@/lib/cron-runner';
import {
  runAlertCheck,
  runDailyDigest,
  runLightningBoost,
  runRadarRefresh,
  runRefreshTonPrice,
  runSubscriptionCheck,
} from '@/lib/cron-subtasks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const RADAR_REFRESH_INTERVAL_MS = 4 * 60 * 1000;
const REFRESH_TON_PRICE_INTERVAL_MS = 12 * 60 * 60 * 1000;
const SUBSCRIPTION_CHECK_HOUR_UTC = 9;
const DIGEST_HOUR_UTC = 12;
const LIGHTNING_BOOST_INTERVAL_MS = 15 * 60 * 1000;

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

  const tickStartedIso = new Date().toISOString();
  const now = new Date();

  const radarLast = await lastSuccessAt('radar-refresh');
  const radarDue =
    !radarLast || now.getTime() - radarLast.getTime() >= RADAR_REFRESH_INTERVAL_MS;
  const radarResult = radarDue
    ? await runSubtask({ jobName: 'radar-refresh', run: runRadarRefresh })
    : { status: 'skipped' as const };

  const alertResult = await runSubtask({
    jobName: 'alert-check',
    run: runAlertCheck,
  });

  const priceLast = await lastSuccessAt('refresh-ton-price');
  const priceDue =
    !priceLast || now.getTime() - priceLast.getTime() >= REFRESH_TON_PRICE_INTERVAL_MS;
  const priceResult = priceDue
    ? await runSubtask({ jobName: 'refresh-ton-price', run: runRefreshTonPrice })
    : { status: 'skipped' as const };

  const subLast = await lastSuccessAt('subscription-check');
  const subShouldFireHour = now.getUTCHours() >= SUBSCRIPTION_CHECK_HOUR_UTC;
  const subAlreadyRanToday = subLast ? sameUtcDay(subLast, now) : false;
  const subDue = subShouldFireHour && !subAlreadyRanToday;
  const subResult = subDue
    ? await runSubtask({ jobName: 'subscription-check', run: runSubscriptionCheck })
    : { status: 'skipped' as const };

  const digestLast = await lastSuccessAt('daily-digest');
  const digestShouldFireHour = now.getUTCHours() >= DIGEST_HOUR_UTC;
  const digestAlreadyRanToday = digestLast ? sameUtcDay(digestLast, now) : false;
  const digestDue = digestShouldFireHour && !digestAlreadyRanToday;
  const digestResult = digestDue
    ? await runSubtask({ jobName: 'daily-digest', run: runDailyDigest })
    : { status: 'skipped' as const };

  const boostLast = await lastSuccessAt('lightning-boost');
  const boostDue =
    !boostLast || now.getTime() - boostLast.getTime() >= LIGHTNING_BOOST_INTERVAL_MS;
  const boostResult = boostDue
    ? await runSubtask({ jobName: 'lightning-boost', run: runLightningBoost })
    : { status: 'skipped' as const };

  await runSubtask({
    jobName: 'tick',
    run: async () => ({
      summary: {
        started_at: tickStartedIso,
        radar_refresh: radarResult.status,
        alert_check: alertResult.status,
        refresh_ton_price: priceResult.status,
        subscription_check: subResult.status,
        daily_digest: digestResult.status,
        lightning_boost: boostResult.status,
      },
    }),
  });

  return NextResponse.json({
    ok: true,
    started_at: tickStartedIso,
    subtasks: {
      'radar-refresh': radarResult,
      'alert-check': alertResult,
      'refresh-ton-price': priceResult,
      'subscription-check': subResult,
      'daily-digest': digestResult,
      'lightning-boost': boostResult,
    },
  });
}
