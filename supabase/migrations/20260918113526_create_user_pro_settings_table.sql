/*
# Create user_pro_settings table for PRO filter persistence and alerts

1. New Tables
- `user_pro_settings` — stores all PRO user filter preferences and alert configurations in a single row per user.
  - `id` (uuid, PK)
  - `telegram_user_id` (text, unique, not null) — identifies the Telegram user
  - `radar_min_liquidity` (int, default 0) — Radar "Min Liquidity" slider value ($0 to $1,000,000)
  - `radar_min_spike` (int, default 50) — Radar "Volume Surge %" slider value (+50% to +500%)
  - `whale_min_volume` (int, default 3000) — Whales "Min Volume" slider value ($3,000 to $1,000,000)
  - `whale_buys_only` (boolean, default false) — Whales "Buys Only" checkbox
  - `alerts` (jsonb, default '[]') — Array of max 2 alert objects: {id, type, threshold, networks, enabled, label, last_fired_token_id, last_fired_ts}
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `user_pro_settings`.
- Allow anon + authenticated CRUD (no-auth app pattern, same as trade_settings).
- 4 separate policies: SELECT, INSERT, UPDATE, DELETE.

3. Notes
- Storage impact: ~300 bytes per PRO user. For 50 users: ~15KB. Negligible.
- The `alerts` jsonb stores max 2 alerts enforced server-side via API validation.
- The `last_fired_token_id` and `last_fired_ts` fields in each alert object are used by the cron for deduplication.
*/

CREATE TABLE IF NOT EXISTS user_pro_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text UNIQUE NOT NULL,
  radar_min_liquidity integer NOT NULL DEFAULT 0,
  radar_min_spike integer NOT NULL DEFAULT 50,
  whale_min_volume integer NOT NULL DEFAULT 3000,
  whale_buys_only boolean NOT NULL DEFAULT false,
  alerts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_pro_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pro_settings" ON user_pro_settings;
CREATE POLICY "anon_select_pro_settings" ON user_pro_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pro_settings" ON user_pro_settings;
CREATE POLICY "anon_insert_pro_settings" ON user_pro_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pro_settings" ON user_pro_settings;
CREATE POLICY "anon_update_pro_settings" ON user_pro_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pro_settings" ON user_pro_settings;
CREATE POLICY "anon_delete_pro_settings" ON user_pro_settings FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_user_pro_settings_tg_id ON user_pro_settings (telegram_user_id);
