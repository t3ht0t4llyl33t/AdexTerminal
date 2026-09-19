import { getSupabase } from '@/lib/supabase-server';
import type { CronSummary } from '@/lib/cron-runner';
import { runRadarRefreshOnce } from '@/selectors/apiConfig';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_SUPPORT_BOT_TOKEN || '';
const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface SubtaskOutcome<T = unknown> {
  value?: T;
  summary?: CronSummary;
  skipReason?: string;
}

/* ---------- refresh-ton-price ---------- */

interface RateFeed {
  rate: number;
  source: string;
}

async function fetchTonUsd(): Promise<RateFeed | null> {
  try {
    const res = await fetch(COINGECKO_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, { usd?: number }>;
    const rate = json['the-open-network']?.usd;
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null;
    return { rate, source: 'coingecko' };
  } catch {
    return null;
  }
}

export async function runRefreshTonPrice(): Promise<SubtaskOutcome> {
  const feed = await fetchTonUsd();
  if (!feed) {
    throw new Error('rate_feed_unavailable (CoinGecko)');
  }

  const supabase = getSupabase();
  const { data: pricingRow } = await supabase
    .from('pro_pricing')
    .select('price_usd_target, min_ton, max_ton')
    .eq('id', 'monthly_pro')
    .maybeSingle();

  const usdTarget = Number(pricingRow?.price_usd_target ?? 9.9);
  const minTon = Number(pricingRow?.min_ton ?? 1.0);
  const maxTon = Number(pricingRow?.max_ton ?? 9.9);
  const rawTon = usdTarget / feed.rate;
  const flooredTon = Math.floor(rawTon * 10) / 10;
  const priceTon = Math.min(Math.max(flooredTon, minTon), maxTon);
  const nowIso = new Date().toISOString();

  const { error: cacheErr } = await supabase.from('ton_price_cache').upsert(
    { id: 'ton_usd', usd_per_ton: feed.rate, source: feed.source, updated_at: nowIso },
    { onConflict: 'id' },
  );
  if (cacheErr) throw new Error(`supabase ton_price_cache upsert: ${cacheErr.message}`);

  const { error: pricingErr } = await supabase.from('pro_pricing').upsert(
    {
      id: 'monthly_pro',
      price_ton: priceTon,
      price_usd_target: usdTarget,
      min_ton: minTon,
      max_ton: maxTon,
      source: `coingecko@${feed.rate.toFixed(4)}`,
      updated_at: nowIso,
    },
    { onConflict: 'id' },
  );
  if (pricingErr) throw new Error(`supabase pro_pricing upsert: ${pricingErr.message}`);

  return {
    summary: {
      usd_per_ton: feed.rate,
      price_ton: priceTon,
      price_usd_target: usdTarget,
    },
  };
}

/* ---------- alert-check ---------- */

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

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    if (!res.ok && res.status === 429) {
      const body = (await res.json().catch(() => ({}))) as {
        parameters?: { retry_after?: number };
      };
      const retryAfter = body?.parameters?.retry_after || 1;
      await sleep(retryAfter * 1000);
      return false;
    }
    return res.ok;
  } catch {
    return false;
  }
}

export async function runAlertCheck(): Promise<SubtaskOutcome> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { skipReason: 'no_bot_token' };
  }

  const supabase = getSupabase();
  const { data: proUsers } = await supabase
    .from('user_pro_settings')
    .select('telegram_user_id, alerts');

  if (!proUsers || proUsers.length === 0) {
    return { summary: { checked: 0, sent: 0 } };
  }

  const { data: radarCache } = await supabase
    .from('radar_cache')
    .select('tokens, whales')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!radarCache) {
    return { summary: { checked: proUsers.length, sent: 0, reason: 'no_cache' } };
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
        const matching = cachedTokens.find((t) => {
          if (networkFilter && !networkFilter.includes(t.network || '')) return false;
          return (t.volumeSpike15m ?? 0) >= alert.threshold && t.id !== alert.last_fired_token_id;
        });
        if (matching) {
          const msg =
            `Super Spike Alert\n\n` +
            `*${matching.symbol || 'Token'}* on *${matching.network}*\n` +
            `Volume spike: +${matching.volumeSpike15m}%\n` +
            `Liquidity: $${(matching.liquidity ?? 0).toLocaleString()}\n\n` +
            `Contract: \`${matching.address || 'N/A'}\``;
          const ok = await sendTelegramMessage(tgUserId, msg);
          if (ok) {
            sentCount++;
            alert.last_fired_token_id = matching.id || matching.address || null;
            alert.last_fired_ts = Date.now();
            alertsChanged = true;
          }
          await sleep(34);
        }
      } else if (alert.type === 'whale-buy') {
        const matching = cachedWhales.find((w) => {
          if (w.type !== 'buy') return false;
          if (networkFilter && !networkFilter.includes(w.network || '')) return false;
          return (w.amountUsd ?? 0) >= alert.threshold && w.id !== alert.last_fired_token_id;
        });
        if (matching) {
          const msg =
            `Mega Whale Alert\n\n` +
            `*${matching.tokenSymbol || 'Token'}* on *${matching.network}*\n` +
            `Whale buy: $${(matching.amountUsd ?? 0).toLocaleString()}\n\n` +
            `Contract: \`${matching.tokenAddress || 'N/A'}\``;
          const ok = await sendTelegramMessage(tgUserId, msg);
          if (ok) {
            sentCount++;
            alert.last_fired_token_id = matching.id || null;
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

  for (const upd of alertUpdates) {
    await supabase
      .from('user_pro_settings')
      .update({ alerts: upd.alerts, updated_at: new Date().toISOString() })
      .eq('telegram_user_id', upd.telegram_user_id);
  }

  return {
    summary: { checked: proUsers.length, sent: sentCount, updated: alertUpdates.length },
  };
}

/* ---------- subscription-check ---------- */

async function sendSubscriptionReminder(
  chatId: string,
  lang: string,
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  const message =
    lang === 'RU'
      ? 'Уведомление о продлении: До конца действия ваших PRO-фильтров сканирования инсайдерских кластеров Base/BSC осталось менее 72 часов. Нажмите кнопку ниже для мгновенного продления Pro-тарифа.'
      : 'Pro Access Expiration Notice: Your aDEX Terminal premium filters and insider whale distribution scan depths expire in less than 72 hours. Tap the link below to seamlessly renew your access block instantly.';

  const inline_keyboard = [
    [
      {
        text: lang === 'RU' ? 'Продлить Pro' : 'Renew Pro',
        url: 'https://t.me/aDEX_Live_Support_bot?start=renew',
      },
    ],
  ];

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard },
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function runSubscriptionCheck(): Promise<SubtaskOutcome> {
  const supabase = getSupabase();
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  const { data: expiringUsers } = await supabase
    .from('user_subscriptions')
    .select('telegram_user_id, language, pro_expiration_date')
    .eq('tier', 'pro')
    .gte('pro_expiration_date', in48h.toISOString())
    .lte('pro_expiration_date', in72h.toISOString());

  if (!expiringUsers || expiringUsers.length === 0) {
    return { summary: { checked: 0, dispatched: 0 } };
  }

  let dispatched = 0;
  for (const user of expiringUsers) {
    const lang = (user as { language?: string }).language || 'EN';
    const tgId = (user as { telegram_user_id: string }).telegram_user_id;
    const ok = await sendSubscriptionReminder(tgId, lang);
    if (ok) dispatched++;
  }

  return { summary: { checked: expiringUsers.length, dispatched } };
}

/* ---------- radar-refresh ---------- */

export async function runRadarRefresh(): Promise<SubtaskOutcome> {
  await runRadarRefreshOnce();
  return { summary: { refreshed: true } };
}

/* ---------- daily-digest ---------- */

interface DigestUserRow {
  telegram_user_id: string;
  enabled: boolean;
  language?: string;
}

async function sendDigestMessage(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runDailyDigest(): Promise<SubtaskOutcome> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { skipReason: 'no_bot_token' };
  }

  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);

  const { data: prefRows } = await supabase
    .from('user_digest_prefs')
    .select('telegram_user_id, enabled');

  const enabledUsers: DigestUserRow[] = (prefRows ?? [])
    .filter((r) => (r as DigestUserRow).enabled === true)
    .map((r) => r as DigestUserRow);

  if (enabledUsers.length === 0) {
    return { summary: { checked: 0, sent: 0 } };
  }

  const enabledIds = enabledUsers.map((u) => u.telegram_user_id);
  const { data: subRows } = await supabase
    .from('user_subscriptions')
    .select('telegram_user_id, language')
    .in('telegram_user_id', enabledIds);

  const langByUser = new Map<string, string>();
  for (const s of subRows ?? []) {
    const row = s as { telegram_user_id: string; language?: string };
    langByUser.set(row.telegram_user_id, (row.language || 'EN').toUpperCase());
  }

  const { data: alreadySent } = await supabase
    .from('user_digest_log')
    .select('telegram_user_id')
    .eq('digest_date', today);

  const sentSet = new Set((alreadySent ?? []).map((r) => (r as { telegram_user_id: string }).telegram_user_id));
  const pending = enabledUsers.filter((u) => !sentSet.has(u.telegram_user_id));
  if (pending.length === 0) {
    return { summary: { checked: enabledUsers.length, sent: 0, reason: 'all_sent' } };
  }

  const { data: radarCache } = await supabase
    .from('radar_cache')
    .select('tokens, whales')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const cachedTokens: Array<{
    symbol?: string;
    network?: string;
    address?: string;
    volumeSpike15m?: number;
  }> = Array.isArray(radarCache?.tokens) ? (radarCache!.tokens as unknown[]) as never : [];

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: blacklistRows } = await supabase
    .from('contract_blacklist')
    .select('token_symbol, contract_address, network, reason, created_at')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(3);

  const scamCount = blacklistRows?.length ?? 0;

  let sent = 0;
  for (const user of pending) {
    const { data: watchRows } = await supabase
      .from('user_watchlist')
      .select('network, token_address, token_symbol')
      .eq('telegram_user_id', user.telegram_user_id);

    const watchKeys = new Set(
      (watchRows ?? []).map((r) => `${(r as { network: string }).network}:${(r as { token_address: string }).token_address.toLowerCase()}`),
    );

    const watchMatches = cachedTokens
      .filter((t) => watchKeys.has(`${t.network || ''}:${(t.address || '').toLowerCase()}`))
      .slice(0, 5);

    const lang = (langByUser.get(user.telegram_user_id) || 'EN') === 'RU' ? 'RU' : 'EN';
    const lines: string[] = [];
    lines.push(lang === 'RU' ? `*aDEX Terminal — утренний дайджест*` : `*aDEX Terminal — Daily digest*`);
    lines.push('');

    if (watchRows && watchRows.length > 0) {
      lines.push(lang === 'RU' ? `_Ваш список (${watchRows.length}):_` : `_Your list (${watchRows.length}):_`);
      if (watchMatches.length > 0) {
        for (const m of watchMatches) {
          const spike = m.volumeSpike15m ?? 0;
          lines.push(
            lang === 'RU'
              ? `• *${m.symbol || 'Токен'}* на ${m.network} — скачок +${spike}%`
              : `• *${m.symbol || 'Token'}* on ${m.network} — spike +${spike}%`,
          );
        }
      } else {
        lines.push(
          lang === 'RU'
            ? '• За последний час по вашим токенам всплесков нет.'
            : '• No fresh spike on your tokens in the last hour.',
        );
      }
    } else {
      lines.push(
        lang === 'RU'
          ? '_Ваш список пуст._ Добавьте токены в терминале для персональных обновлений.'
          : '_Your list is empty._ Add tokens inside the app to get personal updates.',
      );
    }

    lines.push('');
    if (scamCount > 0) {
      lines.push(
        lang === 'RU'
          ? `_Свежие сигналы риска:_ за неделю помечено ${scamCount} контракт(ов).`
          : `_Fresh risk signals:_ ${scamCount} contract(s) flagged this week.`,
      );
    } else {
      lines.push(
        lang === 'RU'
          ? '_Сигналы риска:_ за неделю новых флагов нет.'
          : '_Risk signals:_ no new flags in the last week.',
      );
    }

    lines.push('');
    lines.push(
      lang === 'RU'
        ? `Открыть терминал → https://t.me/aDEX_Live_Support_bot/app?startapp=digest_${today}`
        : `Open the terminal → https://t.me/aDEX_Live_Support_bot/app?startapp=digest_${today}`,
    );

    const ok = await sendDigestMessage(user.telegram_user_id, lines.join('\n'));
    if (ok) {
      await supabase.from('user_digest_log').insert({
        telegram_user_id: user.telegram_user_id,
        digest_date: today,
      });
      sent++;
    }
    await sleep(50);
  }

  return { summary: { checked: enabledUsers.length, pending: pending.length, sent } };
}

/* ---------- lightning-boost ---------- */

const LIGHTNING_WINDOW_HOURS = 24;
const LIGHTNING_BOOST_DAYS = 15;

async function sendBoostNotification(chatId: string, lang: 'EN' | 'RU'): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false;
  const text =
    lang === 'RU'
      ? `Lightning Boost активирован

Ваш реферал оформил PRO в течение первых 24 часов. ` +
        `Мы добавили *${LIGHTNING_BOOST_DAYS} дополнительных дней* PRO на ваш аккаунт.`
      : `Lightning Boost activated

Your invitee activated PRO within the first 24 hours. ` +
        `We added *${LIGHTNING_BOOST_DAYS} extra days* of PRO to your account.`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runLightningBoost(): Promise<SubtaskOutcome> {
  const supabase = getSupabase();

  const { data: candidates } = await supabase
    .from('referral_bonus_grants')
    .select('id, inviter_telegram_id, invitee_telegram_id, invitee_signup_at, invitee_purchase_at, status')
    .eq('status', 'pending')
    .limit(200);

  if (!candidates || candidates.length === 0) {
    return { summary: { checked: 0, granted: 0 } };
  }

  let granted = 0;
  for (const row of candidates as Array<{
    id: string;
    inviter_telegram_id: string;
    invitee_telegram_id: string;
    invitee_signup_at: string | null;
    invitee_purchase_at: string | null;
    status: string;
  }>) {
    if (!row.invitee_signup_at || !row.invitee_purchase_at) continue;
    const signupMs = new Date(row.invitee_signup_at).getTime();
    const purchaseMs = new Date(row.invitee_purchase_at).getTime();
    const withinWindow = purchaseMs - signupMs <= LIGHTNING_WINDOW_HOURS * 60 * 60 * 1000;

    if (!withinWindow) {
      await supabase
        .from('referral_bonus_grants')
        .update({ status: 'skipped', skip_reason: 'outside_window' })
        .eq('id', row.id);
      continue;
    }

    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('tier, pro_expiration_date, language')
      .eq('telegram_user_id', row.inviter_telegram_id)
      .maybeSingle();

    const now = Date.now();
    const baseMs = sub?.pro_expiration_date
      ? Math.max(new Date(sub.pro_expiration_date as string).getTime(), now)
      : now;
    const newExpiration = new Date(baseMs + LIGHTNING_BOOST_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { error: subErr } = await supabase.from('user_subscriptions').upsert(
      {
        telegram_user_id: row.inviter_telegram_id,
        tier: 'pro',
        pro_expiration_date: newExpiration,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'telegram_user_id' },
    );
    if (subErr) continue;

    await supabase
      .from('referral_bonus_grants')
      .update({ status: 'granted', granted_at: new Date().toISOString(), boost_days: LIGHTNING_BOOST_DAYS })
      .eq('id', row.id);

    await sendBoostNotification(
      row.inviter_telegram_id,
      ((sub as { language?: string } | null)?.language || 'EN').toUpperCase() === 'RU' ? 'RU' : 'EN',
    );
    granted++;
    await sleep(50);
  }

  return { summary: { checked: candidates.length, granted } };
}

/* ---------- daily-metrics-snapshot ---------- */

function utcDayBounds(day: Date): { startIso: string; endIso: string; dateStr: string } {
  const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const dateStr = start.toISOString().slice(0, 10);
  return { startIso: start.toISOString(), endIso: end.toISOString(), dateStr };
}

async function countUniqueUsersInWindow(startIso: string, endIso: string): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('session_audit_log')
    .select('telegram_user_id, last_seen_at, first_seen_at')
    .or(`last_seen_at.gte.${startIso},first_seen_at.gte.${startIso}`)
    .lt('first_seen_at', endIso);
  if (error) throw new Error(`session_audit_log query failed: ${error.message}`);
  const active = new Set<string>();
  const winStart = new Date(startIso).getTime();
  const winEnd = new Date(endIso).getTime();
  for (const row of (data as Array<{ telegram_user_id: string; last_seen_at: string; first_seen_at: string }> | null) ?? []) {
    const first = new Date(row.first_seen_at).getTime();
    const last = new Date(row.last_seen_at).getTime();
    if (last >= winStart && first < winEnd) active.add(row.telegram_user_id);
  }
  return active.size;
}

export interface DailyMetricsRow {
  metric_date: string;
  dau: number;
  new_users: number;
  scans_total: number;
  scans_ton: number;
  scans_evm: number;
  scans_bsc: number;
  scans_base: number;
  scans_other: number;
  dangerous_hits: number;
  ton_cache_hits: number;
  pro_active: number;
  whale_alerts_shown: number;
  whales_flagged: number;
  scam_flags_new: number;
  active_users_7d: number;
  tokens_indexed: number;
  payout_amount_usd: number;
  raw_summary: null;
  captured_at: string;
}

export async function computeDailyMetricsForDate(day: Date): Promise<DailyMetricsRow> {
  const supabase = getSupabase();
  const { startIso, endIso, dateStr } = utcDayBounds(day);

  const dau = await countUniqueUsersInWindow(startIso, endIso);
  const weekStartIso = new Date(new Date(endIso).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const active7d = await countUniqueUsersInWindow(weekStartIso, endIso);

  const { count: newUsers, error: newErr } = await supabase
    .from('session_audit_log')
    .select('telegram_user_id', { count: 'exact', head: true })
    .gte('first_seen_at', startIso)
    .lt('first_seen_at', endIso);
  if (newErr) throw new Error(`new_users query failed: ${newErr.message}`);

  const { data: scans, error: scansErr } = await supabase
    .from('scanner_audit_logs')
    .select('network, apex_ai_verdict')
    .gte('created_at', startIso)
    .lt('created_at', endIso);
  if (scansErr) throw new Error(`scanner_audit_logs query failed: ${scansErr.message}`);

  let scansTotal = 0;
  let scansTon = 0;
  let scansBsc = 0;
  let scansBase = 0;
  let scansOther = 0;
  let dangerousHits = 0;
  for (const s of (scans as Array<{ network: string | null; apex_ai_verdict: string | null }> | null) ?? []) {
    scansTotal++;
    const net = (s.network || '').toUpperCase();
    if (net === 'TON') scansTon++;
    else if (net === 'BSC') scansBsc++;
    else if (net === 'BASE') scansBase++;
    else scansOther++;
    if ((s.apex_ai_verdict || '').toLowerCase() === 'danger') dangerousHits++;
  }
  const scansEvm = scansBsc + scansBase + scansOther;

  const { count: tonCacheHits, error: cacheErr } = await supabase
    .from('ton_safety_cache')
    .select('master_address', { count: 'exact', head: true })
    .gte('updated_at', startIso)
    .lt('updated_at', endIso);
  if (cacheErr) throw new Error(`ton_safety_cache query failed: ${cacheErr.message}`);

  const { count: proActive, error: proErr } = await supabase
    .from('user_subscriptions')
    .select('telegram_user_id', { count: 'exact', head: true })
    .eq('tier', 'pro')
    .gte('pro_expiration_date', endIso);
  if (proErr) throw new Error(`user_subscriptions query failed: ${proErr.message}`);

  const { count: whaleAlerts, error: whaleErr } = await supabase
    .from('product_events')
    .select('id', { count: 'exact', head: true })
    .in('event_name', ['whale_alert_shown', 'whale_shown', 'whales_shown'])
    .gte('created_at', startIso)
    .lt('created_at', endIso);
  if (whaleErr) throw new Error(`product_events (whale) query failed: ${whaleErr.message}`);

  const { count: scamFlagsNew, error: scamErr } = await supabase
    .from('contract_blacklist')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startIso)
    .lt('created_at', endIso);
  if (scamErr) throw new Error(`contract_blacklist query failed: ${scamErr.message}`);

  const { count: tokensIndexed, error: tokensErr } = await supabase
    .from('token_metadata')
    .select('id', { count: 'exact', head: true })
    .lt('updated_at', endIso);
  if (tokensErr) throw new Error(`token_metadata query failed: ${tokensErr.message}`);

  const { data: payouts, error: payoutErr } = await supabase
    .from('partner_pending_balances')
    .select('amount_usd, status, updated_at')
    .eq('status', 'paid')
    .gte('updated_at', startIso)
    .lt('updated_at', endIso);
  if (payoutErr) throw new Error(`partner_pending_balances query failed: ${payoutErr.message}`);
  let payoutUsd = 0;
  for (const p of (payouts as Array<{ amount_usd: number | string | null }> | null) ?? []) {
    const v = typeof p.amount_usd === 'number' ? p.amount_usd : Number(p.amount_usd ?? 0);
    if (Number.isFinite(v)) payoutUsd += v;
  }

  return {
    metric_date: dateStr,
    dau,
    new_users: newUsers ?? 0,
    scans_total: scansTotal,
    scans_ton: scansTon,
    scans_evm: scansEvm,
    scans_bsc: scansBsc,
    scans_base: scansBase,
    scans_other: scansOther,
    dangerous_hits: dangerousHits,
    ton_cache_hits: tonCacheHits ?? 0,
    pro_active: proActive ?? 0,
    whale_alerts_shown: whaleAlerts ?? 0,
    whales_flagged: whaleAlerts ?? 0,
    scam_flags_new: scamFlagsNew ?? 0,
    active_users_7d: active7d,
    tokens_indexed: tokensIndexed ?? 0,
    payout_amount_usd: Math.round(payoutUsd * 100) / 100,
    raw_summary: null,
    captured_at: new Date().toISOString(),
  };
}

export async function runDailyMetricsSnapshot(): Promise<SubtaskOutcome> {
  const supabase = getSupabase();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const row = await computeDailyMetricsForDate(yesterday);

  const { error: upsertErr } = await supabase
    .from('daily_metrics_snapshot')
    .upsert(row, { onConflict: 'metric_date' });
  if (upsertErr) throw new Error(`snapshot upsert failed: ${upsertErr.message}`);

  return { summary: { ...row } as unknown as CronSummary };
}


