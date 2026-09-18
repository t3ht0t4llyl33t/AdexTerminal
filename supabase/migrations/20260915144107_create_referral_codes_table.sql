/*
# Referral Codes Table

## Purpose
Stores a unique referral code per Telegram user, enabling the Partners
referral program. Each user gets exactly one code, generated on first access.

## Tables
### referral_codes
- id (uuid, primary key)
- telegram_user_id (text, unique, not null) — Telegram user who owns the code
- referral_code (text, unique, not null) — the unique shareable code
- created_at (timestamptz, default now())

## Security
- RLS enabled
- Policies allow anon + authenticated access (no-auth app pattern, matching existing tables)
*/

CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text UNIQUE NOT NULL,
  referral_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ref_codes_tg_id ON referral_codes (telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_ref_codes_code ON referral_codes (referral_code);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ref_codes" ON referral_codes;
CREATE POLICY "anon_select_ref_codes" ON referral_codes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ref_codes" ON referral_codes;
CREATE POLICY "anon_insert_ref_codes" ON referral_codes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ref_codes" ON referral_codes;
CREATE POLICY "anon_update_ref_codes" ON referral_codes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
