-- token_metadata: canonical on-chain metadata (symbol, decimals) per token.
-- Used by whale portfolio to convert raw balances into human-readable amounts
-- and by radar/whales to display consistent symbols.

CREATE TABLE IF NOT EXISTS token_metadata (
  id TEXT PRIMARY KEY,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  symbol TEXT,
  decimals SMALLINT NOT NULL DEFAULT 18,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS token_metadata_network_address_idx
  ON token_metadata (network, address);

ALTER TABLE token_metadata ENABLE ROW LEVEL SECURITY;

-- Public metadata: any client may read it (data is on-chain public info).
CREATE POLICY "select_token_metadata"
  ON token_metadata FOR SELECT
  TO anon, authenticated
  USING (true);

-- Writes only through service role (bypasses RLS); no anon/authenticated write policies.
