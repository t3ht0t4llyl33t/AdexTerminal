import { NextRequest, NextResponse } from 'next/server';
import { requireTelegramUser, unauthorized } from '@/lib/api-auth';
import { getSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_REASONS = new Set([
  'honeypot',
  'rugpull',
  'scam_socials',
  'spam',
  'other',
]);

const BLACKLIST_PROMOTION_THRESHOLD = 10;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function normalizeNetwork(v: unknown): 'TON' | 'BSC' | 'BASE' | null {
  if (typeof v !== 'string') return null;
  const up = v.trim().toUpperCase();
  if (up === 'TON' || up === 'BSC' || up === 'BASE') return up;
  return null;
}

function normalizeAddress(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim().toLowerCase();
  if (trimmed.length < 4 || trimmed.length > 128) return null;
  if (!/^[a-z0-9:_\-]+$/i.test(trimmed)) return null;
  return trimmed;
}

function normalizeSymbol(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim().slice(0, 32);
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeReasonText(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, 500);
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireTelegramUser(req);
    if (!authUser) return unauthorized();
    const tgUserId = authUser.telegramUserId;

    const body = await req.json().catch(() => ({}));

    const network = normalizeNetwork(body.network);
    const address = normalizeAddress(body.contract_address);
    const reasonCode = typeof body.reason_code === 'string' ? body.reason_code.trim() : '';
    const reasonText = normalizeReasonText(body.reason_text);
    const symbol = normalizeSymbol(body.token_symbol);

    if (!network || !address) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 });
    }
    if (!ALLOWED_REASONS.has(reasonCode)) {
      return NextResponse.json({ ok: false, error: 'invalid_reason' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: rateLimit, error: rateLimitError } = await supabase.rpc(
      'check_rate_limit',
      {
        p_key: `token_report:${tgUserId}`,
        p_max_requests: RATE_LIMIT_MAX,
        p_window_ms: RATE_LIMIT_WINDOW_MS,
      },
    );
    if (rateLimitError) {
      return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
    }
    const allowed = (rateLimit as { allowed?: boolean } | null)?.allowed !== false;
    if (!allowed) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const { data: scanRow } = await supabase
      .from('scan_cache')
      .select('risk_score, is_dangerous, scan_result')
      .eq('contract_address', address)
      .eq('network', network)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!scanRow) {
      return NextResponse.json({ ok: false, error: 'scan_required' }, { status: 400 });
    }
    if (!scanRow.is_dangerous && (scanRow.risk_score ?? 0) < 60) {
      return NextResponse.json({ ok: false, error: 'not_dangerous' }, { status: 400 });
    }

    const scanResult = (scanRow.scan_result ?? {}) as Record<string, unknown>;
    const scanSymbol = typeof scanResult.tokenSymbol === 'string' ? scanResult.tokenSymbol : null;
    const resolvedSymbol = symbol ?? scanSymbol;

    const insert = await supabase.from('token_reports').insert({
      telegram_user_id: tgUserId,
      contract_address: address,
      network,
      token_symbol: resolvedSymbol,
      risk_score: scanRow.risk_score ?? 0,
      reason_code: reasonCode,
      reason_text: reasonText,
    });

    let duplicated = false;
    if (insert.error) {
      const msg = String(insert.error.message || '').toLowerCase();
      if (msg.includes('duplicate') || insert.error.code === '23505') {
        duplicated = true;
      } else {
        return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
      }
    }

    const { count: totalReports } = await supabase
      .from('token_reports')
      .select('id', { count: 'exact', head: true })
      .eq('contract_address', address)
      .eq('network', network);

    const distinctReports = totalReports ?? 0;

    if (distinctReports >= BLACKLIST_PROMOTION_THRESHOLD) {
      const { data: existingBlacklist } = await supabase
        .from('contract_blacklist')
        .select('id')
        .eq('contract_address', address)
        .eq('network', network)
        .maybeSingle();
      if (!existingBlacklist) {
        await supabase.from('contract_blacklist').insert({
          contract_address: address,
          network,
          risk_score: Math.max(scanRow.risk_score ?? 0, 85),
          reason: 'user_reports',
          token_symbol: resolvedSymbol,
        });
      }
    }

    try {
      await supabase.from('scanner_audit_logs').insert({
        contract_address: address,
        network,
        telegram_user_id: tgUserId,
        audit_result: {
          event_type: 'token_report',
          reason_code: reasonCode,
          risk_score: scanRow.risk_score ?? 0,
          duplicated,
          total_reports: distinctReports,
        },
      });
    } catch {
      // best-effort audit log
    }

    return NextResponse.json({
      ok: true,
      duplicated,
      total_reports: distinctReports,
      threshold: BLACKLIST_PROMOTION_THRESHOLD,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
