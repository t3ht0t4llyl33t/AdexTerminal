/*
# Phase B — retention hooks and product metrics

Adds four tables that power the personal watchlist, product-event analytics,
Lightning Boost referral rewards, and the daily digest de-duplication log.

1. New Tables
- `user_watchlist` — personal watchlist entries per Telegram user.
  Columns: id, telegram_user_id, network, token_address, token_symbol,
  token_name, added_at.
- `product_events` — internal analytics events (app_opened, tab_switched,
  scan_started, etc.). Columns: id, telegram_user_id, event_name,
  event_props (jsonb), created_at.
- `referral_bonus_grants` — Lightning Boost audit log. Columns: id,
  inviter_telegram_id, invitee_telegram_id, payment_amount_ton,
  invitee_signup_at, invitee_purchase_at, boost_days, status
  ('pending' | 'granted' | 'expired' | 'skipped'), granted_at,
  skip_reason.
- `user_digest_log` — de-duplication log for the daily Telegram digest.
  Columns: id, telegram_user_id, digest_date (date), sent_at.

2. Security
- Row Level Security enabled on all four tables.
- Deny-by-default: NO anon/authenticated policies are granted. All access
  goes through the server (service-role client) via our own API routes,
  which authenticate the caller against Telegram initData or the cron
  secret before reading/writing.

3. Indexes
- Watchlist: unique per (telegram_user_id, network, lower(token_address))
  and a plain index on telegram_user_id for list reads.
- Product events: indexes on telegram_user_id + created_at, and on
  event_name + created_at for aggregate queries.
- Referral bonus grants: index on invitee_telegram_id and inviter_telegram_id.
- Digest log: unique per (telegram_user_id, digest_date).
*/

CREATE TABLE IF NOT EXISTS user_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text NOT NULL,
  network text NOT NULL,
  token_address text NOT NULL,
  token_symbol text,
  token_name text,
  added_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_watchlist_unique_idx
  ON user_watchlist (telegram_user_id, network, lower(token_address));

CREATE INDEX IF NOT EXISTS user_watchlist_user_idx
  ON user_watchlist (telegram_user_id);

ALTER TABLE user_watchlist ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS product_events (
  id bigserial PRIMARY KEY,
  telegram_user_id text,
  event_name text NOT NULL,
  event_props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_events_user_time_idx
  ON product_events (telegram_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS product_events_name_time_idx
  ON product_events (event_name, created_at DESC);

ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS referral_bonus_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_telegram_id text NOT NULL,
  invitee_telegram_id text NOT NULL,
  payment_amount_ton numeric,
  invitee_signup_at timestamptz,
  invitee_purchase_at timestamptz,
  boost_days integer NOT NULL DEFAULT 15,
  status text NOT NULL DEFAULT 'pending',
  granted_at timestamptz,
  skip_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_bonus_grants_inviter_idx
  ON referral_bonus_grants (inviter_telegram_id);

CREATE INDEX IF NOT EXISTS referral_bonus_grants_invitee_idx
  ON referral_bonus_grants (invitee_telegram_id);

CREATE UNIQUE INDEX IF NOT EXISTS referral_bonus_grants_unique_pair_idx
  ON referral_bonus_grants (inviter_telegram_id, invitee_telegram_id);

ALTER TABLE referral_bonus_grants ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS user_digest_log (
  id bigserial PRIMARY KEY,
  telegram_user_id text NOT NULL,
  digest_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_digest_log_unique_idx
  ON user_digest_log (telegram_user_id, digest_date);

ALTER TABLE user_digest_log ENABLE ROW LEVEL SECURITY;
