import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CRYPTO_PAY_API_TOKEN = process.env.CRYPTO_PAY_API_TOKEN || '';
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const PREMIUM_PRICE_USD = 9.9;
const CRYPTO_PAY_BASE = 'https://pay.crypt.bot/api';

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

interface CryptoPayInvoiceResponse {
  ok: boolean;
  result?: {
    invoice_id: string;
    status: string;
    pay_url: string;
  };
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!CRYPTO_PAY_API_TOKEN) {
      return NextResponse.json(
        { error: 'Crypto Pay is not configured' },
        { status: 503 },
      );
    }

    const body = await req.json();
    const { telegram_user_id, lang } = body as {
      telegram_user_id?: string;
      lang?: string;
    };

    if (!telegram_user_id) {
      return NextResponse.json(
        { error: 'missing telegram_user_id' },
        { status: 400 },
      );
    }

    const description =
      lang === 'RU'
        ? 'aDEX Terminal Premium — 1 месяц: фильтры инсайдерских кластеров, отслеживание китов BSC/Base, безлимитное сканирование.'
        : 'aDEX Terminal Premium — 1 month: insider cluster filters, BSC/Base whale tracking, unlimited security scans.';

    const res = await fetch(`${CRYPTO_PAY_BASE}/createInvoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Crypto-Pay-API-Token': CRYPTO_PAY_API_TOKEN,
      },
      body: JSON.stringify({
        amount: PREMIUM_PRICE_USD,
        currency_type: 'fiat',
        fiat: 'USD',
        description,
        hidden_message: lang === 'RU'
          ? 'После оплаты ваш Premium статус активируется автоматически.'
          : 'After payment your Premium status activates automatically.',
        allowed_assets: ['TON'],
        payload: JSON.stringify({ telegram_user_id, tier: 'pro' }),
        expires_in: 3600,
      }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 502 },
      );
    }

    const data = (await res.json()) as CryptoPayInvoiceResponse;

    if (!data.ok || !data.result?.pay_url) {
      return NextResponse.json(
        { error: data.error || 'Invoice creation failed' },
        { status: 502 },
      );
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('user_subscriptions').upsert({
          telegram_user_id,
          tier: 'pending_payment',
          language: lang || 'EN',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'telegram_user_id' });
      } catch {
        // best-effort — invoice still valid
      }
    }

    return NextResponse.json({
      invoice_id: data.result.invoice_id,
      pay_url: data.result.pay_url,
      status: data.result.status,
      amount_usd: PREMIUM_PRICE_USD,
    });
  } catch {
    return NextResponse.json(
      { error: 'Checkout failed' },
      { status: 500 },
    );
  }
}
