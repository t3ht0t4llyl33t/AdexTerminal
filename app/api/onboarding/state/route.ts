import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';
import { requireTelegramUser, unauthorized } from '@/lib/api-auth';
import { privateNoStore } from '@/lib/edge-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface OnboardingRow {
  telegram_user_id: string;
  step_completed: number;
  first_seen_at: string;
  completed_at: string | null;
  skipped_at: string | null;
  hints_dismissed: Record<string, boolean>;
  updated_at: string;
}

function shape(row: OnboardingRow | null) {
  if (!row) {
    return {
      is_new: true,
      step_completed: 0,
      completed_at: null,
      skipped_at: null,
      hints_dismissed: {} as Record<string, boolean>,
    };
  }
  return {
    is_new: false,
    step_completed: row.step_completed,
    completed_at: row.completed_at,
    skipped_at: row.skipped_at,
    hints_dismissed: row.hints_dismissed || {},
  };
}

export async function GET(req: NextRequest) {
  const user = await requireTelegramUser(req);
  if (!user) return unauthorized();

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_onboarding_state')
    .select('telegram_user_id, step_completed, first_seen_at, completed_at, skipped_at, hints_dismissed, updated_at')
    .eq('telegram_user_id', user.telegramUserId)
    .maybeSingle();

  if (error) {
    return privateNoStore({ ok: false, error: 'db_error' }, 500);
  }
  return privateNoStore({ ok: true, state: shape(data as OnboardingRow | null) });
}

export async function POST(req: NextRequest) {
  const user = await requireTelegramUser(req);
  if (!user) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as {
    action?: 'advance' | 'skip' | 'complete' | 'dismiss_hint' | 'start';
    step?: number;
    hint_key?: string;
  };

  const supabase = getSupabase();
  const nowIso = new Date().toISOString();
  const tgId = user.telegramUserId;

  const { data: existing } = await supabase
    .from('user_onboarding_state')
    .select('telegram_user_id, step_completed, first_seen_at, completed_at, skipped_at, hints_dismissed, updated_at')
    .eq('telegram_user_id', tgId)
    .maybeSingle();

  const current = (existing as OnboardingRow | null) ?? {
    telegram_user_id: tgId,
    step_completed: 0,
    first_seen_at: nowIso,
    completed_at: null,
    skipped_at: null,
    hints_dismissed: {},
    updated_at: nowIso,
  };

  const next: OnboardingRow = { ...current };

  switch (body.action) {
    case 'start':
      // idempotent: mark first_seen; do not reset step_completed if user is returning
      if (!existing) next.first_seen_at = nowIso;
      break;
    case 'advance': {
      const target = typeof body.step === 'number' ? body.step : (current.step_completed + 1);
      next.step_completed = Math.max(current.step_completed, Math.min(3, target));
      break;
    }
    case 'skip':
      next.skipped_at = nowIso;
      next.step_completed = Math.max(current.step_completed, 3);
      break;
    case 'complete':
      next.step_completed = 3;
      next.completed_at = nowIso;
      break;
    case 'dismiss_hint':
      if (body.hint_key && typeof body.hint_key === 'string') {
        next.hints_dismissed = { ...(current.hints_dismissed || {}), [body.hint_key]: true };
      }
      break;
    default:
      return privateNoStore({ ok: false, error: 'bad_action' }, 400);
  }
  next.updated_at = nowIso;

  const { error: upsertErr } = await supabase
    .from('user_onboarding_state')
    .upsert(next, { onConflict: 'telegram_user_id' });

  if (upsertErr) {
    return privateNoStore({ ok: false, error: 'db_error' }, 500);
  }
  return privateNoStore({ ok: true, state: shape(next) });
}
