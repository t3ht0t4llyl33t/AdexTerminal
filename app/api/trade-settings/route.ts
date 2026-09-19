import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireTelegramUser, unauthorized } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

const VALID_TON = ['dedust', 'stonfi'] as const;
const VALID_EVM = ['banana', 'maestro'] as const;

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireTelegramUser(req);
    if (!authUser) return unauthorized();
    const tgUserId = authUser.telegramUserId;

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'get';

    const supabase = getSupabaseAdmin();

    if (action === 'save') {
      const tonService = VALID_TON.includes(body.ton_service) ? body.ton_service : 'dedust';
      const evmService = VALID_EVM.includes(body.evm_service) ? body.evm_service : 'banana';

      if (supabase) {
        const { error } = await supabase
          .from('trade_settings')
          .upsert({
            telegram_user_id: tgUserId,
            ton_service: tonService,
            evm_service: evmService,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'telegram_user_id' });

        if (error) {
          console.error('[trade-settings] upsert error:', error);
        }
      }

      return NextResponse.json({
        ok: true,
        settings: { ton_service: tonService, evm_service: evmService },
      });
    }

    let tonService = 'dedust';
    let evmService = 'banana';

    if (supabase) {
      const { data } = await supabase
        .from('trade_settings')
        .select('ton_service, evm_service')
        .eq('telegram_user_id', tgUserId)
        .maybeSingle();

      if (data) {
        tonService = data.ton_service || 'dedust';
        evmService = data.evm_service || 'banana';
      }
    }

    return NextResponse.json({
      ok: true,
      settings: { ton_service: tonService, evm_service: evmService },
    });
  } catch (err) {
    console.error('[trade-settings] Error:', err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
