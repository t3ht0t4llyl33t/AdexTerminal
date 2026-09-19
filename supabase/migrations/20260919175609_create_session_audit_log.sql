/*
# Session audit log

## Purpose
Records every verified Telegram user session (via signed initData) so that
`/api/public-stats` and the `/impact` page can compute the "active users"
metric (last 24h and last 7d) without noisy proxies like scan counts.

## New Tables
- `session_audit_log`
  - `telegram_user_id` (text, primary key) — Telegram numeric id, stored as text
  - `username` (text, nullable)
  - `language_code` (text, nullable, e.g. `en`, `ru`)
  - `first_seen_at` (timestamptz, default now())
  - `last_seen_at` (timestamptz, default now()) — bumped on every verified request

## Indexes
- `session_audit_log_last_seen_idx` on `last_seen_at DESC`
  for fast active-users queries.

## Security
1. RLS enabled.
2. No `anon`/`authenticated` policies added: the anon-key client must NEVER
   read or write this table. Writes and reads happen exclusively from
   server-side code using the service role key (which bypasses RLS).
   With RLS on and zero policies, anon/authenticated are locked out —
   this is the intended posture for a session-audit table.
*/

CREATE TABLE IF NOT EXISTS session_audit_log (
  telegram_user_id text PRIMARY KEY,
  username text,
  language_code text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_audit_log_last_seen_idx
  ON session_audit_log (last_seen_at DESC);

ALTER TABLE session_audit_log ENABLE ROW LEVEL SECURITY;
