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

const MAX_ALERTS = 2;
const VALID_TYPES = ['spike', 'whale-buy'] as const;
const VALID_NETWORKS = ['ALL', 'TON', 'BSC', 'BASE'] as const;
type AlertType = (typeof VALID_TYPES)[number];

function isValidType(v: string): v is AlertType {
  return (VALID_TYPES as readonly string[]).includes(v);
}

function validateAlert(alert: {
  type?: string;
  threshold?: number;
  networks?: string[];
  enabled?: boolean;
  label?: string;
}) {
  if (!alert || !isValidType(alert.type ?? '')) return null;
  const threshold = Number(alert.threshold);
  if (Number.isNaN(threshold) || threshold <= 0) return null;

  if (alert.type === 'spike' && (threshold < 50 || threshold > 1000)) return null;
  if (alert.type === 'whale-buy' && (threshold < 3000 || threshold > 1000000)) return null;

  const networks = Array.isArray(alert.networks) ? alert.networks.filter((n) => (VALID_NETWORKS as readonly string[]).includes(n)) : [];
  if (networks.length === 0) return null;

  return {
    type: alert.type as AlertType,
    threshold,
    networks: networks as string[],
    enabled: alert.enabled !== false,
    label: alert.label || `${alert.type === 'spike' ? 'Spike' : 'Whale'} > ${threshold}${alert.type === 'spike' ? '%' : '$'}`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireTelegramUser(req);
    if (!authUser) return unauthorized();
    const tgUserId = authUser.telegramUserId;
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'get';
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ ok: true, alerts: [] });
    }

    const { data: row } = await supabase
      .from('user_pro_settings')
      .select('alerts')
      .eq('telegram_user_id', tgUserId)
      .maybeSingle();

    const currentAlerts: Array<{
      id: string;
      type: AlertType;
      threshold: number;
      networks: string[];
      enabled: boolean;
      label: string;
      last_fired_token_id?: string | null;
      last_fired_ts?: number | null;
    }> = Array.isArray(row?.alerts) ? (row!.alerts as Array<{
      id: string;
      type: AlertType;
      threshold: number;
      networks: string[];
      enabled: boolean;
      label: string;
      last_fired_token_id?: string | null;
      last_fired_ts?: number | null;
    }>) : [];

    if (action === 'get') {
      return NextResponse.json({ ok: true, alerts: currentAlerts });
    }

    if (action === 'save') {
      if (currentAlerts.length >= MAX_ALERTS) {
        return NextResponse.json(
          { ok: false, error: 'max_alerts_reached', limit: MAX_ALERTS },
          { status: 400 },
        );
      }
      const validated = validateAlert(body);
      if (!validated) {
        return NextResponse.json({ ok: false, error: 'invalid_alert' }, { status: 400 });
      }
      const newAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...validated,
        last_fired_token_id: null,
        last_fired_ts: null,
      };
      const updated = [...currentAlerts, newAlert];
      const { error } = await supabase
        .from('user_pro_settings')
        .upsert({
          telegram_user_id: tgUserId,
          alerts: updated,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'telegram_user_id' });
      if (error) {
        console.error('[alerts] save error:', error);
        return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, alerts: updated });
    }

    if (action === 'delete') {
      const alertId = String(body.alert_id || '');
      const updated = currentAlerts.filter((a) => a.id !== alertId);
      const { error } = await supabase
        .from('user_pro_settings')
        .upsert({
          telegram_user_id: tgUserId,
          alerts: updated,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'telegram_user_id' });
      if (error) {
        console.error('[alerts] delete error:', error);
        return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, alerts: updated });
    }

    if (action === 'toggle') {
      const alertId = String(body.alert_id || '');
      const updated = currentAlerts.map((a) =>
        a.id === alertId ? { ...a, enabled: !a.enabled } : a,
      );
      const { error } = await supabase
        .from('user_pro_settings')
        .upsert({
          telegram_user_id: tgUserId,
          alerts: updated,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'telegram_user_id' });
      if (error) {
        console.error('[alerts] toggle error:', error);
        return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, alerts: updated });
    }

    return NextResponse.json({ ok: true, alerts: currentAlerts });
  } catch (err) {
    console.error('[alerts] Error:', err);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
