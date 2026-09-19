import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronRequest, runSubtask } from '@/lib/cron-runner';
import { runSubscriptionCheck } from '@/lib/cron-subtasks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!authorizeCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runSubtask({
    jobName: 'subscription-check',
    run: runSubscriptionCheck,
  });
  return NextResponse.json({ ok: result.status !== 'error', ...result });
}
