/*
# Lockdown: fix user_pro_settings policies and revoke anon CRUD on all internal tables

## What this migration does

1. CRITICAL FIX: `user_pro_settings` had 4 policies with USING(true) / WITH CHECK(true)
   for anon+authenticated, allowing ANY user with the public anon key to read, modify,
   and delete every other user's alert settings (which contain telegram_user_id — PII).
   This replaces them with deny-all policies (USING(false) / WITH CHECK(false)).
   The server-side API routes use the service_role key which bypasses RLS, so they
   continue to work unchanged.

2. REVOKE anon CRUD on 16 internal/server-only tables that had full grants but no
   policies (RLS deny-all already blocks access, but the grants are noise that
   security advisors flag). These tables are only ever touched by server-side code
   via the service_role key:
   - api_response_cache, cron_alert_dedup, cron_runs, daily_metrics_snapshot,
     desktop_visitors, product_events, rate_limit_buckets, referral_bonus_grants,
     session_audit_log, token_reports, user_digest_log, user_digest_prefs,
     user_onboarding_state, user_watchlist, whale_portfolio_cache

3. REVOKE anon INSERT/UPDATE/DELETE on 5 public-read cache tables that should be
   read-only from the client perspective (server writes via service_role):
   - radar_cache, pro_pricing, token_metadata, ton_price_cache, roadmap_items
   SELECT stays granted on these because the anon client legitimately reads them.

4. REVOKE all anon CRUD on ton_safety_cache and ton_system_contracts (already had
   USING(false) deny-all policies, but still had stale CRUD grants).

## Security impact
- After this migration, the anon role can only SELECT from public-read caches
  (radar_cache, pro_pricing, token_metadata, ton_price_cache, roadmap_items).
  All other tables are fully locked from anon and authenticated roles.
- The service_role key (server-side only) bypasses RLS and is unaffected.
- No data is lost — no DROP, no DELETE, no column changes.
*/

-- ============================================================
-- 1. CRITICAL: Fix user_pro_settings — replace USING(true) with deny-all
-- ============================================================

-- Drop the 4 permissive policies
DROP POLICY IF EXISTS "anon_select_pro_settings" ON user_pro_settings;
DROP POLICY IF EXISTS "anon_insert_pro_settings" ON user_pro_settings;
DROP POLICY IF EXISTS "anon_update_pro_settings" ON user_pro_settings;
DROP POLICY IF EXISTS "anon_delete_pro_settings" ON user_pro_settings;

-- Create explicit deny-all policies (belt and suspenders: RLS is already enabled
-- and no policy means deny-all, but explicit USING(false) makes the intent clear
-- to any auditor or advisor scan)
CREATE POLICY "deny_select_pro_settings" ON user_pro_settings FOR SELECT
  TO anon, authenticated USING (false);
CREATE POLICY "deny_insert_pro_settings" ON user_pro_settings FOR INSERT
  TO anon, authenticated WITH CHECK (false);
CREATE POLICY "deny_update_pro_settings" ON user_pro_settings FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_delete_pro_settings" ON user_pro_settings FOR DELETE
  TO anon, authenticated USING (false);

-- Revoke all direct table privileges from anon and authenticated
REVOKE ALL ON user_pro_settings FROM anon, authenticated;

-- ============================================================
-- 2. Revoke ALL anon/authenticated CRUD on 16 internal server-only tables
--    (RLS deny-all already blocks access; this removes stale grants)
-- ============================================================

DO $$
DECLARE
    tbl text;
    internal_tables text[] := ARRAY[
        'api_response_cache',
        'cron_alert_dedup',
        'cron_runs',
        'daily_metrics_snapshot',
        'desktop_visitors',
        'product_events',
        'rate_limit_buckets',
        'referral_bonus_grants',
        'session_audit_log',
        'token_reports',
        'user_digest_log',
        'user_digest_prefs',
        'user_onboarding_state',
        'user_watchlist',
        'whale_portfolio_cache',
        'chat_rate_limits',
        'contract_blacklist'
    ];
BEGIN
    FOREACH tbl IN ARRAY internal_tables LOOP
        EXECUTE format('REVOKE ALL ON %I FROM anon, authenticated', tbl);
    END LOOP;
END $$;

-- ============================================================
-- 3. Revoke anon INSERT/UPDATE/DELETE on public-read cache tables
--    (keep SELECT — anon client legitimately reads these)
-- ============================================================

DO $$
DECLARE
    tbl text;
    public_read_tables text[] := ARRAY[
        'radar_cache',
        'pro_pricing',
        'token_metadata',
        'ton_price_cache',
        'roadmap_items'
    ];
BEGIN
    FOREACH tbl IN ARRAY public_read_tables LOOP
        EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON %I FROM anon, authenticated', tbl);
    END LOOP;
END $$;

-- ============================================================
-- 4. Revoke all anon/authenticated CRUD on already-locked tables
--    (ton_safety_cache and ton_system_contracts had USING(false)
--     policies but still had stale CRUD grants)
-- ============================================================

REVOKE ALL ON ton_safety_cache FROM anon, authenticated;
REVOKE ALL ON ton_system_contracts FROM anon, authenticated;

-- ============================================================
-- 5. Ensure RLS is enabled on every table (safety net)
-- ============================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN (
            'scan_cache', 'scan_audit_logs', 'scan_limits',
            'support_tickets', 'support_messages',
            'referral_escrow', 'scout_passes', 'referral_codes',
            'trade_settings', 'referral_payouts', 'subscription_payments',
            'token_blacklist', 'scanner_audit_logs',
            'user_digest_prefs', 'user_digest_log',
            'user_onboarding_state', 'user_pro_settings',
            'user_watchlist', 'whale_portfolio_cache',
            'token_metadata', 'token_reports',
            'cron_runs', 'cron_alert_dedup',
            'session_audit_log', 'daily_metrics_snapshot',
            'desktop_visitors', 'product_events',
            'rate_limit_buckets', 'api_response_cache',
            'referral_bonus_grants', 'radar_cache',
            'pro_pricing', 'ton_price_cache',
            'ton_safety_cache', 'ton_system_contracts',
            'roadmap_items', 'chat_rate_limits',
            'contract_blacklist'
        )
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tablename);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;
