/*
# Scanner Audit Tables & Daily Scan Limits

## Purpose
Creates three tables to support the Security Vault scanner feature:
1. `scanner_audit_logs` — stores contract audit results with a 7-day TTL
2. `scan_limits` — tracks daily free-tier scan counts per Telegram user
3. `referral_claims` — enforces unique one-time referral bonus claims

## Tables

### scanner_audit_logs
- `id` (uuid, primary key)
- `contract_address` (text, not null) — the scanned token contract address
- `network` (text, not null) — TON, BSC, or BASE
- `audit_result` (jsonb) — full audit metadata (LP status, honeypot, dev cluster, etc.)
- `apex_ai_verdict` (text) — AI-generated plain text summary
- `created_at` (timestamptz, default now()) — used for 7-day pruning

### scan_limits
- `id` (uuid, primary key)
- `telegram_user_id` (text, unique, not null) — Telegram user identifier
- `scan_count` (integer, default 0) — scans used in current 24h window
- `window_start` (timestamptz, default now()) — start of current 24h rolling window
- `bonus_scans` (integer, default 0) — extra scans from referral rewards
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### referral_claims
- `id` (uuid, primary key)
- `referrer_tg_id` (text, not null) — the user who shared the referral link
- `referred_tg_id` (text, not null) — the new user who clicked the link
- `referral_token` (text, not null) — the unique referral token from the link
- `claimed_at` (timestamptz, default now()) — when the bonus was claimed
- Unique constraint on `referred_tg_id` ensures one-time-only referral bonus per user

## Security
- RLS enabled on all tables
- Policies allow anon + authenticated access (no-auth app pattern)

## Pruning
- pg_cron job purges scanner_audit_logs older than 7 days, running daily at 3:00 AM UTC
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Scanner audit logs table
CREATE TABLE IF NOT EXISTS scanner_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address text NOT NULL,
  network text NOT NULL,
  audit_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  apex_ai_verdict text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scanner_audit_address ON scanner_audit_logs (contract_address);
CREATE INDEX IF NOT EXISTS idx_scanner_audit_created ON scanner_audit_logs (created_at);

ALTER TABLE scanner_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scanner_audit" ON scanner_audit_logs;
CREATE POLICY "anon_select_scanner_audit" ON scanner_audit_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scanner_audit" ON scanner_audit_logs;
CREATE POLICY "anon_insert_scanner_audit" ON scanner_audit_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scanner_audit" ON scanner_audit_logs;
CREATE POLICY "anon_update_scanner_audit" ON scanner_audit_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scanner_audit" ON scanner_audit_logs;
CREATE POLICY "anon_delete_scanner_audit" ON scanner_audit_logs FOR DELETE
  TO anon, authenticated USING (true);

-- Scan limits table (daily free-tier tracking)
CREATE TABLE IF NOT EXISTS scan_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text UNIQUE NOT NULL,
  scan_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  bonus_scans integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_limits_tg_id ON scan_limits (telegram_user_id);

ALTER TABLE scan_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scan_limits" ON scan_limits;
CREATE POLICY "anon_select_scan_limits" ON scan_limits FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scan_limits" ON scan_limits;
CREATE POLICY "anon_insert_scan_limits" ON scan_limits FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scan_limits" ON scan_limits;
CREATE POLICY "anon_update_scan_limits" ON scan_limits FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scan_limits" ON scan_limits;
CREATE POLICY "anon_delete_scan_limits" ON scan_limits FOR DELETE
  TO anon, authenticated USING (true);

-- Referral claims table (anti-cheat: one bonus per Telegram user)
CREATE TABLE IF NOT EXISTS referral_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_tg_id text NOT NULL,
  referred_tg_id text NOT NULL,
  referral_token text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_claims_referred_unique ON referral_claims (referred_tg_id);
CREATE INDEX IF NOT EXISTS idx_referral_claims_referrer ON referral_claims (referrer_tg_id);

ALTER TABLE referral_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_referral_claims" ON referral_claims;
CREATE POLICY "anon_select_referral_claims" ON referral_claims FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_referral_claims" ON referral_claims;
CREATE POLICY "anon_insert_referral_claims" ON referral_claims FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_referral_claims" ON referral_claims;
CREATE POLICY "anon_delete_referral_claims" ON referral_claims FOR DELETE
  TO anon, authenticated USING (true);

-- pg_cron job: purge scanner_audit_logs older than 7 days, daily at 3:00 AM UTC
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'prune_scanner_audit_logs'
  ) THEN
    PERFORM cron.schedule(
      'prune_scanner_audit_logs',
      '0 3 * * *',
      'DELETE FROM scanner_audit_logs WHERE created_at < now() - interval ''7 days'';'
    );
  END IF;
END
$$;
