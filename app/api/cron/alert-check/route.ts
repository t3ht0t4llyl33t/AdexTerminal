import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const telegramBotToken = process.env.TELEGRAM_SUPPORT_BOT_TOKEN || '';
const cronSecret = process.env.CRON_SECRET || '';

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!telegramBotToken) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    if (!res.ok && res.status === 429) {
      const body = await res.json().catch(() => ({}));
      const retryAfter = body?.parameters?.retry_after || 1;
      await sleep(retryAfter * 1000);
      return false;
    }
    return res.ok;
  } catch {
    return false;
  }
}

interface AlertEntry {
  id: string;
  type: 'spike' | 'whale-buy';
  threshold: number;
  networks: string[];
  enabled: boolean;
  label: string;
  last_fired_token_id?: string | null;
  last_fired_ts?: number | null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!telegramBotToken) {
    return NextResponse.json({ ok: true, skipped: 'no_bot_token' });
  }

  try {
    const supabase = getSupabase();

    // Load all PRO users with active alerts
    const { data: proUsers } = await supabase
      .from('user_pro_settings')
      .select('telegram_user_id, alerts');

    if (!proUsers || proUsers.length === 0) {
      return NextResponse.json({ ok: true, checked: 0, sent: 0 });
    }

    // Load latest radar cache for token spikes
    const { data: radarCache } = await supabase
      .from('radar_cache')
      .select('tokens, whales, networks')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!radarCache) {
      return NextResponse.json({ ok: true, checked: proUsers.length, sent: 0, reason: 'no_cache' });
    }

    const cachedTokens: Array<{
      id?: string;
      address?: string;
      symbol?: string;
      network?: string;
      volumeSpike15m?: number;
      liquidity?: number;
    }> = Array.isArray(radarCache.tokens) ? radarCache.tokens : [];

    const cachedWhales: Array<{
      id?: string;
      tokenSymbol?: string;
      tokenAddress?: string;
      network?: string;
      type?: string;
      amountUsd?: number;
    }> = Array.isArray(radarCache.whales) ? radarCache.whales : [];

    let sentCount = 0;
    const alertUpdates: Array<{ telegram_user_id: string; alerts: AlertEntry[] }> = [];

    for (const user of proUsers) {
      const tgUserId = user.telegram_user_id as string;
      const userAlerts: AlertEntry[] = Array.isArray(user.alerts) ? user.alerts : [];
      const activeAlerts = userAlerts.filter((a) => a.enabled);
      let alertsChanged = false;

      for (const alert of activeAlerts) {
        const networkFilter = alert.networks.includes('ALL') ? null : alert.networks;

        if (alert.type === 'spike') {
          const matchingToken = cachedTokens.find((t) => {
            if (networkFilter && !networkFilter.includes(t.network || '')) return false;
            return (t.volumeSpike15m ?? 0) >= alert.threshold && t.id !== alert.last_fired_token_id;
          });

          if (matchingToken) {
            const msg = `📊 *Super Spike Alert*\n\n` +
              `*${matchingToken.symbol || 'Token'}* on *${matchingToken.network}*\n` +
              `Volume spike: +${matchingToken.volumeSpike15m}%\n` +
              `Liquidity: $${(matchingToken.liquidity ?? 0).toLocaleString()}\n\n` +
              `Contract: \`${matchingToken.address || 'N/A'}\``;
            const ok = await sendTelegramMessage(tgUserId, msg);
            if (ok) {
              sentCount++;
              alert.last_fired_token_id = matchingToken.id || matchingToken.address || null;
              alert.last_fired_ts = Date.now();
              alertsChanged = true;
            }
            await sleep(34);
          }
        } else if (alert.type === 'whale-buy') {
          const matchingWhale = cachedWhales.find((w) => {
            if (w.type !== 'buy') return false;
            if (networkFilter && !networkFilter.includes(w.network || '')) return false;
            return (w.amountUsd ?? 0) >= alert.threshold && w.id !== alert.last_fired_token_id;
          });

          if (matchingWhale) {
            const msg = `🐋 *Mega Whale Alert*\n\n` +
              `*${matchingWhale.tokenSymbol || 'Token'}* on *${matchingWhale.network}*\n` +
              `Whale buy: $${(matchingWhale.amountUsd ?? 0).toLocaleString()}\n\n` +
              `Contract: \`${matchingWhale.tokenAddress || 'N/A'}\``;
            const ok = await sendTelegramMessage(tgUserId, msg);
            if (ok) {
              sentCount++;
              alert.last_fired_token_id = matchingWhale.id || null;
              alert.last_fired_ts = Date.now();
              alertsChanged = true;
            }
            await sleep(34);
          }
        }
      }

      if (alertsChanged) {
        alertUpdates.push({ telegram_user_id: tgUserId, alerts: userAlerts });
      }
    }

    // Batch update dedup fields
    for (const update of alertUpdates) {
      await supabase
        .from('user_pro_settings')
        .update({ alerts: update.alerts, updated_at: new Date().toISOString() })
        .eq('telegram_user_id', update.telegram_user_id);
    }

    return NextResponse.json({
      ok: true,
      checked: proUsers.length,
      sent: sentCount,
      updated: alertUpdates.length,
    });
  } catch (err) {
    console.error('[alert-check] Error:', err);
    return NextResponse.json({ ok: true, error: 'check_failed' });
  }
}
