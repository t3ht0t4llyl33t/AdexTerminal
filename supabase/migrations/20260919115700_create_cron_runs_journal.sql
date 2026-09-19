/*
# Cron Runs Journal + Alert Deduplication

Adds a durable journal for every cron subtask invocation, plus a small
dedup key store so Telegram alert notifications don't spam the operator
when the same failure repeats every 5 minutes.

## New tables

### `cron_runs`
Records every attempt of every cron subtask.
- `id` (uuid, primary key)
- `job_name` (text, e.g. "tick", "alert-check", "refresh-ton-price",
  "subscription-check", "highload-sweep")
- `started_at` (timestamptz, default now())
- `finished_at` (timestamptz, nullable — filled by the runner)
- `duration_ms` (integer, nullable)
- `status` (text, one of "ok" / "error" / "skipped")
- `error_message` (text, nullable — trimmed to 500 chars)
- `summary` (jsonb, nullable — freeform result payload written by the job)

Index on (job_name, started_at DESC) for the "last successful run"
lookup that decides whether refresh-ton-price should fire again.

### `cron_alert_dedup`
Tracks the last time a specific error alert was sent to Telegram,
so we can throttle repeat notifications to at most once per hour.
- `dedup_key` (text, primary key — e.g. "refresh-ton-price:rate_feed_unavailable")
- `last_notified_at` (timestamptz)
- `repeat_count` (integer, default 1)

## Security

RLS is enabled on both tables. NO public policies are added — the anon
role cannot read or write. The tables are used only by server-side code
via the service role key (which bypasses RLS).
*/

CREATE TABLE IF NOT EXISTS cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  status text NOT NULL DEFAULT 'ok',
  error_message text,
  summary jsonb
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_job_started
  ON cron_runs (job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_runs_status_started
  ON cron_runs (status, started_at DESC);

ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS cron_alert_dedup (
  dedup_key text PRIMARY KEY,
  last_notified_at timestamptz NOT NULL DEFAULT now(),
  repeat_count integer NOT NULL DEFAULT 1
);

ALTER TABLE cron_alert_dedup ENABLE ROW LEVEL SECURITY;
