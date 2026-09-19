-- TON safety cache: 6-hour TTL per master address
CREATE TABLE IF NOT EXISTS ton_safety_cache (
  master_address text PRIMARY KEY,
  score integer NOT NULL DEFAULT 0,
  mint_status text NOT NULL DEFAULT 'unknown',
  owner_status text NOT NULL DEFAULT 'unknown',
  lp_total_usd numeric NOT NULL DEFAULT 0,
  lp_dex_list text[] NOT NULL DEFAULT '{}',
  non_system_top_holder_pct numeric NOT NULL DEFAULT 0,
  jetton_age_days integer,
  verified_by_tonapi boolean NOT NULL DEFAULT false,
  raw_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ton_safety_cache_updated_at_idx
  ON ton_safety_cache (updated_at DESC);

ALTER TABLE ton_safety_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ton_safety_cache_no_read" ON ton_safety_cache
  FOR SELECT TO authenticated, anon USING (false);
CREATE POLICY "ton_safety_cache_no_write" ON ton_safety_cache
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "ton_safety_cache_no_update" ON ton_safety_cache
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "ton_safety_cache_no_delete" ON ton_safety_cache
  FOR DELETE TO authenticated, anon USING (false);

-- TON system contracts: STON.fi / DeDust / bridges — treat as non-insider holders
CREATE TABLE IF NOT EXISTS ton_system_contracts (
  address text PRIMARY KEY,
  category text NOT NULL,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ton_system_contracts_active_idx
  ON ton_system_contracts (is_active) WHERE is_active = true;

ALTER TABLE ton_system_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ton_system_contracts_no_read" ON ton_system_contracts
  FOR SELECT TO authenticated, anon USING (false);
CREATE POLICY "ton_system_contracts_no_write" ON ton_system_contracts
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "ton_system_contracts_no_update" ON ton_system_contracts
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "ton_system_contracts_no_delete" ON ton_system_contracts
  FOR DELETE TO authenticated, anon USING (false);

INSERT INTO ton_system_contracts (address, category, label) VALUES
  ('EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt', 'stonfi_router', 'STON.fi Router V1'),
  ('EQBcbadMr6nMNTAesaZzKlj4tXf3rr7g-4qm1EEZR6Yz9DrK', 'stonfi_router', 'STON.fi Router V2 (Omni)'),
  ('EQCJ7SGzYAaCoy9SmA9YnwXpjuLd0v5D7dNhWNhE24uZ9MvZ', 'stonfi_pool_admin', 'STON.fi Pool Admin'),
  ('EQBfBWT7X2BHg9tXAxzhz2aKiNTU1tpt5NsiK0uSDW_YAJ67', 'dedust_vault', 'DeDust Native Vault'),
  ('EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o83S', 'dedust_factory', 'DeDust Factory'),
  ('EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez', 'ton_bridge', 'TON <-> ETH Bridge'),
  ('EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi', 'usdt_master', 'USDT Jetton Master')
ON CONFLICT (address) DO NOTHING;
