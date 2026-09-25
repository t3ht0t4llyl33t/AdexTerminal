import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireTelegramUser, unauthorized } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const PREMIUM_PRICE_USD = 9.9;
const PREMIUM_PRICE_STARS = 555;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

interface TgApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

async function getReferrer(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tgUserId: string,
): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('referral_claims')
    .select('referrer_tg_id')
    .eq('referred_tg_id', tgUserId)
    .maybeSingle();
  return (data as { referrer_tg_id?: string } | null)?.referrer_tg_id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: 'Telegram Stars is not configured' }, { status: 503 });
    }

    const authUser = await requireTelegramUser(req);
    if (!authUser) return unauthorized();
    const telegram_user_id = authUser.telegramUserId;

    const body = await req.json().catch(() => ({}));
    const { lang } = body as { lang?: string };

    const title =
      lang === 'RU'
        ? 'aDEX Terminal Premium — 1 месяц'
        : 'aDEX Terminal Premium — 1 month';
    const description =
      lang === 'RU'
        ? 'Фильтры инсайдерских кластеров, отслеживание китов BSC/Base, безлимитное сканирование.'
        : 'Insider cluster filters, BSC/Base whale tracking, unlimited security scans.';

    const payload = JSON.stringify({
      telegram_user_id,
      tier: 'pro',
      nonce: Date.now().toString(36),
    });

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          payload,
          provider_token: '',
          currency: 'XTR',
          prices: [{ label: title, amount: PREMIUM_PRICE_STARS }],
        }),
      },
    );

    const data = (await tgRes.json()) as TgApiResponse<string>;
    if (!data.ok || !data.result) {
      return NextResponse.json(
        { error: data.description || 'Failed to create Stars invoice' },
        { status: 502 },
      );
    }

    const invoiceUrl = data.result;
    const invoiceId = invoiceUrl.split('/').pop() || invoiceUrl;

    const supabase = getSupabaseAdmin();
    if (supabase) {
      const referrerTgId = await getReferrer(supabase, telegram_user_id);
      try {
        await supabase.from('payment_transactions').insert({
          telegram_user_id,
          payment_method: 'stars',
          amount_usd: PREMIUM_PRICE_USD,
          invoice_id: invoiceId,
          status: 'pending',
          referrer_tg_id: referrerTgId,
          commission_paid: false,
        });
      } catch {
        // best-effort; the bot's successful_payment handler is the source of truth
      }
    }

    return NextResponse.json({
      ok: true,
      url: invoiceUrl,
      invoice_id: invoiceId,
      amount_stars: PREMIUM_PRICE_STARS,
      amount_usd: PREMIUM_PRICE_USD,
    });
  } catch (err) {
    console.error('[stars] error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
