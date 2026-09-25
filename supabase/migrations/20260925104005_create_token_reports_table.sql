/*
# Create token_reports table for user-submitted scam reports

## Purpose
Persist user-submitted reports about dangerous tokens (red verdicts in the
scanner). Feeds moderator review and drives an automatic promotion of a
contract to `contract_blacklist` once enough distinct users have flagged it.

## New Tables

### token_reports
- `id` (uuid, primary key)
- `telegram_user_id` (text, not null) — Telegram user id of the reporter.
- `contract_address` (text, not null) — normalized lowercase contract address.
- `network` (text, not null) — 'TON', 'BSC', or 'BASE'.
- `token_symbol` (text) — token ticker snapshot for quick moderator triage.
- `risk_score` (integer, not null, default 0) — risk score at report time.
- `reason_code` (text, not null) — one of
  'honeypot' | 'rugpull' | 'scam_socials' | 'spam' | 'other'.
- `reason_text` (text) — free-form comment, up to 500 chars.
- `created_at` (timestamptz, default now())

## Constraints
- Unique on (telegram_user_id, contract_address, network) — one report per
  user per token per network. Repeat submits are silently deduplicated.
- CHECK on reason_code allowed values.
- CHECK on reason_text length (<= 500).
- CHECK on risk_score between 0 and 100.

## Indexes
- idx_token_reports_address_network on (contract_address, network)
- idx_token_reports_created on (created_at)
- idx_token_reports_user on (telegram_user_id)

## Security
- RLS enabled on token_reports.
- No policies for anon / authenticated. Only service_role (server-side API
  route via SUPABASE_SERVICE_ROLE_KEY) can read/write. This matches the
  project convention for user-submitted safety data.

## Notes
1. contract_address is always stored lowercased by the server route.
2. The API route also inserts into contract_blacklist once a token crosses
   an internal report threshold; this table records the raw votes.
3. No retention job here — reports are cheap and useful for long-tail moderation.
*/

CREATE TABLE IF NOT EXISTS token_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text NOT NULL,
  contract_address text NOT NULL,
  network text NOT NULL,
  token_symbol text,
  risk_score integer NOT NULL DEFAULT 0,
  reason_code text NOT NULL,
  reason_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT token_reports_unique_user_contract UNIQUE (telegram_user_id, contract_address, network),
  CONSTRAINT token_reports_reason_code_check CHECK (
    reason_code IN ('honeypot', 'rugpull', 'scam_socials', 'spam', 'other')
  ),
  CONSTRAINT token_reports_reason_text_len CHECK (
    reason_text IS NULL OR char_length(reason_text) <= 500
  ),
  CONSTRAINT token_reports_risk_score_range CHECK (
    risk_score >= 0 AND risk_score <= 100
  ),
  CONSTRAINT token_reports_network_check CHECK (
    network IN ('TON', 'BSC', 'BASE')
  )
);

ALTER TABLE token_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_token_reports_address_network
  ON token_reports(contract_address, network);
CREATE INDEX IF NOT EXISTS idx_token_reports_created
  ON token_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_token_reports_user
  ON token_reports(telegram_user_id);
