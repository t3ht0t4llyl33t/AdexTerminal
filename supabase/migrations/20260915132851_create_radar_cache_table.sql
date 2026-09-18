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

-- No INSERT/UPDATE/DELETE policies: only the service role (server-side) can write.
