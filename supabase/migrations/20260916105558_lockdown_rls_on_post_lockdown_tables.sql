/*
# Lockdown RLS on 4 tables created after the main lockdown migration

## Problem
The lockdown migration (20260915120000) revoked anon/authenticated privileges
on all tables that existed at that time. But 4 tables created AFTER that
migration retained their permissive anon CRUD policies:
- referral_codes
- trade_settings
- referral_payouts (FINANCIAL DATA)
- payment_transactions (FINANCIAL DATA)

Anyone with the anon key (embedded in the frontend) could read, insert,
update, and delete records in these tables — including financial records.

## Changes
1. Revoke ALL privileges from anon and authenticated on all 4 tables.
2. Drop all existing permissive policies on these tables.
3. RLS remains enabled (deny-by-default). Only service_role can access.

## Security Impact
After this migration, all 4 tables are accessible ONLY via the service_role
key (used in server-side API routes). The browser/anon-key client can no
longer read or modify any data in these tables directly.

## Notes
1. This does NOT break the app — all access already goes through Next.js
   API routes that use the service_role key.
2. referral_codes: still readable/writable via /api/referral-stats route.
3. trade_settings: still readable/writable via /api/trade-settings route.
4. referral_payouts & payment_transactions: still managed via billing routes.
*/

-- referral_codes: drop policies + revoke
DROP POLICY IF EXISTS "anon_select_referral_codes" ON referral_codes;
DROP POLICY IF EXISTS "anon_insert_referral_codes" ON referral_codes;
DROP POLICY IF EXISTS "anon_update_referral_codes" ON referral_codes;
REVOKE ALL PRIVILEGES ON referral_codes FROM anon;
REVOKE ALL PRIVILEGES ON referral_codes FROM authenticated;

-- trade_settings: drop policies + revoke
DROP POLICY IF EXISTS "anon_select_trade_settings" ON trade_settings;
DROP POLICY IF EXISTS "anon_insert_trade_settings" ON trade_settings;
DROP POLICY IF EXISTS "anon_update_trade_settings" ON trade_settings;
REVOKE ALL PRIVILEGES ON trade_settings FROM anon;
REVOKE ALL PRIVILEGES ON trade_settings FROM authenticated;

-- referral_payouts: drop policies + revoke
DROP POLICY IF EXISTS "anon_select_referral_payouts" ON referral_payouts;
DROP POLICY IF EXISTS "anon_insert_referral_payouts" ON referral_payouts;
DROP POLICY IF EXISTS "anon_update_referral_payouts" ON referral_payouts;
DROP POLICY IF EXISTS "anon_delete_referral_payouts" ON referral_payouts;
REVOKE ALL PRIVILEGES ON referral_payouts FROM anon;
REVOKE ALL PRIVILEGES ON referral_payouts FROM authenticated;

-- payment_transactions: drop policies + revoke
DROP POLICY IF EXISTS "anon_select_payment_transactions" ON payment_transactions;
DROP POLICY IF EXISTS "anon_insert_payment_transactions" ON payment_transactions;
DROP POLICY IF EXISTS "anon_update_payment_transactions" ON payment_transactions;
DROP POLICY IF EXISTS "anon_delete_payment_transactions" ON payment_transactions;
REVOKE ALL PRIVILEGES ON payment_transactions FROM anon;
REVOKE ALL PRIVILEGES ON payment_transactions FROM authenticated;
