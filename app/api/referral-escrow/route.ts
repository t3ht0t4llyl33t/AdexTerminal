import { getSupabase } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, telegram_user_id, wallet_address, amount_usd } = body as {
      action: 'claim' | 'disconnect' | 'get_pending';
      telegram_user_id?: string;
      wallet_address?: string;
      amount_usd?: number;
    };

    if (!telegram_user_id) {
      return Response.json({ error: 'missing telegram_user_id' }, { status: 400 });
    }

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
