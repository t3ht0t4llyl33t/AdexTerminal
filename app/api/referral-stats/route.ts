import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';
import { requireTelegramUser, unauthorized } from '@/lib/api-auth';
import { privateNoStore } from '@/lib/edge-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BOT_LINK = 'https://t.me/aDEX_Live_Support_bot';
const MINIAPP_LINK = 'https://t.me/aDEX_Live_Support_bot/miniapp';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'aDEX-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function getOrCreateCode(supabase: ReturnType<typeof getSupabase>, tgUserId: string): Promise<string> {
  if (!supabase) return generateCode();

  const { data: existing } = await supabase
    .from('referral_codes')
    .select('referral_code')
    .eq('telegram_user_id', tgUserId)
    .maybeSingle();

  if (existing?.referral_code) return existing.referral_code;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error } = await supabase
      .from('referral_codes')
      .insert({ telegram_user_id: tgUserId, referral_code: code });
    if (!error) return code;
  }

  return generateCode();
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireTelegramUser(req);
    if (!authUser) return unauthorized();
    const tgUserId = authUser.telegramUserId;
    const body = await req.json().catch(() => ({}));
    const lang = body.lang === 'RU' ? 'RU' : 'EN';

    const supabase = getSupabase();
    const referralCode = await getOrCreateCode(supabase, String(tgUserId));
    const referralLink = `${MINIAPP_LINK}?startapp=${referralCode}`;
    const referralLinkFallback = `${BOT_LINK}?start=${referralCode}`;

    let totalReferrals = 0;
    let totalEarnings = 0;
    let pendingPayouts = 0;
    let totalStars = 0;

    if (supabase) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { count } = await supabase
        .from('payment_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_tg_id', String(tgUserId))
        .eq('status', 'confirmed')
        .gte('created_at', thirtyDaysAgo);
      totalReferrals = count ?? 0;

      const { data: payouts } = await supabase
        .from('referral_payouts')
        .select('commission_usd, commission_stars, payment_method, status, created_at')
        .eq('referrer_tg_id', String(tgUserId))
        .gte('created_at', thirtyDaysAgo);

      if (payouts && payouts.length > 0) {
        totalEarnings = payouts.reduce(
          (sum, p) => sum + (Number(p.commission_usd) || 0),
          0,
        );
        pendingPayouts = payouts
          .filter((p) => p.status === 'pending' || p.status === 'failed')
          .reduce((sum, p) => sum + (Number(p.commission_usd) || 0), 0);
        totalStars = payouts
          .filter((p) => p.payment_method === 'stars')
          .reduce((sum, p) => sum + (Number(p.commission_stars) || 0), 0);
      }

      const { data: escrow } = await supabase
        .from('partner_pending_balances')
        .select('amount_usd, status')
        .eq('telegram_user_id', String(tgUserId))
        .maybeSingle();

      if (escrow && totalEarnings === 0) {
        const amount = Number(escrow.amount_usd) || 0;
        totalEarnings = amount;
        pendingPayouts = escrow.status === 'pending' ? amount : 0;
      }
    }

    let isPro = false;

    if (supabase) {
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('tier, pro_expiration_date')
        .eq('telegram_user_id', String(tgUserId))
        .maybeSingle();

      if (sub?.tier === 'pro') {
        const expiration = sub.pro_expiration_date ? new Date(sub.pro_expiration_date) : null;
        if (!expiration || expiration > new Date()) {
          isPro = true;
        }
      }

      if (!isPro) {
        const { data: scout } = await supabase
          .from('scout_registrations')
          .select('is_premium')
          .eq('telegram_user_id', String(tgUserId))
          .maybeSingle();

        if (scout?.is_premium) {
          isPro = true;
        }
      }
    }

    return privateNoStore({
      ok: true,
      stats: {
        totalReferrals,
        activeReferrals: totalReferrals,
        totalEarnings: Number(totalEarnings.toFixed(2)),
        pendingPayouts: Number(pendingPayouts.toFixed(2)),
        totalStars,
        referralCode,
        referralLink,
        referralLinkFallback,
        tier: totalReferrals >= 50 ? 'Platinum Partner' : totalReferrals >= 20 ? 'Gold Partner' : totalReferrals >= 5 ? 'Silver Partner' : 'New Partner',
        commissionRate: 20,
        isPro,
      },
    });
  } catch (err) {
    console.error('[referral-stats] Error:', err);
    return privateNoStore({ ok: false, error: 'server_error' }, 500);
  }
}
