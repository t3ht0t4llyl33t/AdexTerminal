import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { recordLightningBoostGrantIfEligible } from '@/lib/lightning-boost';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CRYPTO_PAY_API_TOKEN = process.env.CRYPTO_PAY_API_TOKEN || '';
const CRYPTO_PAY_WEBHOOK_SECRET = process.env.CRYPTO_PAY_WEBHOOK_SECRET || '';
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PREMIUM_PRICE_USD = 9.9;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

interface CryptoPayWebhook {
  update_id: number;
  message_id: number;
  bid: string;
  amount: string;
  fiat_amount: string;
  user_crypto_amount: string;
  crypto_currency: string;
  fiat_currency: string;
  status: string;
  invoice_id: string;
  description: string;
  payload: string;
  paid_at: string;
  bot_id: number;
  user_id: number;
}

async function getReferrer(supabase: ReturnType<typeof getSupabase>, tgUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('referral_claims')
    .select('referrer_tg_id')
    .eq('referred_tg_id', tgUserId)
    .maybeSingle();
  return data?.referrer_tg_id ?? null;
}

async function cryptoPayTransfer(userId: string, amount: string, currency: string): Promise<{ ok: boolean; transfer_id?: string; error?: string }> {
  if (!CRYPTO_PAY_API_TOKEN) return { ok: false, error: 'no token' };

  try {
    const res = await fetch('https://pay.crypt.bot/api/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Crypto-Pay-API-Token': CRYPTO_PAY_API_TOKEN,
      },
      body: JSON.stringify({
        user_id: parseInt(userId, 10),
        asset: currency,
        amount,
        spend_id: 0,
        comment: 'aDEX referral commission (20%)',
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[crypto-pay-webhook] Transfer API error:', errBody);
      return { ok: false, error: `API ${res.status}` };
    }

    const data = await res.json();
    return { ok: !!data.ok, transfer_id: data.result?.transfer_id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!CRYPTO_PAY_API_TOKEN) {
      return NextResponse.json({ error: 'Crypto Pay not configured' }, { status: 503 });
    }

    const body = await req.text();
    const signature = req.headers.get('crypto-pay-api-signature') || '';

    if (CRYPTO_PAY_WEBHOOK_SECRET) {
      const expected = crypto
        .createHmac('sha256', CRYPTO_PAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      if (signature !== expected) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
      }
    }

    const event = JSON.parse(body) as { update_id: number; update_type: string; payload: CryptoPayWebhook };

    if (event.update_type !== 'invoice_paid') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const payload = event.payload;
    if (payload.status !== 'paid') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('payment_transactions')
      .select('id, commission_paid')
      .eq('invoice_id', payload.invoice_id)
      .maybeSingle();

    if (existing?.commission_paid) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    let payloadData: { telegram_user_id?: string; tier?: string } = {};
    try {
      payloadData = JSON.parse(payload.payload);
    } catch {
      // payload not JSON
    }

    const tgUserId = payloadData.telegram_user_id || String(payload.user_id);
    const referrerTgId = await getReferrer(supabase, tgUserId);
    const commissionUsd = PREMIUM_PRICE_USD * 0.20;

    if (!existing) {
      await supabase.from('payment_transactions').insert({
        telegram_user_id: tgUserId,
        payment_method: 'crypto_pay',
        amount_usd: PREMIUM_PRICE_USD,
        invoice_id: payload.invoice_id,
        status: 'confirmed',
        referrer_tg_id: referrerTgId,
        commission_paid: false,
      });
    }

    await supabase.from('user_subscriptions').upsert({
      telegram_user_id: tgUserId,
      tier: 'pro',
      pro_expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'telegram_user_id' });

    await recordLightningBoostGrantIfEligible(supabase, tgUserId, PREMIUM_PRICE_USD);

    if (referrerTgId) {
      const transferResult = await cryptoPayTransfer(referrerTgId, commissionUsd.toFixed(2), 'USDT');

      await supabase.from('referral_payouts').insert({
        payer_tg_id: tgUserId,
        referrer_tg_id: referrerTgId,
        payment_method: 'crypto_pay',
        payment_amount_usd: PREMIUM_PRICE_USD,
        commission_usd: commissionUsd,
        status: transferResult.ok ? 'sent' : 'failed',
        crypto_pay_transfer_id: transferResult.transfer_id ?? null,
      });

      if (transferResult.ok) {
        await supabase.from('payment_transactions')
          .update({ commission_paid: true, updated_at: new Date().toISOString() })
          .eq('invoice_id', payload.invoice_id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[crypto-pay-webhook] Error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
