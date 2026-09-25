/*
# Create api_response_cache table

Centralized API response cache for external API calls (GoPlus, GeckoTerminal,
CoinGecko, TonAPI). Stores raw JSON responses keyed by a deterministic cache key,
with an expiry timestamp. Only the service role can read/write — the anon and
authenticated roles get no policies, so RLS effectively denies all client-side
access.

1. New Tables
- `api_response_cache`
  - `key` (text, primary key) — deterministic cache key (URL + params hash)
  - `payload` (jsonb) — raw API response JSON
  - `expires_at` (timestamptz) — when this entry becomes stale
  - `created_at` (timestamptz) — when the entry was written
  - `updated_at` (timestamptz) — when the entry was last refreshed

2. Security
- RLS enabled on `api_response_cache`.
- NO policies for anon or authenticated roles — only the service role
  (which bypasses RLS) can read and write. This prevents any client-side
  access to cached API responses.

3. Indexes
- `idx_api_response_cache_expires_at` on `expires_at` for cleanup queries.
*/

CREATE TABLE IF NOT EXISTS api_response_cache (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_response_cache ENABLE ROW LEVEL SECURITY;

-- No policies: only service role (bypasses RLS) can access.
-- anon and authenticated roles get zero rows by default.

CREATE INDEX IF NOT EXISTS idx_api_response_cache_expires_at
  ON api_response_cache (expires_at);
