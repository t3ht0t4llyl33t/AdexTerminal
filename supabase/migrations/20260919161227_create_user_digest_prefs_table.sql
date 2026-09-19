/*
# Phase B — user digest preferences

Stores whether a given Telegram user wants to receive the morning digest.
Kept in a dedicated tiny table (instead of altering user_pro_settings) so the
opt-in works for Free users too and does not couple to the PRO settings shape.

1. New Tables
- `user_digest_prefs`
  - `telegram_user_id` (text, primary key)
  - `enabled` (boolean, default true)
  - `updated_at` (timestamptz, default now)

2. Security
- RLS enabled, deny-by-default. All reads/writes go through our own API
  routes, which authenticate the caller by telegram_user_id from the
  Telegram Mini App just like every other endpoint in the app.
*/

CREATE TABLE IF NOT EXISTS user_digest_prefs (
  telegram_user_id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_digest_prefs ENABLE ROW LEVEL SECURITY;
