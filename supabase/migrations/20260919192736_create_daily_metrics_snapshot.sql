/*
# Create daily_metrics_snapshot table

1. New Tables
- `daily_metrics_snapshot`
- `metric_date` (date, PK) — the UTC calendar day the row summarizes
- `dau` (int) — unique telegram_user_id seen in session_audit_log on this day
- `new_users` (int) — telegram_user_id whose first_seen_at falls on this day
- `scans_total` (int) — number of contract audits performed on this day
- `scans_ton` (int) — audits where network = 'TON'
- `scans_evm` (int) — audits on BSC/BASE/other EVM chains
- `dangerous_hits` (int) — audits with apex_ai_verdict = 'Danger'
- `ton_cache_hits` (int) — ton_safety_cache rows updated on this day
- `pro_active` (int) — subscriptions with tier='pro' and pro_expiration_date >= end-of-day
- `whale_alerts_shown` (int) — product_events with event_name='whale_alert_shown'
- `raw_summary` (jsonb) — any extra counters for future dashboards
- `captured_at` (timestamptz) — when the snapshot row was written

2. Security
- Enable RLS. NO anon or authenticated policies — the table is deny-by-default.
- Cron writer uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS by design).
- Read endpoint /api/metrics/daily is gated by CRON_SECRET on the server and also uses the service role.

3. Notes
- One row per UTC day (metric_date PK). Upsert on re-runs so the daily aggregator is idempotent.
- Retention: unlimited for now — dataset stays tiny (365 rows/year).
- Indexed by PK; no extra index needed.
*/

CREATE TABLE IF NOT EXISTS daily_metrics_snapshot (
  metric_date        date PRIMARY KEY,
  dau                int NOT NULL DEFAULT 0,
  new_users          int NOT NULL DEFAULT 0,
  scans_total        int NOT NULL DEFAULT 0,
  scans_ton          int NOT NULL DEFAULT 0,
  scans_evm          int NOT NULL DEFAULT 0,
  dangerous_hits     int NOT NULL DEFAULT 0,
  ton_cache_hits     int NOT NULL DEFAULT 0,
  pro_active         int NOT NULL DEFAULT 0,
  whale_alerts_shown int NOT NULL DEFAULT 0,
  raw_summary        jsonb,
  captured_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daily_metrics_snapshot ENABLE ROW LEVEL SECURITY;
