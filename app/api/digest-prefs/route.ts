import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireTelegramUser, unauthorized } from '@/lib/api-auth';
import { privateNoStore } from '@/lib/edge-cache';

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

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireTelegramUser(req);
    if (!authUser) return unauthorized();
    const tgUserId = authUser.telegramUserId;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'get');

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return privateNoStore({ ok: true, enabled: true });
    }

    if (action === 'save') {
      const enabled = Boolean(body.enabled);
      await supabase.from('user_digest_prefs').upsert(
        { telegram_user_id: tgUserId, enabled, updated_at: new Date().toISOString() },
        { onConflict: 'telegram_user_id' },
      );
      return privateNoStore({ ok: true, enabled });
    }

    const { data } = await supabase
      .from('user_digest_prefs')
      .select('enabled')
      .eq('telegram_user_id', tgUserId)
      .maybeSingle();

    return privateNoStore({ ok: true, enabled: data?.enabled ?? true });
  } catch {
    return privateNoStore({ ok: false, error: 'server_error' }, 500);
  }
}
