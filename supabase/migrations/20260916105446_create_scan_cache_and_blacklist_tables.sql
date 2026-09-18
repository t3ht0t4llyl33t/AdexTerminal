/*
# Create scan_cache and contract_blacklist tables

## Purpose
- Cache scan results in the database so repeated scans of the same contract
  are served from the cache instead of calling external APIs (GoPlus/GeckoTerminal).
- Maintain a blacklist of dangerous contracts (honeypot, high risk score)
  derived from scan results, with automatic cleanup after 30 days.

## New Tables

### scan_cache
- `id` (uuid, primary key)
- `contract_address` (text, not null) — lowercased address
- `network` (text, not null) — 'TON', 'BSC', or 'BASE'
- `scan_result` (jsonb, not null) — full SecurityScan object
- `verdict_key` (text) — verdict key
- `risk_score` (integer, not null, default 0)
- `is_dangerous` (boolean, not null, default false) — true if honeypot or riskScore >= 60
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### contract_blacklist
- `id` (uuid, primary key)
- `contract_address` (text, not null) — lowercased address
- `network` (text, not null)
- `risk_score` (integer, not null)
- `reason` (text, not null) — 'honeypot' or 'high_risk_score'
- `token_symbol` (text)
- `created_at` (timestamptz, default now())

## Indexes
- idx_scan_cache_address on scan_cache(contract_address)
- idx_scan_cache_updated on scan_cache(updated_at)
- idx_blacklist_address on contract_blacklist(contract_address)
- idx_blacklist_created on contract_blacklist(created_at)

## RLS
- Both tables: RLS enabled, no policies for anon/authenticated.
  Only service_role can access (server-side API routes).

## Retention
- scan_cache: rows older than 7 days pruned daily at 3:00 UTC via pg_cron.
- contract_blacklist: rows older than 30 days pruned daily at 3:30 UTC via pg_cron.

## Notes
1. scan_cache replaces the in-memory scannerCache Map for cross-instance sharing.
2. contract_blacklist is derived from scan_cache: any scan with is_dangerous=true
   is also inserted into the blacklist.
3. Neither table grows unboundedly: scan_cache capped at 7 days, blacklist at 30 days.
*/

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'prune_scan_cache'
  ) THEN
    PERFORM cron.schedule(
      'prune_scan_cache',
      '0 3 * * *',
      $q$DELETE FROM scan_cache WHERE updated_at < now() - interval '7 days'$q$
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'prune_contract_blacklist'
  ) THEN
    PERFORM cron.schedule(
      'prune_contract_blacklist',
      '30 3 * * *',
      $q$DELETE FROM contract_blacklist WHERE created_at < now() - interval '30 days'$q$
    );
  END IF;
END $$;
