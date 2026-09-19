import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';
import { requireTelegramUser, unauthorized } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireTelegramUser(req);
    if (!authUser) return unauthorized();
    const telegram_user_id = authUser.telegramUserId;
    const body = await req.json().catch(() => ({}));
    const { action, wallet_address } = body as {
      action: 'claim' | 'disconnect' | 'get_pending';
      wallet_address?: string;
    };
    const supabase = getSupabase();

    if (action === 'get_pending') {
      const { data } = await supabase
        .from('partner_pending_balances')
        .select('amount_usd, wallet_address, status')
        .eq('telegram_user_id', telegram_user_id)
        .maybeSingle();

      return Response.json({
        pending_amount: data?.amount_usd ?? 0,
        wallet_address: data?.wallet_address ?? null,
        status: data?.status ?? 'none',
      });
    }

    if (action === 'claim') {
      if (!wallet_address) {
        return Response.json({ error: 'missing wallet_address' }, { status: 400 });
      }

      const { data } = await supabase
        .from('partner_pending_balances')
        .select('amount_usd, status')
        .eq('telegram_user_id', telegram_user_id)
        .maybeSingle();

      if (!data || data.status === 'claimed') {
        return Response.json({ claimed: 0, message: 'no_pending' });
      }

      await supabase
        .from('partner_pending_balances')
        .update({
          wallet_address,
          status: 'claimed',
          updated_at: new Date().toISOString(),
        })
        .eq('telegram_user_id', telegram_user_id);

      return Response.json({
        claimed: data.amount_usd,
        wallet_address,
      });
    }

    if (action === 'disconnect') {
      await supabase
        .from('partner_pending_balances')
        .update({
          wallet_address: null,
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('telegram_user_id', telegram_user_id);

      return Response.json({ disconnected: true });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch {
    return Response.json({ error: 'server_error' }, { status: 500 });
  }
}
