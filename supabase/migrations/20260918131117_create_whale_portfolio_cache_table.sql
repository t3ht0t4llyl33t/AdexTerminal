/*
# Create whale_portfolio_cache table

## Purpose
Server-side shared cache for the "whale magnifier" feature. When a PRO user clicks the
magnifier on a whale trade, the app fetches the whale's current token balance from TonAPI
(TON) or public EVM RPC (BSC / BASE). Without a shared cache, every click on the same whale
by any PRO user hits the external provider anew, wasting quota and risking rate-limit bans.

This table is a short-TTL, cross-user cache keyed by (network, token_address, wallet_address).
Any PRO user asking about the same whale+token combination within the freshness window
receives the cached snapshot instead of triggering a new external fetch.

## 1. New Tables
- `whale_portfolio_cache`
  - `id` (text, primary key) — deterministic composite key `network|token|wallet` (lowercase)
  - `network` (text, not null) — one of `TON`, `BSC`, `BASE`
  - `token_address` (text, not null) — lowercased token contract / jetton master address
  - `wallet_address` (text, not null) — lowercased whale wallet address
  - `total_tokens_held` (numeric, not null) — decoded token balance in human units
  - `total_position_value_usd` (numeric, not null) — cached USD value at snapshot time
  - `token_price_usd` (numeric, not null) — token price used to compute the value
  - `ok` (boolean, not null, default true) — false = negative cache (upstream failed / empty)
  - `updated_at` (timestamptz, not null, default now()) — when the snapshot was written

## 2. Indexes
- Primary key on `id` covers the exact-match lookup done by the whale portfolio route.
- Index on `updated_at` for cheap retention sweeps.

## 3. Security
- Row Level Security is ENABLED.
- No policies are defined. Only the server (which uses the service role key and bypasses RLS)
  reads or writes this table. The public `anon` / `authenticated` roles have no access, which
  is correct because these snapshots contain aggregated whale intelligence that only the
  server-side portfolio route is allowed to expose (and only to PRO users).

## 4. Notes
1. Retention is handled by the existing pg_cron sweep — a follow-up job may be added to purge
   rows older than 30 minutes, but for now stale rows are simply overwritten on next miss and
   are microscopic in size.
2. The cache is intentionally coarse-grained per (network, token, wallet). Trade-specific data
   (trade_amount_usd, trade_type, ai_verdict) is recomputed per request in application code
   because it depends on the caller's context, not on the whale's on-chain state.
*/

CREATE TABLE IF NOT EXISTS whale_portfolio_cache (
  id text PRIMARY KEY,
  network text NOT NULL,
  token_address text NOT NULL,
  wallet_address text NOT NULL,
  total_tokens_held numeric NOT NULL DEFAULT 0,
  total_position_value_usd numeric NOT NULL DEFAULT 0,
  token_price_usd numeric NOT NULL DEFAULT 0,
  ok boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whale_portfolio_cache_updated_at_idx
  ON whale_portfolio_cache (updated_at DESC);

ALTER TABLE whale_portfolio_cache ENABLE ROW LEVEL SECURITY;
