import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronRequest, runSubtask } from '@/lib/cron-runner';
import { runRefreshTonPrice } from '@/lib/cron-subtasks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!authorizeCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runSubtask({
    jobName: 'refresh-ton-price',
    run: runRefreshTonPrice,
  });
  if (result.status === 'error') {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, ...result.summary });
}
