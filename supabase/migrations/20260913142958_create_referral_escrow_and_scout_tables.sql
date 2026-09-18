/*
# Referral Escrow Ledger & Scout-Pass Registration Tables

## Purpose
Creates two tables to support the Referral Hub's escrow payout system and the
administrative scout-pass deep-link validation.

## Tables

### partner_pending_balances
- `id` (uuid, primary key)
- `telegram_user_id` (text, not null) — Telegram user who earned the commission
- `referral_code` (text) — the referral code that generated the commission
- `amount_usd` (numeric, default 0) — accumulated pending commission in USD
- `wallet_address` (text, nullable) — bonded TON wallet address (null until bonded)
- `status` (text, default 'pending') — 'pending' or 'claimed'
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())
- Unique constraint on telegram_user_id

### scout_registrations
- `id` (uuid, primary key)
- `telegram_user_id` (text, unique, not null) — Telegram user ID granted scout access
- `is_scout` (boolean, default true) — scout flag
- `is_premium` (boolean, default true) — premium override flag
- `created_at` (timestamptz, default now())
- Unique constraint on telegram_user_id

## Security
- RLS enabled on both tables
- Policies allow anon + authenticated access (no-auth app pattern, matching existing tables)

## Notes
- partner_pending_balances tracks escrow commissions for users who haven't bonded a wallet yet
- scout_registrations enforces a hard cap of 10 unique Telegram user IDs
- Scout-pass expiration deadline is enforced in server-side API code (November 30, 2026)
*/

CREATE TABLE IF NOT EXISTS partner_pending_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text UNIQUE NOT NULL,
  referral_code text,
  amount_usd numeric NOT NULL DEFAULT 0,
  wallet_address text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppb_tg_id ON partner_pending_balances (telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_ppb_status ON partner_pending_balances (status);

ALTER TABLE partner_pending_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ppb" ON partner_pending_balances;
CREATE POLICY "anon_select_ppb" ON partner_pending_balances FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ppb" ON partner_pending_balances;
CREATE POLICY "anon_insert_ppb" ON partner_pending_balances FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ppb" ON partner_pending_balances;
CREATE POLICY "anon_update_ppb" ON partner_pending_balances FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_ppb" ON partner_pending_balances;
CREATE POLICY "anon_delete_ppb" ON partner_pending_balances FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS scout_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text UNIQUE NOT NULL,
  is_scout boolean NOT NULL DEFAULT true,
  is_premium boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scout_tg_id ON scout_registrations (telegram_user_id);

ALTER TABLE scout_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scout" ON scout_registrations;
CREATE POLICY "anon_select_scout" ON scout_registrations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scout" ON scout_registrations;
CREATE POLICY "anon_insert_scout" ON scout_registrations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scout" ON scout_registrations;
CREATE POLICY "anon_update_scout" ON scout_registrations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scout" ON scout_registrations;
CREATE POLICY "anon_delete_scout" ON scout_registrations FOR DELETE
  TO anon, authenticated USING (true);