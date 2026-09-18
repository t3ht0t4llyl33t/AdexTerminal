/*
# Lockdown RLS: revoke anon access, move vector extension

## Problem
All 8 tables currently grant full CRUD (SELECT, INSERT, UPDATE, DELETE) to the `anon` role
with `USING (true)` / `WITH CHECK (true)` policies. This means anyone with the public anon
key (which is embedded in the client-side app) can directly read, modify, or delete any
row in any table — including scan limits, user subscriptions, and partner pending balances.

## Changes

### 1. Move `vector` extension from `public` to `extensions` schema
- Drops the extension from `public` and recreates it in `extensions` (Supabase default).
- The `support_knowledge_base.embedding` column is of type `vector` and continues to work.

### 2. Revoke ALL privileges from `anon` on every table
- `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;`
- The `anon` role can no longer read or write any table directly via the Data API.
- The `authenticated` role retains access for future use if auth is added.

### 3. Drop all permissive `USING (true)` policies
- Every existing policy on every table used `USING (true)` which means "allow all rows".
- These are dropped. Tables remain RLS-enabled (locked down) with no policies.
- All data access now goes through Next.js API routes using the service role key,
  which bypasses RLS entirely — the browser never talks to Supabase directly.

### 4. Keep `authenticated` policies for future use
- If email/password auth is added later, proper ownership-scoped policies can be created.
- For now, `authenticated` also loses direct access to prevent any half-implemented flow.

## Security impact
- Browser → Supabase Data API: BLOCKED (anon has no privileges)
- Browser → Next.js API → Supabase (service role): ALLOWED (service role bypasses RLS)
- This is the correct architecture for a Telegram Mini App without Supabase Auth.

## Notes
1. The app's API routes (`/api/scanner`, `/api/referral-escrow`, etc.) use the service
   role key via `process.env.SUPABASE_SERVICE_ROLE_KEY` and are unaffected by RLS.
2. Two routes (`/api/scanner` and `/api/cron/subscription-check`) currently use the anon
   key — they will be updated to use the service role key in a follow-up code change.
3. No data is lost. Only access patterns change.
*/

-- 1. Move vector extension to extensions schema
DROP EXTENSION IF EXISTS vector CASCADE;
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- 2. Revoke ALL privileges from anon on all public tables
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

-- 3. Drop all existing permissive policies (they all use USING(true))
-- scanner_audit_logs
DROP POLICY IF EXISTS "anon_select_scanner_audit" ON scanner_audit_logs;
DROP POLICY IF EXISTS "anon_insert_scanner_audit" ON scanner_audit_logs;
DROP POLICY IF EXISTS "anon_update_scanner_audit" ON scanner_audit_logs;
DROP POLICY IF EXISTS "anon_delete_scanner_audit" ON scanner_audit_logs;

-- scan_limits
DROP POLICY IF EXISTS "anon_select_scan_limits" ON scan_limits;
DROP POLICY IF EXISTS "anon_insert_scan_limits" ON scan_limits;
DROP POLICY IF EXISTS "anon_update_scan_limits" ON scan_limits;
DROP POLICY IF EXISTS "anon_delete_scan_limits" ON scan_limits;

-- referral_claims
DROP POLICY IF EXISTS "anon_select_referral_claims" ON referral_claims;
DROP POLICY IF EXISTS "anon_insert_referral_claims" ON referral_claims;
DROP POLICY IF EXISTS "anon_delete_referral_claims" ON referral_claims;

-- support_knowledge_base
DROP POLICY IF EXISTS "anon_select_skb" ON support_knowledge_base;
DROP POLICY IF EXISTS "anon_insert_skb" ON support_knowledge_base;
DROP POLICY IF EXISTS "anon_update_skb" ON support_knowledge_base;
DROP POLICY IF EXISTS "anon_delete_skb" ON support_knowledge_base;

-- user_subscriptions
DROP POLICY IF EXISTS "anon_select_user_sub" ON user_subscriptions;
DROP POLICY IF EXISTS "anon_insert_user_sub" ON user_subscriptions;
DROP POLICY IF EXISTS "anon_update_user_sub" ON user_subscriptions;
DROP POLICY IF EXISTS "anon_delete_user_sub" ON user_subscriptions;

-- chat_rate_limits
DROP POLICY IF EXISTS "anon_select_chat_rate" ON chat_rate_limits;
DROP POLICY IF EXISTS "anon_insert_chat_rate" ON chat_rate_limits;
DROP POLICY IF EXISTS "anon_update_chat_rate" ON chat_rate_limits;
DROP POLICY IF EXISTS "anon_delete_chat_rate" ON chat_rate_limits;

-- partner_pending_balances
DROP POLICY IF EXISTS "anon_select_ppb" ON partner_pending_balances;
DROP POLICY IF EXISTS "anon_insert_ppb" ON partner_pending_balances;
DROP POLICY IF EXISTS "anon_update_ppb" ON partner_pending_balances;
DROP POLICY IF EXISTS "anon_delete_ppb" ON partner_pending_balances;

-- scout_registrations
DROP POLICY IF EXISTS "anon_select_scout" ON scout_registrations;
DROP POLICY IF EXISTS "anon_insert_scout" ON scout_registrations;
DROP POLICY IF EXISTS "anon_update_scout" ON scout_registrations;
DROP POLICY IF EXISTS "anon_delete_scout" ON scout_registrations;

-- 4. Revoke from authenticated as well (no auth flow implemented)
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated;

-- 5. Ensure RLS stays enabled on all tables
ALTER TABLE scanner_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_pending_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_registrations ENABLE ROW LEVEL SECURITY;
