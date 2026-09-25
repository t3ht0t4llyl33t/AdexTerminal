import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronRequest, runSubtask } from '@/lib/cron-runner';
import { transferExcessToMaster, getWalletBalance } from '@/lib/ton-payout';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const MY_TONKEEPER_ADDRESS = process.env.MY_TONKEEPER_ADDRESS || '';

export async function GET(req: NextRequest) {
  if (!authorizeCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!MY_TONKEEPER_ADDRESS) {
    return NextResponse.json(
      { ok: false, error: 'MY_TONKEEPER_ADDRESS not configured' },
      { status: 503 },
    );
  }

  const balance = await getWalletBalance();
  const result = await transferExcessToMaster(MY_TONKEEPER_ADDRESS);

  const sweepResult = await runSubtask({
    jobName: 'highload-sweep',
    run: async () => {
      if (!result.success) {
        throw new Error(result.error || 'Sweep failed');
      }
      if (result.transferred === 0) {
        return {
          skipReason: 'balance below reserve',
          summary: {
            balance_ton: balance.toFixed(4),
            transferred_ton: 0,
            master_address: MY_TONKEEPER_ADDRESS,
          },
        };
      }
      return {
        summary: {
          balance_ton: balance.toFixed(4),
          transferred_ton: result.transferred.toFixed(4),
          master_address: MY_TONKEEPER_ADDRESS,
          sweep_success: true,
        },
      };
    },
  });

  return NextResponse.json({
    ok: sweepResult.status === 'ok' || sweepResult.status === 'skipped',
    balance_ton: balance.toFixed(4),
    transferred_ton: result.transferred.toFixed(4),
    master_address: MY_TONKEEPER_ADDRESS,
    sweep_success: result.success,
    journal_status: sweepResult.status,
    error: sweepResult.error || result.error || null,
  });
}
