import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireTelegramUser, unauthorized } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const CODE_RE = /^aDEX-[A-Z0-9]{4}$/;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireTelegramUser(req);
    if (!authUser) return unauthorized();
    const referred_tg_id = authUser.telegramUserId;

    const body = await req.json().catch(() => ({}));
    const rawCode = typeof body.referral_code === 'string' ? body.referral_code.trim() : '';
    if (!CODE_RE.test(rawCode)) {
      return NextResponse.json({ ok: false, reason: 'invalid_code' }, { status: 200 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ ok: false, reason: 'db_unavailable' }, { status: 200 });
    }

    const { data: codeRow } = await supabase
      .from('referral_codes')
      .select('telegram_user_id')
      .eq('referral_code', rawCode)
      .maybeSingle();

    const referrer_tg_id =
      (codeRow as { telegram_user_id?: string } | null)?.telegram_user_id ?? null;

    if (!referrer_tg_id) {
      return NextResponse.json({ ok: false, reason: 'unknown_code' }, { status: 200 });
    }

    if (String(referrer_tg_id) === String(referred_tg_id)) {
      return NextResponse.json({ ok: false, reason: 'self_referral' }, { status: 200 });
    }

    const { data: existing } = await supabase
      .from('referral_claims')
      .select('referrer_tg_id')
      .eq('referred_tg_id', String(referred_tg_id))
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        ok: true,
        already_claimed: true,
        referrer_tg_id: (existing as { referrer_tg_id?: string }).referrer_tg_id,
      });
    }

    const { error: insertErr } = await supabase.from('referral_claims').insert({
      referrer_tg_id: String(referrer_tg_id),
      referred_tg_id: String(referred_tg_id),
      referral_token: rawCode,
    });

    if (insertErr) {
      return NextResponse.json({ ok: false, reason: 'insert_failed' }, { status: 200 });
    }

    return NextResponse.json({ ok: true, referrer_tg_id: String(referrer_tg_id) });
  } catch (err) {
    console.error('[referral/claim] error:', err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
