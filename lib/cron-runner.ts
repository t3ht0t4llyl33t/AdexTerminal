import { getSupabase } from '@/lib/supabase-server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_SUPPORT_BOT_TOKEN || '';
const ADMIN_TELEGRAM_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '';
const REPEAT_ALERT_MS = 60 * 60 * 1000;

export type CronStatus = 'ok' | 'error' | 'skipped';

export interface CronSummary {
  [key: string]: unknown;
}

export interface CronRunResult<T> {
  status: CronStatus;
  value?: T;
  summary?: CronSummary;
  error?: string;
}

async function insertRun(
  jobName: string,
  startedAt: string,
  status: CronStatus,
  durationMs: number,
  summary: CronSummary | undefined,
  errorMessage: string | undefined,
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('cron_runs').insert({
      job_name: jobName,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      status,
      summary: summary ?? null,
      error_message: errorMessage ? errorMessage.slice(0, 500) : null,
    });
  } catch {
    // best-effort; do not throw from the journal writer
  }
}

async function shouldNotify(dedupKey: string): Promise<{ notify: boolean; repeat: number }> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('cron_alert_dedup')
      .select('last_notified_at, repeat_count')
      .eq('dedup_key', dedupKey)
      .maybeSingle();

    const nowIso = new Date().toISOString();

    if (!data) {
      await supabase
        .from('cron_alert_dedup')
        .upsert(
          { dedup_key: dedupKey, last_notified_at: nowIso, repeat_count: 1 },
          { onConflict: 'dedup_key' },
        );
      return { notify: true, repeat: 1 };
    }

    const lastMs = new Date(data.last_notified_at as string).getTime();
    const nextRepeat = ((data.repeat_count as number) ?? 1) + 1;
    if (Date.now() - lastMs < REPEAT_ALERT_MS) {
      await supabase
        .from('cron_alert_dedup')
        .update({ repeat_count: nextRepeat })
        .eq('dedup_key', dedupKey);
      return { notify: false, repeat: nextRepeat };
    }

    await supabase
      .from('cron_alert_dedup')
      .update({ last_notified_at: nowIso, repeat_count: nextRepeat })
      .eq('dedup_key', dedupKey);
    return { notify: true, repeat: nextRepeat };
  } catch {
    return { notify: false, repeat: 0 };
  }
}

async function clearNotify(dedupKey: string): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('cron_alert_dedup').delete().eq('dedup_key', dedupKey);
  } catch {
    // best-effort
  }
}

function hintFor(errorMessage: string): string {
  const m = errorMessage.toLowerCase();
  if (m.includes('supabase') || m.includes('service_role') || m.includes('jwt'))
    return 'Check SUPABASE_SERVICE_ROLE_KEY in Vercel env vars.';
  if (m.includes('highload_mnemonic'))
    return 'HIGHLOAD_MNEMONIC is not set — sweep will keep failing until wallet is provisioned.';
  if (m.includes('coingecko') || m.includes('rate_feed'))
    return 'CoinGecko upstream failure — will retry next tick.';
  if (m.includes('telegram') || m.includes('401') || m.includes('unauthorized'))
    return 'Verify TELEGRAM_SUPPORT_BOT_TOKEN and ADMIN_TELEGRAM_CHAT_ID.';
  if (m.includes('geckoterminal'))
    return 'GeckoTerminal rate-limited or down — cached data will be served to users.';
  if (m.includes('timeout') || m.includes('aborted'))
    return 'Upstream API timed out — usually transient.';
  return 'Check /api/cron logs and Supabase cron_runs journal for details.';
}

async function sendTelegramAlert(
  jobName: string,
  errorMessage: string,
  repeat: number,
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !ADMIN_TELEGRAM_CHAT_ID) return;
  const preview = errorMessage.slice(0, 200);
  const hint = hintFor(errorMessage);
  const suffix = repeat > 1 ? `\n\nRepeat #${repeat} within the last hour.` : '';
  const text =
    `Cron job failed: ${jobName}\n` +
    `Time: ${new Date().toISOString()}\n\n` +
    `Error: ${preview}\n\n` +
    `Hint: ${hint}${suffix}`;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview: true,
      }),
    });
  } catch {
    // best-effort
  }
}

export interface RunSubtaskOptions<T> {
  jobName: string;
  run: () => Promise<{ value?: T; summary?: CronSummary; skipReason?: string } | void>;
}

export async function runSubtask<T>(
  opts: RunSubtaskOptions<T>,
): Promise<CronRunResult<T>> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  try {
    const outcome = (await opts.run()) ?? {};
    const durationMs = Date.now() - t0;
    if ('skipReason' in outcome && outcome.skipReason) {
      await insertRun(
        opts.jobName,
        startedAt,
        'skipped',
        durationMs,
        { skipped: outcome.skipReason },
        undefined,
      );
      return { status: 'skipped', summary: { skipped: outcome.skipReason } };
    }
    await insertRun(
      opts.jobName,
      startedAt,
      'ok',
      durationMs,
      outcome.summary,
      undefined,
    );
    await clearNotify(`cron:${opts.jobName}`);
    return { status: 'ok', value: outcome.value, summary: outcome.summary };
  } catch (err) {
    const durationMs = Date.now() - t0;
    const message = err instanceof Error ? err.message : String(err);
    await insertRun(opts.jobName, startedAt, 'error', durationMs, undefined, message);
    const { notify, repeat } = await shouldNotify(`cron:${opts.jobName}`);
    if (notify) {
      await sendTelegramAlert(opts.jobName, message, repeat);
    }
    return { status: 'error', error: message };
  }
}

export async function lastSuccessAt(jobName: string): Promise<Date | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('cron_runs')
      .select('finished_at')
      .eq('job_name', jobName)
      .eq('status', 'ok')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.finished_at) return null;
    return new Date(data.finished_at as string);
  } catch {
    return null;
  }
}

export function authorizeCronRequest(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET || '';
  if (!secret) return true;
  return authHeader === `Bearer ${secret}`;
}
