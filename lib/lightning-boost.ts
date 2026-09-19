import type { SupabaseClient } from '@supabase/supabase-js';

const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function recordLightningBoostGrantIfEligible(
  supabase: SupabaseClient,
  inviteeTgId: string,
  paymentAmountUsd: number,
): Promise<void> {
  try {
    const { data: claim } = await supabase
      .from('referral_claims')
      .select('referrer_tg_id, claimed_at')
      .eq('referred_tg_id', inviteeTgId)
      .maybeSingle();

    if (!claim?.referrer_tg_id || !claim.claimed_at) return;

    const signupAt = new Date(claim.claimed_at).getTime();
    const now = Date.now();
    if (now - signupAt > WINDOW_MS) return;

    const { data: existing } = await supabase
      .from('referral_bonus_grants')
      .select('id')
      .eq('inviter_telegram_id', claim.referrer_tg_id)
      .eq('invitee_telegram_id', inviteeTgId)
      .maybeSingle();

    if (existing) return;

    await supabase.from('referral_bonus_grants').insert({
      inviter_telegram_id: claim.referrer_tg_id,
      invitee_telegram_id: inviteeTgId,
      payment_amount_ton: paymentAmountUsd,
      invitee_signup_at: claim.claimed_at,
      invitee_purchase_at: new Date(now).toISOString(),
      status: 'pending',
    });
  } catch (err) {
    console.error('[lightning-boost] insert error', err);
  }
}
