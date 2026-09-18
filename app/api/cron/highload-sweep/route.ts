import { NextRequest, NextResponse } from 'next/server';
import { transferExcessToMaster, getWalletBalance } from '@/lib/ton-payout';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MY_TONKEEPER_ADDRESS = process.env.MY_TONKEEPER_ADDRESS || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!MY_TONKEEPER_ADDRESS) {
      return NextResponse.json({ error: 'MY_TONKEEPER_ADDRESS not configured' }, { status: 503 });
    }

    const balance = await getWalletBalance();
    const result = await transferExcessToMaster(MY_TONKEEPER_ADDRESS);

    return NextResponse.json({
      ok: true,
      balance_ton: balance.toFixed(4),
      transferred_ton: result.transferred.toFixed(4),
      master_address: MY_TONKEEPER_ADDRESS,
      sweep_success: result.success,
      error: result.error || null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
