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

const DEFAULTS = {
  radar_min_liquidity: 0,
  radar_min_spike: 50,
  whale_min_volume: 3000,
  whale_buys_only: false,
};

function clamp(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return Math.min(Math.max(v, min), max);
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireTelegramUser(req);
    if (!authUser) return unauthorized();
    const tgUserId = authUser.telegramUserId;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'get';

    const supabase = getSupabaseAdmin();

    if (action === 'save') {
      const radarMinLiquidity = clamp(Number(body.radar_min_liquidity ?? DEFAULTS.radar_min_liquidity), 0, 1000000);
      const radarMinSpike = clamp(Number(body.radar_min_spike ?? DEFAULTS.radar_min_spike), 50, 500);
      const whaleMinVolume = clamp(Number(body.whale_min_volume ?? DEFAULTS.whale_min_volume), 3000, 1000000);
      const whaleBuysOnly = Boolean(body.whale_buys_only);

      if (supabase) {
        const { error } = await supabase
          .from('user_pro_settings')
          .upsert({
            telegram_user_id: tgUserId,
            radar_min_liquidity: radarMinLiquidity,
            radar_min_spike: radarMinSpike,
            whale_min_volume: whaleMinVolume,
            whale_buys_only: whaleBuysOnly,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'telegram_user_id' });

        if (error) {
          console.error('[pro-settings] upsert error:', error);
        }
      }

      return NextResponse.json({
        ok: true,
        settings: {
          radar_min_liquidity: radarMinLiquidity,
          radar_min_spike: radarMinSpike,
          whale_min_volume: whaleMinVolume,
          whale_buys_only: whaleBuysOnly,
        },
      });
    }

    if (supabase) {
      const { data } = await supabase
        .from('user_pro_settings')
        .select('radar_min_liquidity, radar_min_spike, whale_min_volume, whale_buys_only')
        .eq('telegram_user_id', tgUserId)
        .maybeSingle();

      if (data) {
        return NextResponse.json({ ok: true, settings: data });
      }
    }

    return NextResponse.json({ ok: true, settings: DEFAULTS });
  } catch (err) {
    console.error('[pro-settings] Error:', err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
