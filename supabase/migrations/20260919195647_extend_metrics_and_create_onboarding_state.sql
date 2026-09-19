/*
# Extend daily_metrics_snapshot + create user_onboarding_state

1. Modified Tables
- `daily_metrics_snapshot` — added grant-reporting columns via ADD COLUMN IF NOT EXISTS
- `scans_bsc` (int) — scans on BSC per day
- `scans_base` (int) — scans on BASE per day
- `scans_other` (int) — other EVM/unknown networks
- `whales_flagged` (int) — whale alerts surfaced this day (from product_events)
- `scam_flags_new` (int) — new contract_blacklist entries created this day
- `active_users_7d` (int) — unique telegram_user_id seen in the trailing 7 days
- `tokens_indexed` (int) — cumulative token_metadata rows as of this day
- `payout_amount_usd` (numeric) — sum of partner_pending_balances paid on this day (USD)

2. New Tables
- `user_onboarding_state`
- `telegram_user_id` (text, PK)
- `step_completed` (int, 0-3) — how many onboarding slides the user finished
- `first_seen_at` (timestamptz) — when we first showed onboarding
- `completed_at` (timestamptz) — when user finished all three slides / clicked Start
- `skipped_at` (timestamptz) — when user pressed Skip
- `hints_dismissed` (jsonb) — map of one-shot hint keys the user closed
- `updated_at` (timestamptz)

3. Security
- `user_onboarding_state` — RLS enabled, DENY-BY-DEFAULT (no anon/authenticated policies). Access only via server routes using SUPABASE_SERVICE_ROLE_KEY after Telegram initData HMAC verification.
- `daily_metrics_snapshot` retains its existing deny-by-default policy set.

4. Notes
- All schema changes are additive; no DROP, no RENAME, no type change.
- Onboarding state is per-Telegram-user so it persists across devices.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_metrics_snapshot' AND column_name='scans_bsc') THEN
    ALTER TABLE daily_metrics_snapshot ADD COLUMN scans_bsc int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_metrics_snapshot' AND column_name='scans_base') THEN
    ALTER TABLE daily_metrics_snapshot ADD COLUMN scans_base int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_metrics_snapshot' AND column_name='scans_other') THEN
    ALTER TABLE daily_metrics_snapshot ADD COLUMN scans_other int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_metrics_snapshot' AND column_name='whales_flagged') THEN
    ALTER TABLE daily_metrics_snapshot ADD COLUMN whales_flagged int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_metrics_snapshot' AND column_name='scam_flags_new') THEN
    ALTER TABLE daily_metrics_snapshot ADD COLUMN scam_flags_new int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_metrics_snapshot' AND column_name='active_users_7d') THEN
    ALTER TABLE daily_metrics_snapshot ADD COLUMN active_users_7d int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_metrics_snapshot' AND column_name='tokens_indexed') THEN
    ALTER TABLE daily_metrics_snapshot ADD COLUMN tokens_indexed int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='daily_metrics_snapshot' AND column_name='payout_amount_usd') THEN
    ALTER TABLE daily_metrics_snapshot ADD COLUMN payout_amount_usd numeric NOT NULL DEFAULT 0;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS user_onboarding_state (
  telegram_user_id text PRIMARY KEY,
  step_completed   int NOT NULL DEFAULT 0,
  first_seen_at    timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  skipped_at       timestamptz,
  hints_dismissed  jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_onboarding_state ENABLE ROW LEVEL SECURITY;
