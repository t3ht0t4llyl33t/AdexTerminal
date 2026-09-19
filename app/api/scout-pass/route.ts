import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireTelegramUser, unauthorized } from '@/lib/api-auth';

const SCOUT_KEY = 'ton_grant_scout';
const ADMIN_KEY = 'adex_grant_admin';
const SCOUT_DEADLINE = new Date('2026-11-30T23:59:59Z');
const SCOUT_MAX_USERS = 10;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireTelegramUser(req);
    if (!authUser) return unauthorized();
    const telegram_user_id = authUser.telegramUserId;

    const body = await req.json().catch(() => ({}));
    const { start_param } = body as { start_param?: string };

    if (start_param !== SCOUT_KEY && start_param !== ADMIN_KEY) {
      return Response.json({ is_premium: false, is_scout: false }, { status: 200 });
    }

    const isAdminPass = start_param === ADMIN_KEY;

    if (!isAdminPass && new Date() > SCOUT_DEADLINE) {
      return Response.json({ is_premium: false, is_scout: false, reason: 'expired' }, { status: 200 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return Response.json({ is_premium: false, is_scout: false, reason: 'db_unavailable' }, { status: 200 });
    }

    if (!isAdminPass) {
      const { count } = await supabase
        .from('scout_registrations')
        .select('id', { count: 'exact', head: true });

      if (count !== null && count >= SCOUT_MAX_USERS) {
        const { data: existing } = await supabase
          .from('scout_registrations')
          .select('telegram_user_id')
          .eq('telegram_user_id', telegram_user_id)
          .maybeSingle();

        if (!existing) {
          return Response.json({ is_premium: false, is_scout: false, reason: 'cap_reached' }, { status: 200 });
        }
      }
    }

    await supabase
      .from('scout_registrations')
      .upsert(
        { telegram_user_id, is_scout: true, is_premium: true },
        { onConflict: 'telegram_user_id' },
      );

    return Response.json({ is_premium: true, is_scout: true }, { status: 200 });
  } catch {
    return Response.json({ is_premium: false, is_scout: false }, { status: 200 });
  }
}
