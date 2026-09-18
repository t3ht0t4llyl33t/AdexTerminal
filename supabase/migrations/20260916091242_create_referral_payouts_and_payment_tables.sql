/*
# Referral Payouts & Payment Transactions Tables

## Purpose
Creates two tables to support the hybrid payment system:
1. `referral_payouts` — tracks individual referral commission payout transactions
   (TON Connect on-chain payouts or Crypto Pay internal transfers)
2. `payment_transactions` — audit log for all incoming payments

## Tables

### referral_payouts
- `id` (uuid, primary key)
- `payer_tg_id` (text, not null) — the user who made the payment
- `referrer_tg_id` (text, not null) — the referrer who receives the 20% commission
- `payment_method` (text, not null) — 'ton_connect' | 'crypto_pay'
- `payment_amount_usd` (numeric) — original payment amount in USD
- `commission_usd` (numeric) — 20% commission in USD
- `commission_ton` (numeric, nullable) — commission in TON (for TON Connect payouts)
- `status` (text, default 'pending') — 'pending' | 'sent' | 'failed'
- `tx_hash` (text, nullable) — blockchain tx hash for TON Connect payouts
- `crypto_pay_transfer_id` (text, nullable) — Crypto Pay transfer ID
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)

### payment_transactions
- `id` (uuid, primary key)
- `telegram_user_id` (text, not null) — the paying user
- `payment_method` (text, not null) — 'ton_connect' | 'crypto_pay'
- `amount_usd` (numeric) — payment amount in USD
- `amount_ton` (numeric, nullable) — payment amount in TON
- `tx_hash` (text, nullable) — blockchain tx hash
- `invoice_id` (text, nullable) — Crypto Pay invoice ID
- `status` (text, default 'pending') — 'pending' | 'confirmed' | 'failed'
- `referrer_tg_id` (text, nullable) — referrer's Telegram ID if applicable
- `commission_paid` (boolean, default false) — whether referral commission was paid
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)

## Security
- RLS enabled on both tables
- Policies allow anon + authenticated access (no-auth app pattern, matching existing tables)
*/

CREATE TABLE IF NOT EXISTS referral_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_tg_id text NOT NULL,
  referrer_tg_id text NOT NULL,
  payment_method text NOT NULL,
  payment_amount_usd numeric NOT NULL DEFAULT 0,
  commission_usd numeric NOT NULL DEFAULT 0,
  commission_ton numeric,
  status text NOT NULL DEFAULT 'pending',
  tx_hash text,
  crypto_pay_transfer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rp_payer ON referral_payouts (payer_tg_id);
CREATE INDEX IF NOT EXISTS idx_rp_referrer ON referral_payouts (referrer_tg_id);
CREATE INDEX IF NOT EXISTS idx_rp_status ON referral_payouts (status);

ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rp" ON referral_payouts;
CREATE POLICY "anon_select_rp" ON referral_payouts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rp" ON referral_payouts;
CREATE POLICY "anon_insert_rp" ON referral_payouts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rp" ON referral_payouts;
CREATE POLICY "anon_update_rp" ON referral_payouts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rp" ON referral_payouts;
CREATE POLICY "anon_delete_rp" ON referral_payouts FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text NOT NULL,
  payment_method text NOT NULL,
  amount_usd numeric NOT NULL DEFAULT 0,
  amount_ton numeric,
  tx_hash text,
  invoice_id text,
  status text NOT NULL DEFAULT 'pending',
  referrer_tg_id text,
  commission_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pt_tg_id ON payment_transactions (telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_pt_status ON payment_transactions (status);
CREATE INDEX IF NOT EXISTS idx_pt_invoice ON payment_transactions (invoice_id);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pt" ON payment_transactions;
CREATE POLICY "anon_select_pt" ON payment_transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pt" ON payment_transactions;
CREATE POLICY "anon_insert_pt" ON payment_transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pt" ON payment_transactions;
CREATE POLICY "anon_update_pt" ON payment_transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pt" ON payment_transactions;
CREATE POLICY "anon_delete_pt" ON payment_transactions FOR DELETE
  TO anon, authenticated USING (true);