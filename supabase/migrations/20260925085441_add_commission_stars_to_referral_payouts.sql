/*
# Add commission_stars column to referral_payouts

## Purpose
Support Telegram Stars payouts by storing the exact number of stars
credited to a referrer. Also index (payment_method, status) on
payment_transactions for the bot to quickly find pending Stars invoices.

## Changes
### referral_payouts
- New column `commission_stars` (integer, nullable) — number of Telegram Stars
  (XTR) awarded to the referrer. Nullable because non-Stars payouts
  (`ton_connect`, `crypto_pay`) do not use it.

### payment_transactions
- New composite index `idx_pt_method_status` on `(payment_method, status)` to
  speed up bot-side lookups of pending Stars payments.

## Security
- No RLS or policy changes. Existing anon/authenticated policies still apply.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'referral_payouts' AND column_name = 'commission_stars'
  ) THEN
    ALTER TABLE referral_payouts ADD COLUMN commission_stars integer;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pt_method_status
  ON payment_transactions (payment_method, status);
