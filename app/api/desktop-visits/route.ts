import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_ACTIONS = new Set(['opened_in_telegram', 'continued_as_preview', 'landing_shown']);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { action?: string };
    const action = body.action || '';
    if (!ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
    }

    const ua = req.headers.get('user-agent') || '';
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const visitorHash = createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32);

    const supabase = getSupabase();
    await supabase.from('desktop_visitors').insert({
      visitor_hash: visitorHash,
      action,
      user_agent: ua.slice(0, 500),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
