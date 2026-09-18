import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getHighloadAddress } from '@/lib/ton-payout';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PREMIUM_PRICE_USD = 9.9;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function getReferrer(supabase: ReturnType<typeof getSupabase>, tgUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('referral_claims')
    .select('referrer_tg_id')
    .eq('referred_tg_id', tgUserId)
    .maybeSingle();
  return data?.referrer_tg_id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegram_user_id, sender_address, tx_hash, amount_ton } = body as {
      telegram_user_id?: string;
      sender_address?: string;
      tx_hash?: string;
      amount_ton?: number;
    };

    if (!telegram_user_id || !tx_hash || !amount_ton) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('payment_transactions')
      .select('id')
      .eq('tx_hash', tx_hash)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true, message: 'Transaction already processed' });
    }

    const referrerTgId = await getReferrer(supabase, telegram_user_id);
    const commissionUsd = PREMIUM_PRICE_USD * 0.20;

    await supabase.from('payment_transactions').insert({
      telegram_user_id,
      payment_method: 'ton_connect',
      amount_usd: PREMIUM_PRICE_USD,
      amount_ton,
      tx_hash,
      status: 'confirmed',
      referrer_tg_id: referrerTgId,
      commission_paid: false,
    });

    await supabase.from('user_subscriptions').upsert({
      telegram_user_id,
      tier: 'pro',
      pro_expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'telegram_user_id' });

    if (referrerTgId) {
      try {
        const tonRate = 7.0;
        const commissionTon = commissionUsd / tonRate;

        await supabase.from('referral_payouts').insert({
          payer_tg_id: telegram_user_id,
          referrer_tg_id: referrerTgId,
          payment_method: 'ton_connect',
          payment_amount_usd: PREMIUM_PRICE_USD,
          commission_usd: commissionUsd,
          commission_ton: commissionTon,
          status: 'pending',
        });

        const { getReferrerWallet } = await import('@/lib/referral-helpers');
        const referrerWallet = await getReferrerWallet(supabase, referrerTgId);

        if (referrerWallet) {
          const { sendBatchPayouts } = await import('@/lib/ton-payout');
          const result = await sendBatchPayouts([{
            address: referrerWallet,
            amountTon: commissionTon,
            comment: 'aDEX referral commission',
          }]);

          await supabase.from('referral_payouts')
            .update({
              status: result.success ? 'sent' : 'failed',
              tx_hash: result.success ? tx_hash : null,
              updated_at: new Date().toISOString(),
            })
            .eq('payer_tg_id', telegram_user_id)
            .eq('referrer_tg_id', referrerTgId)
            .eq('payment_method', 'ton_connect');

          if (result.success) {
            await supabase.from('payment_transactions')
              .update({ commission_paid: true, updated_at: new Date().toISOString() })
              .eq('tx_hash', tx_hash);
          }
        }
      } catch (err) {
        console.error('[ton-connect-payment] Referral payout failed:', err);
      }
    }

    return NextResponse.json({ ok: true, premium_activated: true });
  } catch (err) {
    console.error('[ton-connect-payment] Error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const highloadAddress = await getHighloadAddress();
    return NextResponse.json({
      ok: true,
      highload_address: highloadAddress,
      premium_price_usd: PREMIUM_PRICE_USD,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      error: 'HIGHLOAD_MNEMONIC not configured',
      highload_address: null,
    });
  }
}
