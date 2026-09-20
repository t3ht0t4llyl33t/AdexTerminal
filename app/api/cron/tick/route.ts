import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronRequest, lastSuccessAt, runSubtask } from '@/lib/cron-runner';
import {
  runAlertCheck,
  runLightningBoost,
  runRadarRefresh,
} from '@/lib/cron-subtasks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const RADAR_REFRESH_INTERVAL_MS = 4 * 60 * 1000;
const LIGHTNING_BOOST_INTERVAL_MS = 15 * 60 * 1000;

export async function GET(req: NextRequest) {
  if (!authorizeCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tickStartedIso = new Date().toISOString();
  const now = new Date();

  const [radarLast, boostLast] = await Promise.all([
    lastSuccessAt('radar-refresh'),
    lastSuccessAt('lightning-boost'),
  ]);

  const radarDue =
    !radarLast || now.getTime() - radarLast.getTime() >= RADAR_REFRESH_INTERVAL_MS;
  const boostDue =
    !boostLast || now.getTime() - boostLast.getTime() >= LIGHTNING_BOOST_INTERVAL_MS;

  const [radarResult, alertResult, boostResult] = await Promise.all([
    radarDue
      ? runSubtask({ jobName: 'radar-refresh', run: runRadarRefresh })
      : Promise.resolve({ status: 'skipped' as const }),
    runSubtask({ jobName: 'alert-check', run: runAlertCheck }),
    boostDue
      ? runSubtask({ jobName: 'lightning-boost', run: runLightningBoost })
      : Promise.resolve({ status: 'skipped' as const }),
  ]);

  await runSubtask({
    jobName: 'tick',
    run: async () => ({
      summary: {
        started_at: tickStartedIso,
        radar_refresh: radarResult.status,
        alert_check: alertResult.status,
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
      'lightning-boost': boostResult,
    },
  });
}
