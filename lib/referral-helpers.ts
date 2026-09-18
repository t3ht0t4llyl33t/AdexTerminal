import { SupabaseClient } from '@supabase/supabase-js';

export async function getReferrerWallet(
  supabase: SupabaseClient,
  referrerTgId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('partner_pending_balances')
    .select('wallet_address')
    .eq('telegram_user_id', referrerTgId)
    .maybeSingle();
  return data?.wallet_address ?? null;
}
