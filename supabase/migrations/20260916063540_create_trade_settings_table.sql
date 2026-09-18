/*
# Create trade_settings table

## Purpose
Stores per-user trade service preferences so that "Trade" buttons in Radar
and Whales deep-link to the user's chosen DEX or bot with the token contract
pre-filled.

## Tables
### trade_settings
- id (uuid, primary key)
- telegram_user_id (text, unique, not null) — Telegram user owning the settings
- ton_service (text, not null, default 'dedust') — 'dedust' | 'stonfi'
- evm_service (text, not null, default 'banana') — 'banana' | 'trojan' | 'maestro'
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())

## Security
- RLS enabled
- anon + authenticated CRUD (no-auth app pattern, matching existing tables)
*/

CREATE TABLE IF NOT EXISTS trade_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text UNIQUE NOT NULL,
  ton_service text NOT NULL DEFAULT 'dedust',
  evm_service text NOT NULL DEFAULT 'banana',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_settings_tg_id ON trade_settings (telegram_user_id);

ALTER TABLE trade_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_trade_settings" ON trade_settings;
CREATE POLICY "anon_select_trade_settings" ON trade_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_trade_settings" ON trade_settings;
CREATE POLICY "anon_insert_trade_settings" ON trade_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_trade_settings" ON trade_settings;
CREATE POLICY "anon_update_trade_settings" ON trade_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
