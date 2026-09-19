import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';
import { verifyInitData, type VerifiedTelegramUser } from '@/lib/telegram-auth';

export const INIT_DATA_HEADER = 'x-telegram-init-data';

async function recordSession(user: VerifiedTelegramUser): Promise<void> {
  try {
    const supabase = getSupabase();
    const nowIso = new Date().toISOString();
    const { data: existing } = await supabase
      .from('session_audit_log')
      .select('telegram_user_id')
      .eq('telegram_user_id', user.telegramUserId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('session_audit_log')
        .update({
          last_seen_at: nowIso,
          username: user.username,
          language_code: user.languageCode,
        })
        .eq('telegram_user_id', user.telegramUserId);
    } else {
      await supabase.from('session_audit_log').insert({
        telegram_user_id: user.telegramUserId,
        username: user.username,
        language_code: user.languageCode,
        first_seen_at: nowIso,
        last_seen_at: nowIso,
      });
    }
  } catch {
    // best-effort; do not fail the request
  }
}

export async function requireTelegramUser(
  req: NextRequest,
  opts: { record?: boolean } = {},
): Promise<VerifiedTelegramUser | null> {
  const initData = req.headers.get(INIT_DATA_HEADER) || '';
  return verifyInitDataString(initData, opts);
}

export async function verifyInitDataString(
  initData: string,
  opts: { record?: boolean } = {},
): Promise<VerifiedTelegramUser | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!initData || !botToken) return null;
  const user = verifyInitData(initData, botToken);
  if (!user) return null;
  if (opts.record !== false) {
    recordSession(user).catch(() => {});
  }
  return user;
}

export function unauthorized(reason: string = 'unauthorized'): NextResponse {
  return NextResponse.json(
    { ok: false, error: reason },
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  );
}
