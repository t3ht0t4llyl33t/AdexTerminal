-- ============================================================
-- Consolidated initial schema for Adex Database
-- Recreates all 12 migrations as the final state
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- ============================================================
-- 1. scanner_audit_logs
-- ============================================================
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

-- ============================================================
-- 2. scan_limits
-- ============================================================
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

-- ============================================================
-- 3. referral_claims
-- ============================================================
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

-- ============================================================
-- 4. support_knowledge_base
-- ============================================================
CREATE TABLE IF NOT EXISTS support_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'academy',
  lang text DEFAULT 'EN',
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_skb_embedding ON support_knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_skb_category ON support_knowledge_base (category);
ALTER TABLE support_knowledge_base ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. user_subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text UNIQUE NOT NULL,
  tier text NOT NULL DEFAULT 'free',
  pro_expiration_date timestamptz,
  language text NOT NULL DEFAULT 'EN',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_sub_expiration ON user_subscriptions (pro_expiration_date);
CREATE INDEX IF NOT EXISTS idx_user_sub_tg_id ON user_subscriptions (telegram_user_id);
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. chat_rate_limits
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text UNIQUE NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  muted_until timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_rate_tg_id ON chat_rate_limits (telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rate_muted ON chat_rate_limits (muted_until);
ALTER TABLE chat_rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. partner_pending_balances
-- ============================================================
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

-- ============================================================
-- 8. scout_registrations
-- ============================================================
CREATE TABLE IF NOT EXISTS scout_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text UNIQUE NOT NULL,
  is_scout boolean NOT NULL DEFAULT true,
  is_premium boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scout_tg_id ON scout_registrations (telegram_user_id);
ALTER TABLE scout_registrations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. radar_cache (only table with anon SELECT policy)
-- ============================================================
CREATE TABLE IF NOT EXISTS radar_cache (
  id text PRIMARY KEY DEFAULT 'latest',
  tokens jsonb NOT NULL DEFAULT '[]'::jsonb,
  whales jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'live',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE radar_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_radar_cache" ON radar_cache FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- 10. referral_codes
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text UNIQUE NOT NULL,
  referral_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ref_codes_tg_id ON referral_codes (telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_ref_codes_code ON referral_codes (referral_code);
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. trade_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS trade_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text UNIQUE NOT NULL,
  ton_service text NOT NULL DEFAULT 'dedust',
  evm_service text NOT NULL DEFAULT 'banana',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trade_settings_tg_id ON trade_settings (telegram_user_id);
ALTER TABLE trade_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. referral_payouts
-- ============================================================
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

-- ============================================================
-- 13. payment_transactions
-- ============================================================
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

-- ============================================================
-- 14. scan_cache
-- ============================================================
CREATE TABLE IF NOT EXISTS scan_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address text NOT NULL,
  network text NOT NULL,
  scan_result jsonb NOT NULL,
  verdict_key text,
  risk_score integer NOT NULL DEFAULT 0,
  is_dangerous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE scan_cache ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_scan_cache_address ON scan_cache(contract_address);
CREATE INDEX IF NOT EXISTS idx_scan_cache_updated ON scan_cache(updated_at);

-- ============================================================
-- 15. contract_blacklist
-- ============================================================
CREATE TABLE IF NOT EXISTS contract_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address text NOT NULL,
  network text NOT NULL,
  risk_score integer NOT NULL,
  reason text NOT NULL,
  token_symbol text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE contract_blacklist ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_blacklist_address ON contract_blacklist(contract_address);
CREATE INDEX IF NOT EXISTS idx_blacklist_created ON contract_blacklist(created_at);

-- ============================================================
-- Lockdown: revoke anon + authenticated on ALL tables
-- (except radar_cache which keeps its SELECT policy)
-- ============================================================
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Re-grant SELECT on radar_cache to anon (it's the only public-read table)
GRANT SELECT ON radar_cache TO anon, authenticated;

-- ============================================================
-- Cron jobs
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune_scanner_audit_logs') THEN
    PERFORM cron.schedule(
      'prune_scanner_audit_logs',
      '0 3 * * *',
      'DELETE FROM scanner_audit_logs WHERE created_at < now() - interval ''7 days'';'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune_scan_cache') THEN
    PERFORM cron.schedule(
      'prune_scan_cache',
      '0 3 * * *',
      $q$DELETE FROM scan_cache WHERE updated_at < now() - interval '3 days'$q$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune_contract_blacklist') THEN
    PERFORM cron.schedule(
      'prune_contract_blacklist',
      '30 3 * * *',
      $q$DELETE FROM contract_blacklist WHERE created_at < now() - interval '30 days'$q$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune_chat_rate_limits') THEN
    PERFORM cron.schedule(
      'prune_chat_rate_limits',
      '0 4 * * *',
      $q$DELETE FROM chat_rate_limits WHERE window_start < now() - interval '30 days' AND (muted_until IS NULL OR muted_until < now())$q$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune_old_payment_transactions') THEN
    PERFORM cron.schedule(
      'prune_old_payment_transactions',
      '30 4 * * *',
      $q$DELETE FROM payment_transactions WHERE created_at < now() - interval '365 days'$q$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune_old_referral_payouts') THEN
    PERFORM cron.schedule(
      'prune_old_referral_payouts',
      '30 4 * * *',
      $q$DELETE FROM referral_payouts WHERE created_at < now() - interval '365 days'$q$
    );
  END IF;
END $$;
