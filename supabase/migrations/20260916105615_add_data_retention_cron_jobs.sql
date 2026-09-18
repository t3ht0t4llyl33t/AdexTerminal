/*
# Add data retention cleanup for stale rows

## Purpose
Prevent unbounded database growth by pruning stale rows from tables
that accumulate over time but have no existing cleanup mechanism.

## New cron jobs

1. prune_chat_rate_limits — daily at 4:00 UTC
   Deletes chat_rate_limits rows where the user has been inactive for 30+ days
   (window_start older than 30 days AND muted_until is null or expired).
   This removes rate-limit entries for users who haven't used the support chat
   in over a month, keeping the table small.

2. prune_old_payment_transactions — daily at 4:30 UTC
   Deletes payment_transactions older than 365 days.
   Financial records are retained for 1 year (typical for audit/legal requirements),
   then pruned to prevent unbounded growth.

3. prune_old_referral_payouts — daily at 4:30 UTC
   Same logic: referral payout records older than 365 days are pruned.

## Notes
- referral_claims is NOT pruned — it's an anti-cheat audit log and should be
  retained permanently (one row per referred user, growth is bounded by user count).
- scanner_audit_logs already has a 7-day prune job from the first migration.
- scan_cache has a 7-day prune job (added in the scan_cache migration).
- contract_blacklist has a 30-day prune job (added in the scan_cache migration).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'prune_chat_rate_limits'
  ) THEN
    PERFORM cron.schedule(
      'prune_chat_rate_limits',
      '0 4 * * *',
      $q$DELETE FROM chat_rate_limits WHERE window_start < now() - interval '30 days' AND (muted_until IS NULL OR muted_until < now())$q$
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'prune_old_payment_transactions'
  ) THEN
    PERFORM cron.schedule(
      'prune_old_payment_transactions',
      '30 4 * * *',
      $q$DELETE FROM payment_transactions WHERE created_at < now() - interval '365 days'$q$
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'prune_old_referral_payouts'
  ) THEN
    PERFORM cron.schedule(
      'prune_old_referral_payouts',
      '30 4 * * *',
      $q$DELETE FROM referral_payouts WHERE created_at < now() - interval '365 days'$q$
    );
  END IF;
END $$;
